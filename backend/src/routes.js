import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDB, writeDB, resetDB } from "./db.js";
import { matchStartupsForChallenge } from "./matching.js";
import { runEligibilityCheck } from "./eligibility.js";
import { structureRequirement } from "./structuring.js";
import { weightsForChallenge, rubricMessage, validateScores, computeTotal, rankEvaluations } from "./evaluation.js";
import { computePilotPerformance, validateKpiTarget } from "./performance.js";
import { generateContract, contractProgress, MILESTONE_STATUSES } from "./contracting.js";
import { validatePilotDesign, createPilotDesign, advancePhase } from "./pilotDesign.js";

const router = Router();
let paymentProjection = c => c;
let validationGate = () => ({eligible:false,reasons:['Validation service unavailable.']});
let templateGate = () => ({eligible:false,reasons:['Cybersecurity review service unavailable.']});
export function setTemplateGate(fn) { templateGate = fn; }
export function setValidationGate(fn) { validationGate = fn; }
export function setPaymentProjection(fn) { paymentProjection = fn; }

function findChallenge(db, id) {
  return db.challenges.find((c) => c.id === id);
}

function findStartup(db, id) {
  return db.startups.find((s) => s.id === id);
}

/** Attach the computed eligibility verdict to a raw application record. */
function decorateApplication(app, db) {
  const startup = findStartup(db, app.startupId);
  const challenge = findChallenge(db, app.challengeId);
  const verdict = startup ? runEligibilityCheck(startup, challenge) : null;
  return { ...app, startup, ...verdict };
}

/** Attach the startup name to a raw evaluation record. */
function decorateEvaluation(ev, db) {
  const startup = findStartup(db, ev.startupId);
  return { ...ev, startupName: startup ? startup.name : "Unknown startup" };
}

function slugChallengeId(title, existingIds) {
  const base = "CH-" + (title || "challenge")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  let id = base;
  let n = 2;
  while (existingIds.has(id)) id = `${base}-${n++}`;
  return id;
}

/** Attach startup/challenge names and computed KPI achievement to a pilot record. */
function decoratePilot(pilot, db) {
  const startup = findStartup(db, pilot.startupId);
  const challenge = findChallenge(db, pilot.challengeId);
  return computePilotPerformance({
    ...pilot,
    startupName: startup ? startup.name : "Unknown startup",
    challengeTitle: challenge ? challenge.title : "Unknown challenge",
  });
}

function findPilot(db, id) {
  return (db.pilots || []).find((p) => p.id === id);
}

/** Attach the startup name and rolled-up payment progress to a raw contract record. */
function decorateContract(contract, db) {
  contract = paymentProjection(contract);
  const startup = findStartup(db, contract.startupId);
  return { ...contract, startupName: startup ? startup.name : "Unknown startup", progress: contractProgress(contract.milestones) };
}

/** Attach the startup name to a raw pilot design record. */
function decoratePilotDesign(pd, db) {
  const startup = pd.startupId ? findStartup(db, pd.startupId) : null;
  return { ...pd, startupName: startup ? startup.name : null };
}

router.get("/health", (_req, res) => res.json({ ok: true }));

/* ------------------------------- Startups ------------------------------ */
router.get("/startups", (_req, res) => {
  const db = readDB();
  res.json(db.startups);
});

/* ------------------------------ Challenges ------------------------------ */
router.get("/challenges", (_req, res) => {
  const db = readDB();
  res.json(db.challenges);
});

router.get("/challenges/:id", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  res.json(challenge);
});

/* ------------------- Feature 0: Challenge Identification ---------------- */
// Turns a department's free-form problem description into a standard,
// structured requirement statement instead of a free-form request. Stateless
// — call as many times as the department edits their draft.
router.post("/requirements/structure", (req, res) => {
  const { title, objective, beneficiaries, painPoint, outcome, constraints } = req.body || {};
  const result = structureRequirement({ title, objective, beneficiaries, painPoint, outcome, constraints });
  res.json(result);
});

// Publishes a new challenge (department fills the structured form -> this
// persists it, using the theme/requirement generated above). Every challenge
// created this way immediately works with AI Startup Discovery and
// Auto-Eligibility Screening, since those key off the same `theme`/`risk`
// fields as the seeded demo challenges.
router.post("/challenges", (req, res) => {
  const db = readDB();
  const { title, dept, budget, risk, theme, requirementStatement, capabilities, deadline, location } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });

  const existingIds = new Set(db.challenges.map((c) => c.id));
  const challenge = {
    id: slugChallengeId(title, existingIds),
    title: title.trim(),
    dept: dept?.trim() || "Unassigned Department",
    status: "Applications Open",
    apps: 0,
    budget: budget?.trim() || "TBD",
    deadline: deadline?.trim() || "Draft",
    theme: theme || "Miscellaneous",
    risk: risk || "Medium",
    requirementStatement: requirementStatement || null,
    capabilities: capabilities || [],
    location: location?.trim() || null,
  };

  db.challenges.push(challenge);
  writeDB(db);
  res.status(201).json(challenge);
});

/* --------------------- Feature 1: AI Startup Discovery ------------------ */
// Auto-shortlists startups from the database against a challenge's
// sector/theme and requirements, instead of a department searching manually.
router.get("/challenges/:id/discovery", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const matches = matchStartupsForChallenge(db.startups, challenge);
  const shortlisted = matches.filter((m) => m.shortlisted);

  res.json({
    challengeId: challenge.id,
    theme: challenge.theme,
    shortlistedCount: shortlisted.length,
    message: `${shortlisted.length} startups shortlisted — sorted by sector match, past government experience, and technology fit.`,
    matches,
  });
});

/* --------------------- Feature 2: Auto-Eligibility Screening ------------ */
// Lists applications for a challenge, each with a live rule-based verdict.
router.get("/challenges/:id/applications", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const apps = db.applications
    .filter((a) => a.challengeId === challenge.id)
    .map((a) => decorateApplication(a, db))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  res.json(apps);
});

// Submits a new application (a startup applying, or a department inviting a
// shortlisted startup) and immediately runs the eligibility check against it.
router.post("/challenges/:id/applications", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { startupId } = req.body || {};
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });

  const already = db.applications.find((a) => a.challengeId === challenge.id && a.startupId === startupId);
  if (already) {
    return res.status(409).json({ error: "This startup has already applied to this challenge", application: decorateApplication(already, db) });
  }

  const application = { id: `ap_${randomUUID()}`, challengeId: challenge.id, startupId, submittedAt: new Date().toISOString() };
  db.applications.push(application);
  writeDB(db);

  res.status(201).json(decorateApplication(application, db));
});

/* ----------------------- Feature 4: Expert Evaluation -------------------- */
// A fixed scoring rubric (innovation, feasibility, cost, security,
// scalability) that every evaluator fills in and the system auto-totals and
// ranks — with weightings that shift automatically based on the challenge's
// risk profile, instead of relying on any one evaluator's personal judgement.
router.get("/challenges/:id/rubric", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { risk, adjusted, weights } = weightsForChallenge(challenge);
  res.json({
    challengeId: challenge.id,
    riskProfile: risk,
    adjusted,
    weights,
    message: rubricMessage({ risk, adjusted, weights }),
  });
});

router.get("/challenges/:id/evaluations", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const rubric = weightsForChallenge(challenge);
  const evaluations = (db.evaluations || [])
    .filter((e) => e.challengeId === challenge.id)
    .map((e) => decorateEvaluation(e, db))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  res.json({
    challengeId: challenge.id,
    riskProfile: rubric.risk,
    adjusted: rubric.adjusted,
    weights: rubric.weights,
    message: rubricMessage(rubric),
    evaluations,
    ranking: rankEvaluations(evaluations),
  });
});

// An evaluator submits scores (0–10) for every rubric category against a
// startup. The weighted total and startup ranking are always derived from
// this same rubric, so every evaluator's scores are directly comparable.
router.post("/challenges/:id/evaluations", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { startupId, evaluatorName, scores } = req.body || {};
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  if (!evaluatorName || !evaluatorName.trim()) return res.status(400).json({ error: "evaluatorName is required" });

  const scoreError = validateScores(scores);
  if (scoreError) return res.status(400).json({ error: scoreError });

  const rubric = weightsForChallenge(challenge);
  const total = computeTotal(scores, rubric.weights);

  const evaluation = {
    id: `ev_${randomUUID()}`,
    challengeId: challenge.id,
    startupId,
    evaluatorName: evaluatorName.trim(),
    scores,
    weights: rubric.weights,
    total,
    submittedAt: new Date().toISOString(),
  };

  db.evaluations = db.evaluations || [];
  db.evaluations.push(evaluation);
  writeDB(db);

  const allEvaluations = db.evaluations.filter((e) => e.challengeId === challenge.id).map((e) => decorateEvaluation(e, db));

  res.status(201).json({
    evaluation: decorateEvaluation(evaluation, db),
    ranking: rankEvaluations(allEvaluations),
  });
});

/* ---------------------- Feature 5: Performance Measurement --------------- */
// KPI targets (baseline + target) are locked in once, when the pilot is
// created, and never edited afterwards. As field results come in, how much
// of the locked target was achieved is computed automatically — pure math,
// no manual judgement from a department official or validator.
router.get("/pilots", (_req, res) => {
  const db = readDB();
  res.json((db.pilots || []).map((p) => decoratePilot(p, db)));
});

router.get("/pilots/:id", (req, res) => {
  const db = readDB();
  const pilot = findPilot(db, req.params.id);
  if (!pilot) return res.status(404).json({ error: "Pilot not found" });
  res.json(decoratePilot(pilot, db));
});

router.get("/challenges/:id/pilot", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  const pilot = (db.pilots || []).find((p) => p.challengeId === challenge.id);
  if (!pilot) return res.status(404).json({ error: "No pilot has been started for this challenge yet" });
  res.json(decoratePilot(pilot, db));
});

// Creates a pilot with its KPI targets locked in for good — baseline and
// target are only ever set here, at pilot start.
router.post("/pilots", (req, res) => {
  const db = readDB();
  const { challengeId, startupId, name, kpis } = req.body || {};

  const challenge = findChallenge(db, challengeId);
  if (!challenge) return res.status(400).json({ error: "Unknown challengeId" });
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  if (!Array.isArray(kpis) || kpis.length === 0) return res.status(400).json({ error: "At least one KPI target is required" });

  for (const kpi of kpis) {
    const err = validateKpiTarget(kpi);
    if (err) return res.status(400).json({ error: err });
  }

  const pilot = {
    id: `pl_${randomUUID()}`,
    challengeId,
    startupId,
    name: name || `${challenge.title} — ${startup.name}`,
    startedAt: new Date().toISOString(),
    // actual is null until the first field result comes in.
    kpis: kpis.map((k) => ({ key: k.key, label: k.label, unit: k.unit || "", baseline: k.baseline, target: k.target, actual: null })),
  };

  db.pilots = db.pilots || [];
  db.pilots.push(pilot);
  writeDB(db);

  res.status(201).json(decoratePilot(pilot, db));
});

// Records a new field reading for one KPI. This is the ONLY thing that can
// ever change after a pilot starts — the locked baseline/target are
// untouched, so the achievement % is always computed fresh, automatically.
router.patch("/pilots/:id/kpis/:key", (req, res) => {
  const db = readDB();
  const pilot = findPilot(db, req.params.id);
  if (!pilot) return res.status(404).json({ error: "Pilot not found" });

  const kpi = (pilot.kpis || []).find((k) => k.key === req.params.key);
  if (!kpi) return res.status(404).json({ error: "KPI not found on this pilot" });

  const { actual } = req.body || {};
  if (typeof actual !== "number" || Number.isNaN(actual)) return res.status(400).json({ error: "actual must be a number" });

  kpi.actual = actual;
  writeDB(db);

  res.json(decoratePilot(pilot, db));
});

/* --------------------- Milestone-Based Contracting ----------------------- */
// Once a startup is selected, draft a contract from everything already
// collected on the challenge (budget) plus a duration, split into a
// standard milestone payment schedule instead of drafting one by hand.
router.get("/challenges/:id/contracts", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const contracts = (db.contracts || [])
    .filter((c) => c.challengeId === challenge.id)
    .map((c) => decorateContract(c, db))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ challengeId: challenge.id, contracts });
});

router.post("/challenges/:id/contracts", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { startupId, durationMonths, budgetOverride } = req.body || {};
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  if (durationMonths !== undefined && (typeof durationMonths !== "number" || durationMonths <= 0)) {
    return res.status(400).json({ error: "durationMonths must be a positive number" });
  }

  const draft = generateContract({ challenge, durationMonths, budgetOverride });
  const contract = {
    id: `ct_${randomUUID()}`,
    challengeId: challenge.id,
    startupId,
    ...draft,
    createdAt: new Date().toISOString(),
  };

  db.contracts = db.contracts || [];
  db.contracts.push(contract);
  writeDB(db);

  res.status(201).json(decorateContract(contract, db));
});

// Advance a milestone through Draft -> Submitted -> Payment Approved ->
// Paid, tying payment directly to real progress.
router.patch("/contracts/:contractId/milestones/:milestoneId", (_req, res) => {
  res.status(409).json({ error: "Milestone payments are managed in the Payments workspace. Direct status changes are disabled." });
});

/* --------------------- Sandbox / Pilot Design ---------------------------- */
// Before any large rollout, lock the pilot's scope and duration upfront and
// gate progression so nothing reaches live citizen data until the sandbox
// phase has passed.
router.get("/challenges/:id/pilot-design", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const pd = (db.pilotDesigns || []).find((p) => p.challengeId === challenge.id) || null;
  res.json({ challengeId: challenge.id, pilotDesign: pd ? decoratePilotDesign(pd, db) : null });
});

router.post("/challenges/:id/pilot-design", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  db.pilotDesigns = db.pilotDesigns || [];
  if (db.pilotDesigns.some((p) => p.challengeId === challenge.id)) {
    return res.status(409).json({ error: "A pilot design is already locked for this challenge" });
  }

  const { startupId, scopeLabel, durationMonths } = req.body || {};
  const error = validatePilotDesign({ scopeLabel, durationMonths });
  if (error) return res.status(400).json({ error });
  if (startupId && !findStartup(db, startupId)) return res.status(400).json({ error: "Unknown startupId" });

  const pd = createPilotDesign({ challengeId: challenge.id, startupId, scopeLabel, durationMonths });
  db.pilotDesigns.push(pd);
  writeDB(db);

  res.status(201).json(decoratePilotDesign(pd, db));
});

// Mark the current active phase as passed and unlock the next one — the
// only way a pilot can progress toward a live rollout.
router.post("/pilot-design/:id/advance", (req, res) => {
  const db = readDB();
  const pd = (db.pilotDesigns || []).find((p) => p.id === req.params.id);
  if (!pd) return res.status(404).json({ error: "Pilot design not found" });

  const active = pd.phases.findIndex(p => p.status === 'Active');
  if (pd.phases[active + 1]?.key === 'field') {
    const security = templateGate(pd.challengeId, pd.startupId);
    if (!security.eligible) return res.status(409).json({error:security.reasons.join(' ')});
  }
  if (pd.phases[active + 1]?.key === 'live') {
    return res.status(409).json({error:'Use the authorised Scale-Up workspace handover. Independent validation alone cannot activate live rollout.'});
  }
  const result = advancePhase(pd);
  if (result.error) return res.status(400).json({ error: result.error });

  writeDB(db);
  res.json(decoratePilotDesign(result.pilotDesign, db));
});

/* --------------------------------- Admin -------------------------------- */
// Resets the demo data store back to its seed state.
router.post("/admin/reset", (_req, res) => {
  const db = resetDB();
  res.json({
    ok: true,
    startups: db.startups.length,
    challenges: db.challenges.length,
    applications: db.applications.length,
    evaluations: (db.evaluations || []).length,
    pilots: (db.pilots || []).length,
    contracts: (db.contracts || []).length,
    pilotDesigns: (db.pilotDesigns || []).length,
  });
});

export default router;
