import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDB, writeDB, resetDB } from "./db.js";
import { matchStartupsForChallenge } from "./matching.js";
import { queueChallengeDiscoveryIndex, queueEmbeddingRefresh } from "./semanticDiscovery.js";
import { runEligibilityCheck } from "./eligibility.js";
import { structureRequirement } from "./structuring.js";
import { structureWithLlm } from "./aiStructuring.js";
import {
  challengeVisibleTo,
  draftCompleteness,
  isPrivateChallenge,
  normaliseChallengeDraft,
  recordChallengeHistory,
  validateDraftForReview,
} from "./challengeIdentification.js";
import { weightsForChallenge, rubricMessage, validateScores, computeTotal, rankEvaluations } from "./evaluation.js";
import { computePilotPerformance, validateKpiTarget } from "./performance.js";
import { generateContract, contractProgress, MILESTONE_STATUSES } from "./contracting.js";
import { validatePilotDesign, createPilotDesign, advancePhase } from "./pilotDesign.js";
import {
  ROLES, hashPassword, verifyPassword, validatePassword, verifyRegistration, isValidEmail,
  createSession, findSession, destroySession, checkLockout, recordFailedAttempt, clearFailedAttempts, publicUser,
} from "./auth.js";

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

function readSessionToken(req) {
  return (req.headers.cookie || "").split(";").map((x) => x.trim()).find((x) => x.startsWith("vyavsay_session="))?.split("=")[1] || null;
}

/** Populates req.user when a valid session cookie is present. Never blocks the request. */
function attachUser(req, _res, next) {
  const token = readSessionToken(req);
  const db = readDB();
  const session = token && findSession(db, token);
  req.user = session ? db.users?.find((u) => u.id === session.userId) : null;
  next();
}
router.use(attachUser);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You don't have permission to do that." });
    next();
  };
}

function findStartup(db, id) {
  return db.startups.find((s) => s.id === id);
}

function publicStartupProfile(startup) {
  const { embedding, embeddingFingerprint, embeddingModel, embeddingDimensions, ownerUserId, ...safe } = startup;
  return {
    ...safe,
    semanticIndexedAt: startup.embeddingUpdatedAt || null,
  };
}

function cleanStartupText(value, label, { required = false, max = 1500 } = {}) {
  if (value == null) {
    if (required) throw new Error(`${label} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const cleaned = value.trim().replace(/\u0000/g, "");
  if (required && !cleaned) throw new Error(`${label} is required.`);
  if (cleaned.length > max) throw new Error(`${label} exceeds its ${max}-character limit.`);
  return cleaned;
}

function normaliseStartupProfile(payload = {}, existing = {}) {
  const tags = payload.tags ?? existing.tags ?? [];
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > 12 || tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 60)) {
    throw new Error("Choose between 1 and 12 technology or sector tags.");
  }
  const trl = cleanStartupText(payload.trl ?? existing.trl, "Technology readiness level", { required: true, max: 30 });
  if (!/^TRL [1-9]$/.test(trl)) throw new Error("Technology readiness level must be in the form TRL 1 through TRL 9.");
  const pilots = payload.pilots ?? existing.pilots ?? 0;
  if (!Number.isInteger(Number(pilots)) || Number(pilots) < 0 || Number(pilots) > 999) throw new Error("Past government pilots must be a whole number from 0 to 999.");
  const yearsActive = payload.yearsActive ?? existing.yearsActive ?? 0;
  if (!Number.isInteger(Number(yearsActive)) || Number(yearsActive) < 0 || Number(yearsActive) > 100) throw new Error("Years in operation must be a whole number from 0 to 100.");
  const certifications = payload.certifications ?? existing.certifications ?? [];
  if (!Array.isArray(certifications) || certifications.length > 12 || certifications.some((certification) => typeof certification !== "string" || !certification.trim() || certification.trim().length > 160)) throw new Error("Provide up to 12 certification names.");

  return {
    name: cleanStartupText(payload.name ?? existing.name, "Startup name", { required: true, max: 180 }),
    description: cleanStartupText(payload.description ?? existing.description, "Startup description", { required: true, max: 4000 }),
    sector: cleanStartupText(payload.sector ?? existing.sector, "Sector", { required: true, max: 180 }),
    tags: tags.map((tag) => tag.trim()),
    trl,
    loc: cleanStartupText(payload.location ?? payload.loc ?? existing.loc, "Location", { required: true, max: 180 }),
    website: cleanStartupText(payload.website ?? existing.website, "Website", { max: 500 }) || null,
    pilots: Number(pilots),
    yearsActive: Number(yearsActive),
    certifications: certifications.map((certification) => certification.trim()),
  };
}

function canEditStartupProfile(user, startup) {
  return user?.role === "Platform Admin" || (user?.role === "Startup" && startup.ownerUserId === user.id);
}

/** Attach the computed eligibility verdict to a raw application record. */
function decorateApplication(app, db) {
  const startup = findStartup(db, app.startupId);
  const challenge = findChallenge(db, app.challengeId);
  const verdict = app.eligibility || (startup ? runEligibilityCheck(startup, challenge, app.submittedAt) : null);
  return { ...app, startup: startup ? publicStartupProfile(startup) : null, ...verdict };
}

function screenApplication(application, startup, challenge) {
  const verdict = runEligibilityCheck(startup, challenge);
  application.eligibility = verdict;
  application.status = verdict.status === "Eligible" ? "Eligibility Passed" : "Eligibility Failed";
  application.screeningHistory = [...(application.screeningHistory || []), verdict];
  return verdict;
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
  res.json(db.startups.map(publicStartupProfile));
});

router.get("/startups/me", requireRole("Startup"), (req, res) => {
  const db = readDB();
  const startup = db.startups.find((record) => record.ownerUserId === req.user.id) || null;
  res.json({ startup: startup ? publicStartupProfile(startup) : null });
});

router.post("/startups", requireRole("Startup"), (req, res) => {
  const db = readDB();
  if (db.startups.some((startup) => startup.ownerUserId === req.user.id)) {
    return res.status(409).json({ error: "This account already has a startup discovery profile." });
  }
  let profile;
  try {
    profile = normaliseStartupProfile({ ...req.body, name: req.body?.name || req.user.profile?.companyName });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const startup = {
    id: `st_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    ...profile,
    registered: true,
    dpiit: Boolean(req.user.profile?.dpiitNumber),
    recog: req.user.profile?.dpiitNumber ? "DPIIT Recognised" : "Pending Verification",
    yearsActive: profile.yearsActive,
    certifications: profile.certifications,
    rating: null,
    badge: "Under Review",
    cin: req.user.profile?.cin || null,
    source: "Vyavsay startup profile",
    ownerUserId: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.startups.push(startup);
  writeDB(db);
  queueEmbeddingRefresh("startup", startup.id);
  res.status(201).json({ startup: publicStartupProfile(startup), semanticIndex: "refreshing" });
});

router.patch("/startups/:id", requireRole("Startup", "Platform Admin"), (req, res) => {
  const db = readDB();
  const startup = findStartup(db, req.params.id);
  if (!startup) return res.status(404).json({ error: "Startup profile not found." });
  if (!canEditStartupProfile(req.user, startup)) return res.status(403).json({ error: "You can only edit your own startup profile." });
  let profile;
  try {
    profile = normaliseStartupProfile(req.body, startup);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  Object.assign(startup, profile, { updatedAt: new Date().toISOString() });
  writeDB(db);
  queueEmbeddingRefresh("startup", startup.id);
  res.json({ startup: publicStartupProfile(startup), semanticIndex: "refreshing" });
});

/* ------------------------------ Challenges ------------------------------ */
router.get("/challenges", (_req, res) => {
  const db = readDB();
  const user = _req.user;
  res.json(db.challenges.filter((challenge) => challengeVisibleTo(challenge, user)));
});

router.get("/challenges/:id", (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge || !challengeVisibleTo(challenge, req.user)) return res.status(404).json({ error: "Challenge not found" });
  res.json(challenge);
});

/* ------------------- Feature 0: Challenge Identification ---------------- */
// Turns a department's free-form problem description into a standard,
// structured requirement statement instead of a free-form request. Stateless
// — call as many times as the department edits their draft.
router.post("/requirements/structure", requireRole("Government Official", "Platform Admin"), async (req, res, next) => {
  let fields;
  try {
    fields = normaliseChallengeDraft(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!fields.rawProblemStatement && !fields.objective && !fields.title) {
    return res.status(400).json({ error: "Add a plain-language problem, objective, or title before structuring." });
  }
  try {
    const fallback = structureRequirement(fields);
    const generated = await structureWithLlm(fields);
    const result = generated?.suggestion ? { ...fallback, ...generated.suggestion } : fallback;
    const engine = generated ? `llm:${generated.provider}` : "deterministic-policy-structuring-v1";

    const db = readDB();
    db.aiStructuringLogs = db.aiStructuringLogs || [];
    db.aiStructuringLogs.push({
      id: `structure_${randomUUID()}`,
      userId: req.user.id,
      engine,
      model: generated?.model || null,
      input: fields,
      output: result,
      createdAt: new Date().toISOString(),
    });
    writeDB(db);
    res.json({ ...result, reviewRequired: true, engine, llmUsed: Boolean(generated) });
  } catch (error) {
    next(error);
  }
});

function draftPayload(challenge) {
  return {
    title: challenge.title,
    department: challenge.dept,
    objective: challenge.objective || "",
    rawProblemStatement: challenge.rawProblemStatement || "",
    beneficiaries: challenge.beneficiaries || "",
    location: challenge.location || "",
    timeline: challenge.timeline || challenge.deadline || "",
    budget: challenge.budget || "",
    requirementStatement: challenge.requirementStatement || "",
    expectedOutcome: challenge.expectedOutcome || challenge.outcome || "",
    constraints: challenge.constraints || "",
    risk: challenge.risk || "Medium",
    theme: challenge.theme || "Miscellaneous",
  };
}

function requireDraftEditor(req, res, challenge) {
  if (!challenge) {
    res.status(404).json({ error: "Challenge draft not found." });
    return false;
  }
  if (req.user.role !== "Platform Admin" && challenge.createdBy !== req.user.id) {
    res.status(403).json({ error: "Only the draft author or a Platform Admin can access this draft." });
    return false;
  }
  return true;
}

// A draft is a private challenge record from the first save onward. This
// gives autosave a durable target and leaves a time-stamped history behind.
router.post("/challenge-drafts", requireRole("Government Official", "Platform Admin"), (req, res) => {
  let fields;
  try {
    fields = normaliseChallengeDraft(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const db = readDB();
  const id = `CH-DRAFT-${randomUUID().slice(0, 8).toUpperCase()}`;
  const challenge = {
    id,
    title: fields.title || "Untitled challenge",
    dept: fields.department || req.user.profile?.department || "Unassigned Department",
    status: "Draft",
    apps: 0,
    deadline: fields.timeline || "Draft",
    ...fields,
    capabilities: [],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  };
  recordChallengeHistory(challenge, { actor: req.user, event: "draft_created" });
  db.challenges.push(challenge);
  writeDB(db);
  res.status(201).json({ challenge, completeness: draftCompleteness(draftPayload(challenge)) });
});

router.patch("/challenge-drafts/:id", requireRole("Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!requireDraftEditor(req, res, challenge)) return;
  if (challenge.status !== "Draft") return res.status(409).json({ error: "Only a Draft can be edited. Create a new draft to change a submitted challenge." });
  let fields;
  try {
    fields = normaliseChallengeDraft({ ...draftPayload(challenge), ...(req.body || {}) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  Object.assign(challenge, fields, {
    title: fields.title || "Untitled challenge",
    dept: fields.department || req.user.profile?.department || "Unassigned Department",
    deadline: fields.timeline || "Draft",
  });
  if (Array.isArray(req.body?.capabilities)) challenge.capabilities = req.body.capabilities.filter((item) => typeof item === "string").slice(0, 12);
  recordChallengeHistory(challenge, { actor: req.user, event: "draft_saved", details: { completeness: draftCompleteness(fields).percent } });
  writeDB(db);
  res.json({ challenge, completeness: draftCompleteness(fields) });
});

router.post("/challenge-drafts/:id/submit", requireRole("Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!requireDraftEditor(req, res, challenge)) return;
  if (challenge.status !== "Draft") return res.status(409).json({ error: "This challenge has already been submitted for review." });
  const fields = draftPayload(challenge);
  const validation = validateDraftForReview(fields);
  if (validation) return res.status(422).json(validation);
  challenge.status = "Under Review";
  recordChallengeHistory(challenge, { actor: req.user, event: "submitted_for_review", details: { completeness: 100 } });
  writeDB(db);
  res.json({ challenge });
});

router.post("/challenge-drafts/:id/publish", requireRole("Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge draft not found." });
  if (challenge.status !== "Under Review") return res.status(409).json({ error: "Only a challenge under review can be published." });
  const validation = validateDraftForReview(draftPayload(challenge));
  if (validation) return res.status(422).json(validation);
  challenge.status = "Published";
  challenge.publishedAt = new Date().toISOString();
  recordChallengeHistory(challenge, { actor: req.user, event: "published_after_human_review" });
  writeDB(db);
  queueEmbeddingRefresh("challenge", challenge.id);
  res.json({ challenge });
});

// Publishes a new challenge (department fills the structured form -> this
// persists it, using the theme/requirement generated above). Every challenge
// created this way immediately works with AI Startup Discovery and
// Auto-Eligibility Screening, since those key off the same `theme`/`risk`
// fields as the seeded demo challenges.
router.post("/challenges", requireRole("Government Official", "Platform Admin"), (req, res) => {
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
    createdBy: req.user.id,
  };

  db.challenges.push(challenge);
  writeDB(db);
  queueEmbeddingRefresh("challenge", challenge.id);
  res.status(201).json(challenge);
});

/* --------------------- Feature 1: AI Startup Discovery ------------------ */
// Auto-shortlists startups from the database against a challenge's
// sector/theme and requirements, instead of a department searching manually.
router.get("/challenges/:id/discovery", requireRole("Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (isPrivateChallenge(challenge)) return res.status(409).json({ error: "Publish this challenge before running startup discovery." });

  const discovery = matchStartupsForChallenge(db.startups, challenge);
  const shortlisted = discovery.matches.filter((m) => m.shortlisted);

  res.json({
    challengeId: challenge.id,
    theme: challenge.theme,
    candidatesChecked: db.startups.length,
    eligibleCount: discovery.matches.length,
    excludedCount: discovery.excluded.length,
    semanticReadyCount: discovery.semanticReady,
    semanticStatus: discovery.semanticReady === discovery.matches.length ? "ready" : "partial",
    shortlistedCount: shortlisted.length,
    message: `${shortlisted.length} startups shortlisted from ${discovery.matches.length} eligible profiles. Ranked with meaning-based fit and explainable evidence.`,
    matches: discovery.matches.map(publicStartupProfile),
  });
});

router.post("/challenges/:id/discovery/reindex", requireRole("Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (isPrivateChallenge(challenge)) return res.status(409).json({ error: "Publish this challenge before building its discovery index." });
  queueChallengeDiscoveryIndex(challenge.id);
  res.json({ ok: true, scheduled: (db.startups || []).length + 1 });
});

router.post("/challenges/:id/invitations", requireRole("Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (isPrivateChallenge(challenge)) return res.status(409).json({ error: "Only published challenges can invite startups." });
  const startup = findStartup(db, req.body?.startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  const match = matchStartupsForChallenge([startup], challenge).matches[0];
  if (!match) return res.status(422).json({ error: "This startup does not meet the discovery eligibility requirements." });
  db.invitations = db.invitations || [];
  const existing = db.invitations.find((invite) => invite.challengeId === challenge.id && invite.startupId === startup.id && invite.status === "Pending");
  if (existing) return res.status(409).json({ error: "This startup has already been invited.", invitation: existing });
  const invitation = {
    id: `invite_${randomUUID()}`,
    challengeId: challenge.id,
    startupId: startup.id,
    status: "Pending",
    invitedBy: req.user.id,
    invitedAt: new Date().toISOString(),
  };
  db.invitations.push(invitation);
  recordChallengeHistory(challenge, { actor: req.user, event: "startup_invited", details: { startupId: startup.id } });
  writeDB(db);
  res.status(201).json({ invitation });
});

router.get("/startup-invitations", requireRole("Startup"), (req, res) => {
  const db = readDB();
  const startup = db.startups.find((record) => record.ownerUserId === req.user.id);
  if (!startup) return res.json({ invitations: [] });
  const invitations = (db.invitations || [])
    .filter((invite) => invite.startupId === startup.id)
    .map((invite) => ({ ...invite, challenge: findChallenge(db, invite.challengeId) ? { id: findChallenge(db, invite.challengeId).id, title: findChallenge(db, invite.challengeId).title, deadline: findChallenge(db, invite.challengeId).deadline } : null }));
  res.json({ invitations });
});

/* --------------------- Feature 2: Auto-Eligibility Screening ------------ */
// Lists applications for a challenge, each with a live rule-based verdict.
router.get("/challenges/:id/applications", requireRole("Government Official", "Platform Admin", "Expert Evaluator", "Startup"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  let apps = db.applications.filter((a) => a.challengeId === challenge.id);
  if (req.user.role === "Startup") apps = apps.filter((application) => findStartup(db, application.startupId)?.ownerUserId === req.user.id);
  apps = apps.map((application) => decorateApplication(application, db)).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  if (req.user.role === "Expert Evaluator") apps = apps.filter((application) => application.status === "Eligible");

  res.json(apps);
});

// Submits a startup's own application and immediately runs the eligibility check.
// Department invitations are stored separately in the invitation workflow above.
router.post("/challenges/:id/applications", requireRole("Startup"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  if (isPrivateChallenge(challenge)) return res.status(409).json({ error: "Applications open only after a challenge is published." });
  if (req.user.verificationStatus !== "Verified") return res.status(409).json({ error: "Complete startup verification before applying to a challenge." });

  const { startupId } = req.body || {};
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  if (startup.ownerUserId !== req.user.id) return res.status(403).json({ error: "You can only apply using your own startup profile." });

  const already = db.applications.find((a) => a.challengeId === challenge.id && a.startupId === startupId);
  if (already) {
    return res.status(409).json({ error: "This startup has already applied to this challenge", application: decorateApplication(already, db) });
  }

  const application = { id: `ap_${randomUUID()}`, challengeId: challenge.id, startupId, submittedAt: new Date().toISOString() };
  screenApplication(application, startup, challenge);
  db.applications.push(application);
  const invitation = (db.invitations || []).find((record) => record.challengeId === challenge.id && record.startupId === startup.id && record.status === "Pending");
  if (invitation) invitation.status = "Accepted";
  recordChallengeHistory(challenge, { actor: req.user, event: "startup_applied", details: { startupId, applicationId: application.id, eligibilityStatus: application.eligibility.status } });
  writeDB(db);

  res.status(201).json(decorateApplication(application, db));
});

router.post("/applications/:id/rescreen", requireRole("Startup", "Government Official", "Platform Admin"), (req, res) => {
  const db = readDB();
  const application = (db.applications || []).find((record) => record.id === req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found" });
  const startup = findStartup(db, application.startupId);
  const challenge = findChallenge(db, application.challengeId);
  if (!startup || !challenge) return res.status(409).json({ error: "The application is missing its startup or challenge record." });
  if (req.user.role === "Startup" && startup.ownerUserId !== req.user.id) return res.status(403).json({ error: "You can only rescreen your own application." });
  screenApplication(application, startup, challenge);
  writeDB(db);
  res.json(decorateApplication(application, db));
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
router.post("/challenges/:id/evaluations", requireRole("Expert Evaluator", "Platform Admin"), (req, res) => {
  const db = readDB();
  const challenge = findChallenge(db, req.params.id);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const { startupId, evaluatorName, scores } = req.body || {};
  const startup = findStartup(db, startupId);
  if (!startup) return res.status(400).json({ error: "Unknown startupId" });
  const application = (db.applications || []).find((record) => record.challengeId === challenge.id && record.startupId === startupId);
  if (!application) return res.status(409).json({ error: "This startup has not submitted an application for the challenge." });
  const eligibility = application.eligibility || runEligibilityCheck(startup, challenge, application.submittedAt);
  if (eligibility.status !== "Eligible") return res.status(422).json({ error: `This application cannot enter expert evaluation: ${eligibility.reason || "eligibility screening was not passed"}.` });
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
router.post("/pilots", requireRole("Government Official", "Platform Admin"), (req, res) => {
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
router.patch("/pilots/:id/kpis/:key", requireRole("Government Official", "Validation Agency", "Platform Admin"), (req, res) => {
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

router.post("/challenges/:id/contracts", requireRole("Government Official", "Platform Admin"), (req, res) => {
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

router.post("/challenges/:id/pilot-design", requireRole("Government Official", "Platform Admin"), (req, res) => {
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
router.post("/pilot-design/:id/advance", requireRole("Government Official", "Validation Agency", "Platform Admin"), (req, res) => {
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

/* --------------------------------- Auth ---------------------------------- */
// Registration and legitimacy verification, scoped per role — see
// backend/src/auth.js for the specifics of what each role has to prove.
function setSessionCookie(res, token) {
  res.cookie("vyavsay_session", token, { httpOnly: true, sameSite: "strict", maxAge: 8 * 3600000, secure: process.env.NODE_ENV === "production", path: "/" });
}

router.get("/auth/roles", (_req, res) => res.json({ roles: ROLES }));

router.post("/auth/register", (req, res) => {
  const db = readDB();
  const { role, name, email, password } = req.body || {};

  if (!ROLES.includes(role)) return res.status(400).json({ error: "Choose a valid role." });
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  db.users = db.users || [];
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const verdict = verifyRegistration(role, { ...req.body, email }, db);
  if (verdict.error) return res.status(422).json({ error: verdict.error });

  const user = {
    id: `usr_${randomUUID()}`,
    role,
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    verificationStatus: verdict.verificationStatus,
    verificationNote: verdict.verificationNote,
    profile: verdict.profile,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  if (verdict.consumesInvite) verdict.consumesInvite.usedBy = user.id;

  db.authAudit = db.authAudit || [];
  db.authAudit.push({ id: `aa_${randomUUID()}`, type: "register", userId: user.id, role, email: user.email, verificationStatus: user.verificationStatus, at: user.createdAt });

  const token = createSession(db, user.id);
  writeDB(db);

  setSessionCookie(res, token);
  res.status(201).json({ user: publicUser(user), token });
});

router.post("/auth/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body || {};
  if (!isValidEmail(email) || !password) return res.status(400).json({ error: "Enter your email and password." });

  const lockoutError = checkLockout(email.toLowerCase());
  if (lockoutError) return res.status(429).json({ error: lockoutError });

  const user = (db.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase());
  const ok = user && verifyPassword(password, user.passwordHash);

  db.authAudit = db.authAudit || [];
  if (!ok) {
    recordFailedAttempt(email.toLowerCase());
    db.authAudit.push({ id: `aa_${randomUUID()}`, type: "login_failed", email: email.toLowerCase(), at: new Date().toISOString() });
    writeDB(db);
    // Deliberately generic — never reveal whether the email itself is registered.
    return res.status(401).json({ error: "Invalid email or password." });
  }

  clearFailedAttempts(email.toLowerCase());
  const token = createSession(db, user.id);
  db.authAudit.push({ id: `aa_${randomUUID()}`, type: "login", userId: user.id, role: user.role, email: user.email, at: new Date().toISOString() });
  writeDB(db);

  setSessionCookie(res, token);
  res.json({ user: publicUser(user), token });
});

router.post("/auth/logout", (req, res) => {
  const token = readSessionToken(req) || (req.body && req.body.token);
  if (token) {
    const db = readDB();
    destroySession(db, token);
    writeDB(db);
  }
  res.set("Set-Cookie", "vyavsay_session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// Platform Admin only: issue a single-use invite code for one of the
// oversight roles (Expert Evaluator, Validation Agency, Platform Admin).
router.post("/auth/invites", requireRole("Platform Admin"), (req, res) => {
  const db = readDB();
  const { role } = req.body || {};
  if (!["Expert Evaluator", "Validation Agency", "Platform Admin"].includes(role)) {
    return res.status(400).json({ error: "role must be one of: Expert Evaluator, Validation Agency, Platform Admin" });
  }
  const code = randomUUID().split("-")[0].toUpperCase();
  db.inviteCodes = db.inviteCodes || [];
  db.inviteCodes.push({ code, role, issuedBy: req.user.id, issuedAt: new Date().toISOString(), usedBy: null });
  writeDB(db);
  res.status(201).json({ code, role });
});

/* --------------------------------- Admin -------------------------------- */
// Resets the demo data store back to its seed state.
router.post("/admin/reset", requireRole("Platform Admin"), (_req, res) => {
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
    users: (db.users || []).length,
  });
});

export default router;
