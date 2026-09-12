const REQUIRED_FIELDS = [
  "title",
  "department",
  "objective",
  "rawProblemStatement",
  "beneficiaries",
  "location",
  "timeline",
  "budget",
  "requirementStatement",
  "expectedOutcome",
  "constraints",
];

const MAX_LENGTHS = {
  title: 180,
  department: 180,
  objective: 1500,
  rawProblemStatement: 4000,
  beneficiaries: 800,
  location: 300,
  timeline: 300,
  budget: 160,
  requirementStatement: 1500,
  expectedOutcome: 1500,
  constraints: 1500,
  risk: 24,
  theme: 80,
};

function clean(value, max = 4000) {
  if (value == null) return "";
  if (typeof value !== "string") throw new Error("Challenge fields must be text.");
  const text = value.trim().replace(/\u0000/g, "");
  if (text.length > max) throw new Error(`Field exceeds its ${max}-character limit.`);
  return text;
}

/** Normalises browser input into the one persisted challenge-draft shape. */
export function normaliseChallengeDraft(payload = {}) {
  const source = {
    title: payload.title,
    department: payload.department ?? payload.dept,
    objective: payload.objective,
    rawProblemStatement: payload.rawProblemStatement ?? payload.painPoint,
    beneficiaries: payload.beneficiaries,
    location: payload.location,
    timeline: payload.timeline,
    budget: payload.budget,
    requirementStatement: payload.requirementStatement,
    expectedOutcome: payload.expectedOutcome ?? payload.outcome,
    constraints: payload.constraints,
    risk: payload.risk,
    theme: payload.theme,
  };

  const result = {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = clean(value, MAX_LENGTHS[key] || 4000);
  }
  result.risk = ["Low", "Medium", "High"].includes(result.risk) ? result.risk : "Medium";
  result.theme = result.theme || "Miscellaneous";
  return result;
}

export function draftCompleteness(fields) {
  const completed = REQUIRED_FIELDS.filter((key) => String(fields[key] || "").trim()).length;
  return { completed, total: REQUIRED_FIELDS.length, percent: Math.round((completed / REQUIRED_FIELDS.length) * 100) };
}

export function validateDraftForReview(fields) {
  const missing = REQUIRED_FIELDS.filter((key) => !String(fields[key] || "").trim());
  if (missing.length) return { error: `Complete the required fields before review: ${missing.join(", ")}.`, missing };

  const hasMeasure = /\d/.test(fields.expectedOutcome) && /(day|week|month|year|quarter|within|by )/i.test(fields.expectedOutcome);
  if (!hasMeasure) {
    return { error: "Expected outcome must include a measurable number and timeframe.", missing: ["expectedOutcome"] };
  }
  return null;
}

export function isPrivateChallenge(challenge) {
  return challenge?.status === "Draft" || challenge?.status === "Under Review";
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
