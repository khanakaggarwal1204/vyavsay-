import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDB, writeDB } from "./db.js";
import { runEligibilityCheck } from "./eligibility.js";

const MAX_MESSAGE = 800;
const roles = new Set(["Government Official", "Startup", "Evaluator", "Validator", "Admin"]);

function clean(value, fallback = "") { return typeof value === "string" ? value.trim().slice(0, MAX_MESSAGE) : fallback; }
function find(db, type, id) { return (db[type] || []).find((item) => item.id === id); }
function contractProgress(milestones = []) {
  if (!milestones.length) return "not yet configured";
  if (milestones.every((m) => m.status === "Paid")) return "fully paid";
  if (milestones.some((m) => m.status === "In Review")) return "under milestone review";
  if (milestones.some((m) => m.status === "Complete")) return "milestone completion pending payment";
  return "in progress";
}
function statusAnswer(db, contextRef) {
  const application = find(db, "applications", contextRef);
  if (application) {
    const challenge = find(db, "challenges", application.challengeId), startup = find(db, "startups", application.startupId);
    const verdict = startup && challenge ? runEligibilityCheck(startup, challenge) : null;
    return `Application ${application.id} for ${startup?.name || "the startup"} is ${verdict?.status || "submitted"}. ${challenge?.title || "The linked challenge"} is currently ${challenge?.status || "in review"}.`;
  }
  const pilot = find(db, "pilots", contextRef);
  if (pilot) return `Pilot ${pilot.name || pilot.id} is active. It has ${pilot.kpis?.filter((k) => k.actual !== null && k.actual !== undefined).length || 0} KPI result(s) recorded out of ${pilot.kpis?.length || 0}.`;
  const design = find(db, "pilotDesigns", contextRef);
  if (design) return `Pilot design ${design.id} is locked for ${design.scopeLabel || "the selected scope"}. Current phase: ${design.phases?.find((phase) => phase.status === "Active")?.name || "awaiting transition"}. Live rollout is ${design.phases?.find((phase) => phase.key === "live")?.status?.toLowerCase() || "not configured"}.`;
  const contract = find(db, "contracts", contextRef);
  if (contract) return `Contract ${contract.id} is ${contractProgress(contract.milestones)} with ${contract.milestones?.filter((m) => m.status === "Paid").length || 0} paid milestone(s) out of ${contract.milestones?.length || 0}.`;
  const challenge = find(db, "challenges", contextRef);
  if (challenge) {
    const pilotForChallenge = (db.pilotDesigns || []).find((item) => item.challengeId === challenge.id);
    const contractForChallenge = (db.contracts || []).find((item) => item.challengeId === challenge.id);
    if (pilotForChallenge) return statusAnswer(db, pilotForChallenge.id);
    if (contractForChallenge) return statusAnswer(db, contractForChallenge.id);
    return `${challenge.title} is currently ${challenge.status || "in progress"} with ${challenge.apps || 0} applications recorded.`;
  }
  return "I need an application, pilot, or contract selected to read its live status. Open the relevant record and ask again.";
}
function groundedAnswer(message, db, contextRef) {
  const text = message.toLowerCase();
  if (/(status|progress|where.*pilot|application)/.test(text) && contextRef) return statusAnswer(db, contextRef);
  if (/(eligible|eligibility|qualif)/.test(text)) {
    const application = find(db, "applications", contextRef), startup = application && find(db, "startups", application.startupId), challenge = application && find(db, "challenges", application.challengeId);
    if (startup && challenge) { const verdict = runEligibilityCheck(startup, challenge); return `The live eligibility check for ${startup.name} is ${verdict.status}. ${verdict.reasons?.join(" ") || "All configured checks passed."} This is a platform screening result, not a legal or procurement ruling.`; }
    return "Eligibility is checked against the selected challenge's registration, DPIIT, experience, and certification requirements. Open a specific application so I can read its live screening result.";
  }
  if (/(template|problem statement|rubric|pilot agreement|data|ip|cyber|risk|procurement pathway)/.test(text)) return "Vyavsay has seven standard libraries: Problem Statement, Evaluation Criteria, Pilot Agreement, Data and IP Clauses, Cybersecurity, Risk Management, and Procurement Pathways. Each draft has validation, review, versioning, and an audit trail before it can be used.";
  if (/(workflow|next|stage|lifecycle)/.test(text)) return "The walkthrough covers nine stages: challenge identification, startup discovery, eligibility screening, expert evaluation, pilot design, milestone contracting, performance and payment, independent validation, and scale-up decision. Human approval remains required at decision gates.";
  if (/(hello|hi|namaste)/.test(text)) return "Namaste. I am the Vyavsay platform guide. Ask about a workflow, template, eligibility screening, or the status of a selected record.";
  return "I can explain Vyavsay workflows and read selected application, pilot, and contract records. I will not invent a status or make a legal, procurement, or eligibility ruling. Try asking about eligibility or the status of the selected record.";
}
export function createAssistantService() {
  const router = Router();
  router.post("/query", (req, res) => {
    const message = clean(req.body?.message);
    if (!message) return res.status(422).json({ error: "message is required" });
    const db = readDB(), sessionId = clean(req.body?.sessionId) || `chat_${randomUUID()}`, role = roles.has(req.body?.role) ? req.body.role : "Guest", contextRef = clean(req.body?.contextRef, "") || null, now = new Date().toISOString();
    db.chatSessions ||= []; db.chatMessages ||= [];
    let session = db.chatSessions.find((item) => item.id === sessionId);
    if (!session) { session = { id: sessionId, userId: clean(req.body?.userId, "guest") || "guest", role, contextRef, status: "Active", createdAt: now, updatedAt: now }; db.chatSessions.push(session); }
    const answer = groundedAnswer(message, db, contextRef || session.contextRef); session.updatedAt = now;
    db.chatMessages.push({ id: `msg_${randomUUID()}`, sessionId, speaker: "User", text: message, audioUsed: Boolean(req.body?.audioUsed), toolCalled: null, createdAt: now });
    db.chatMessages.push({ id: `msg_${randomUUID()}`, sessionId, speaker: "Assistant", text: answer, audioUsed: Boolean(req.body?.audioUsed), toolCalled: contextRef ? "grounded_record_lookup" : null, createdAt: new Date().toISOString() });
    writeDB(db); res.json({ sessionId, answer, grounded: Boolean(contextRef), source: contextRef ? "Vyavsay data store" : "Vyavsay platform guidance" });
  });
  router.get("/sessions/:id", (req, res) => { const db = readDB(), session = find(db, "chatSessions", req.params.id); if (!session) return res.status(404).json({ error: "Chat session not found" }); res.json({ session, messages: (db.chatMessages || []).filter((item) => item.sessionId === session.id) }); });
  return { router };
}
