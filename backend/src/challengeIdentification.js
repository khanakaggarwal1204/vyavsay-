import { PROBLEM_STATEMENT_KEYS, formatBudget } from "./problemStatementSchema.js";

const REQUIRED_FIELDS = PROBLEM_STATEMENT_KEYS;
const NUMERIC_FIELDS = new Set([
  "budgetMin", "budgetMax", "pilotDurationMonths", "primaryKpiBaseline", "primaryKpiTarget",
]);
const DATE_FIELDS = new Set(["submissionDeadline", "expectedPilotStartDate", "targetDate"]);
const MAX_LENGTHS = {
  title: 180,
  department: 180,
  sector: 80,
  objective: 1500,
  rawProblemStatement: 4000,
  beneficiaries: 800,
  location: 300,
  requirementStatement: 1500,
  expectedOutcome: 1500,
  constraints: 1500,
  currency: 8,
  primaryKpiName: 180,
  primaryKpiUnit: 80,
  measurementMethod: 1500,
  evidenceSource: 1500,
  risk: 24,
  theme: 80,
};

function clean(value, max = 4000) {
  if (value == null) return "";
  if (typeof value !== "string") throw new Error("Challenge text fields must be text.");
  const text = value.trim().replace(/\u0000/g, "");
  if (text.length > max) throw new Error(`Field exceeds its ${max}-character limit.`);
  return text;
}

function cleanInteger(value, key) {
  if (value === "" || value == null) return null;
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0 || number > 1e10)
    throw new Error(`${key} must be a non-negative whole number.`);
  return number;
}

function cleanDate(value, key) {
  const text = clean(value, 10);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)))
    throw new Error(`${key} must be a valid date.`);
  return text;
}

/** Normalises both the Challenge wizard and Template 1 into one persisted shape. */
export function normaliseChallengeDraft(payload = {}) {
  const source = {
    title: payload.title,
    department: payload.department ?? payload.dept,
    sector: payload.sector ?? payload.theme,
    objective: payload.objective,
    rawProblemStatement: payload.rawProblemStatement ?? payload.painPoint,
    beneficiaries: payload.beneficiaries,
    location: payload.location,
    requirementStatement: payload.requirementStatement,
    expectedOutcome: payload.expectedOutcome ?? payload.outcome,
    constraints: payload.constraints,
    budgetMin: payload.budgetMin,
    budgetMax: payload.budgetMax,
    currency: payload.currency,
    pilotDurationMonths: payload.pilotDurationMonths,
    submissionDeadline: payload.submissionDeadline,
    expectedPilotStartDate: payload.expectedPilotStartDate,
    primaryKpiName: payload.primaryKpiName,
    primaryKpiBaseline: payload.primaryKpiBaseline,
    primaryKpiTarget: payload.primaryKpiTarget,
    primaryKpiUnit: payload.primaryKpiUnit,
    measurementMethod: payload.measurementMethod,
    evidenceSource: payload.evidenceSource,
    targetDate: payload.targetDate,
    risk: payload.risk,
    theme: payload.theme ?? payload.sector,
  };

  const result = {};
  for (const [key, value] of Object.entries(source)) {
    if (NUMERIC_FIELDS.has(key)) result[key] = cleanInteger(value, key);
    else if (DATE_FIELDS.has(key)) result[key] = cleanDate(value, key);
    else result[key] = clean(value, MAX_LENGTHS[key] || 4000);
  }
  result.currency = result.currency || "INR";
  if (result.currency !== "INR") throw new Error("Only INR is supported in this prototype.");
  result.risk = ["Low", "Medium", "High"].includes(result.risk) ? result.risk : "Medium";
  result.sector = result.sector || result.theme || "Miscellaneous";
  result.theme = result.sector;
  result.budget = formatBudget(result);
  result.timeline = result.pilotDurationMonths ? `${result.pilotDurationMonths}-month pilot` : "";
  return result;
}

export function draftCompleteness(fields) {
  const completed = REQUIRED_FIELDS.filter((key) => fields[key] !== "" && fields[key] !== null && fields[key] !== undefined).length;
  const problems = validationProblems(fields, false);
  return {
    completed,
    total: REQUIRED_FIELDS.length,
    percent: Math.round((completed / REQUIRED_FIELDS.length) * 100),
    valid: completed === REQUIRED_FIELDS.length && problems.length === 0,
    problems,
  };
}

function validationProblems(fields, includeMissing = true) {
  const problems = [];
  if (includeMissing) {
    const missing = REQUIRED_FIELDS.filter((key) => fields[key] === "" || fields[key] === null || fields[key] === undefined);
    if (missing.length) problems.push(`Complete the required fields: ${missing.join(", ")}.`);
  }
  const hasOutcome = typeof fields.expectedOutcome === "string" && fields.expectedOutcome.trim();
  if (hasOutcome && (!/\d/.test(fields.expectedOutcome) || !/(day|week|month|year|quarter|within|by\s)/i.test(fields.expectedOutcome)))
    problems.push("Expected outcome must include a measurable number and timeframe.");
  if (Number.isSafeInteger(fields.budgetMin) && Number.isSafeInteger(fields.budgetMax) && fields.budgetMin > fields.budgetMax)
    problems.push("Minimum budget cannot exceed maximum budget.");
  if (Number.isFinite(fields.primaryKpiBaseline) && Number.isFinite(fields.primaryKpiTarget) && fields.primaryKpiBaseline === fields.primaryKpiTarget)
    problems.push("KPI target must differ from its baseline.");
  if (fields.submissionDeadline && fields.expectedPilotStartDate && fields.submissionDeadline >= fields.expectedPilotStartDate)
    problems.push("Expected pilot start must be after the startup submission deadline.");
  return problems;
}

export function validateDraftForReview(fields) {
  const problems = validationProblems(fields, true);
  return problems.length ? { error: problems[0], problems } : null;
}

export function isPrivateChallenge(challenge) {
  return ["Draft", "Under Review", "Ready for Confirmation", "Changes Requested", "Approved"].includes(challenge?.status);
}

export function challengeVisibleTo(challenge, user) {
  if (!isPrivateChallenge(challenge)) return true;
  return !!user && (user.role === "Platform Admin" || challenge.createdBy === user.id);
}

export function recordChallengeHistory(challenge, { actor, event, details = {} }) {
  challenge.history = challenge.history || [];
  challenge.history.push({
    id: `challenge_event_${challenge.history.length + 1}`,
    actorId: actor.id,
    actorRole: actor.role,
    event,
    details,
    at: new Date().toISOString(),
  });
  challenge.updatedAt = new Date().toISOString();
}
