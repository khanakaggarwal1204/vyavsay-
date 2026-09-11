import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDB, writeDB } from "./db.js";
import { runEligibilityCheck } from "./eligibility.js";

const MAX_MESSAGE = 800;
const MAX_SPEECH = 2000;
const roles = new Set(["Government Official", "Startup", "Evaluator", "Validator", "Admin"]);

function clean(value, fallback = "", limit = MAX_MESSAGE) {
  return typeof value === "string" ? value.trim().slice(0, limit) : fallback;
}
function find(db, type, id) {
  return (db[type] || []).find((item) => item.id === id);
}
function contractProgress(milestones = []) {
  if (!milestones.length) return "not yet configured";
  if (milestones.every((milestone) => milestone.status === "Paid")) return "fully paid";
  if (milestones.some((milestone) => milestone.status === "In Review")) return "under milestone review";
  if (milestones.some((milestone) => milestone.status === "Complete")) return "milestone completion pending payment";
  return "in progress";
}
function daysUntil(date) {
  const target = new Date(date);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.ceil((target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}
function statusAnswer(db, contextRef) {
  const application = find(db, "applications", contextRef);
  if (application) {
    const challenge = find(db, "challenges", application.challengeId);
    const startup = find(db, "startups", application.startupId);
    const verdict = startup && challenge ? runEligibilityCheck(startup, challenge) : null;
    return `Application ${application.id} for ${startup?.name || "the startup"} is ${verdict?.status || "submitted"}. ${challenge?.title || "The linked challenge"} is currently ${challenge?.status || "in review"}.`;
  }
  const pilot = find(db, "pilots", contextRef);
  if (pilot) return `Pilot ${pilot.name || pilot.id} is active. It has ${pilot.kpis?.filter((kpi) => kpi.actual !== null && kpi.actual !== undefined).length || 0} KPI results recorded out of ${pilot.kpis?.length || 0}.`;
  const design = find(db, "pilotDesigns", contextRef);
  if (design) return `Pilot design ${design.id} is locked for ${design.scopeLabel || "the selected scope"}. Current phase: ${design.phases?.find((phase) => phase.status === "Active")?.name || "awaiting transition"}. Live rollout is ${design.phases?.find((phase) => phase.key === "live")?.status?.toLowerCase() || "not configured"}.`;
  const contract = find(db, "contracts", contextRef);
  if (contract) return `Contract ${contract.id} is ${contractProgress(contract.milestones)} with ${contract.milestones?.filter((milestone) => milestone.status === "Paid").length || 0} paid milestones out of ${contract.milestones?.length || 0}.`;
  const challenge = find(db, "challenges", contextRef);
  if (challenge) return `${challenge.title} is currently ${challenge.status || "in progress"} with ${challenge.apps || 0} applications recorded.`;
  return "Select an application, pilot, contract, or challenge first so I can read the correct live record.";
}
function selectedContext(db, contextRef) {
  if (!contextRef) return null;
  for (const type of ["applications", "pilots", "pilotDesigns", "contracts", "challenges"]) {
    const record = find(db, type, contextRef);
    if (record) return { type, record };
  }
  return null;
}
function liveAnswer(message, db, contextRef) {
  const text = message.toLowerCase();
  const decisionRequest = /(should i|would you|tell me to).*(approve|reject|fund|select|award)|is (this|the) (startup|pilot).*(good|worth)|recommend.*(approve|fund|startup)/i;
  if (decisionRequest.test(message)) return { answer: "I cannot approve, reject, fund, or select a startup. I can show verified evidence, eligibility results, evaluator scores, risks, and KPI performance, but the authorised human reviewer must make and record the decision.", grounded: true, tool: "decision_guardrail" };
  if (/(how many|number of).*(startup|marketplace)/.test(text)) return { answer: `There are ${(db.startups || []).length} startups currently recorded in the Vyavsay marketplace.`, grounded: true, tool: "count_startups" };
  if (/(today|today's date|current date)/.test(text)) {
    const contract = find(db, "contracts", contextRef);
    const next = contract?.milestones?.filter((milestone) => milestone.status !== "Paid" && milestone.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    const dateText = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date());
    if (!next) return { answer: `Today is ${dateText}. Select a contract to calculate the number of days until its next milestone.`, grounded: true, tool: "current_date" };
    const days = daysUntil(next.dueDate);
    return { answer: `Today is ${dateText}. ${next.name} is due on ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(next.dueDate))}, ${days < 0 ? `${Math.abs(days)} days overdue` : `${days} days from today`}.`, grounded: true, tool: "milestone_due_date" };
  }
  if (/(status|progress|where.*pilot|my application|published challenge|applications? (status|count)|how many.*appl)/.test(text)) return { answer: statusAnswer(db, contextRef), grounded: true, tool: "grounded_record_lookup" };
  if (/(is my startup eligible|why was.*ineligible|why was.*rejected|eligibility.*(this|my)|eligible for this)/.test(text)) {
    const application = find(db, "applications", contextRef);
    const startup = application && find(db, "startups", application.startupId);
    const challenge = application && find(db, "challenges", application.challengeId);
    if (!startup || !challenge) return { answer: "Open the relevant application before asking for a specific eligibility result. I will read the rule-based screening record and will not guess.", grounded: true, tool: "eligibility_lookup" };
    const verdict = runEligibilityCheck(startup, challenge);
    return { answer: `The live eligibility check for ${startup.name} is ${verdict.status}. ${verdict.reasons?.join(" ") || "All configured checks passed."} This is a platform screening result, not a legal or procurement ruling.`, grounded: true, tool: "eligibility_lookup" };
  }
  if (/(when.*(paid|payment)|payment.*due|next milestone)/.test(text) && contextRef) {
    const contract = find(db, "contracts", contextRef);
    if (contract) return { answer: statusAnswer(db, contract.id), grounded: true, tool: "payment_lookup" };
  }
  return null;
}

export function fallbackAnswer(message) {
  const text = message.toLowerCase();
  if (/(what is|about).*vyav(a)?say|how does vyav(a)?say work/.test(text)) return "Vyavsay is an auditable innovation-procurement platform that connects government challenges with eligible startups, controlled pilots, milestone payments, independent validation, and evidence-based scale-up.";
  if (/(9|nine|all).*(stage|lifecycle)|stage.*platform|workflow|what.*next/.test(text)) return "The nine stages are challenge identification, startup discovery, eligibility screening, expert evaluation, sandbox or pilot design, milestone-based contracting, performance measurement and payment, independent validation, and a human-authorised scale-up decision.";
  if (/\btrl\b/.test(text)) return "TRL means Technology Readiness Level. It is a one-to-nine scale used to describe how mature a technology is, from an early concept to a proven operational system.";
  if (/dpiit/.test(text)) return "DPIIT recognition is official Startup India recognition by the Department for Promotion of Industry and Internal Trade. On Vyavsay, a startup records its recognition details and supporting certificate for eligibility verification.";
  if (/sandbox.*pilot|pilot.*sandbox|difference.*sandbox/.test(text)) return "A sandbox is an isolated test using synthetic or tightly controlled data. A pilot is a limited real-world deployment with locked scope, duration, safeguards, and KPIs. A sandbox should pass before sensitive live access begins.";
  if (/(create|register).*(account|startup)|sign.?up/.test(text)) return "Choose Register Your Startup or the relevant role login, enter the organisation and authorised-user details, verify the account, then complete the workspace profile and required evidence.";
  if (/completeness score/.test(text)) return "The completeness score shows how many required problem-statement fields and supporting records are complete. It is a drafting aid, not an approval score.";
  if (/(post|publish|create).*(challenge|problem)/.test(text)) return "Open Challenges, create a structured problem statement, complete sector, outcome, beneficiaries, budget, timeline, constraints and risk questions, then submit it for departmental review before publication.";
  if (/documents?.*(apply|need)|need.*documents?/.test(text)) return "Typical evidence includes registration and DPIIT details, authorised signatory proof, relevant certifications, capability evidence, financial declarations, conflict disclosures, and any challenge-specific documents. The selected challenge's checklist is authoritative.";
  if (/procurement pathway/.test(text)) return "The Procurement Pathways library compares contract value, urgency, jurisdiction, and vendor relationship with reviewed rules, then suggests a route for an authorised procurement officer to confirm.";
  if (/risk.*(calculated|level)|calculate.*risk/.test(text)) return "Pilot risk is derived from structured answers about data sensitivity, citizen impact, operational criticality, technology maturity, cybersecurity exposure, deployment scope, and reversibility. Higher-risk answers add controls and review gates.";
  if (/(own|ownership).*(ip|data)|\bip\b.*pilot/.test(text)) return "Data and IP ownership is fixed before the pilot through reviewed clauses. A common arrangement gives the department ownership or usage rights over generated data while the startup retains its pre-existing core technology, but the signed agreement controls.";
  if (/(score|rubric|evaluation).*(application|startup)|supposed to score/.test(text)) return "Evaluators score Innovation, Feasibility, Cost, Security, and Scalability using the same rubric. Risk can adjust category weights, and the platform calculates comparable weighted totals.";
  if (/security weight/.test(text)) return "Security receives more weight when structured risk answers show sensitive data, citizen impact, critical systems, or elevated cyber exposure. The adjustment is recorded so evaluators can see why it changed.";
  if (/conflict of interest/.test(text)) return "Declare the conflict before scoring. Vyavsay records it and removes or reassigns the evaluation so the conflicted evaluator cannot influence the result.";
  if (/(score.*different|different.*score|outlier)/.test(text)) return "A materially different evaluator score is flagged for review. The system preserves every score and rationale and can request moderation or another independent evaluation instead of silently averaging the difference away.";
  if (/ready for validation/.test(text)) return "A pilot becomes ready for validation only after its scope and KPIs are locked, required milestones are accepted, evidence is complete, disputes are resolved, and the pilot is marked complete.";
  if (/kpi achievement/.test(text)) return "KPI achievement compares the locked target with verified actual results using the configured formula. Open the pilot record for its exact percentage and evidence.";
  if (/scale.?up/.test(text)) return "After independent validation, Vyavsay combines KPI achievement, risk, disputes, cost, and evidence quality into a recommendation to scale, scale partially, extend, or stop. An authorised human makes the final decision.";
  if (/(payment|paid|milestone)/.test(text)) return "Milestone payment begins when the startup submits evidence and the department confirms completion. Finance receives a payment record with the due date, and overdue cases are escalated.";
  if (/(eligible|eligibility|qualif)/.test(text)) return "Eligibility screening checks registration, DPIIT status, experience and challenge-specific certifications. Open an application for its live result; the assistant will not invent one.";
  if (/(template|problem statement|pilot agreement|data.*ip|cybersecurity)/.test(text)) return "Vyavsay provides seven governed libraries: Problem Statement, Evaluation Criteria, Pilot Agreement, Data and IP Clauses, Cybersecurity, Risk Management, and Procurement Pathways. Drafts are validated, reviewed, versioned, and audited before use.";
  if (/(hello|hi|namaste)/.test(text)) return "Namaste. I am your Vyavsay guide. Ask me about a workflow, template, challenge, application, pilot, payment, validation, or scale-up.";
  return "I can help with Vyavsay, startup and government workflows, procurement terminology, templates, pilots, payments, validation, and navigation. For a live status or eligibility result, open the relevant record first so I can use verified data.";
}

function platformContext(db, contextRef) {
  const selected = selectedContext(db, contextRef);
  return JSON.stringify({ currentDate: new Date().toISOString(), marketplaceStartupCount: (db.startups || []).length, challengeCount: (db.challenges || []).length, selectedRecord: selected ? { type: selected.type, id: selected.record.id, status: selected.record.status || null, title: selected.record.title || selected.record.name || null } : null });
}
function systemPrompt(role, context) {
  return `You are the Vyavsay guide for a ${role}. Vyavsay is an Indian government innovation-procurement platform. Give concise, practical answers about its workflows, startup participation, government challenges, templates, pilots, payments, validation, procurement terminology, and navigation. You may explain general concepts using your knowledge. Never invent application, challenge, pilot, payment, eligibility, or marketplace data; only use facts present in VERIFIED CONTEXT. Never make an approval, rejection, funding, legal, or procurement decision. Explain the evidence and direct the user to the authorised human process. If a question is unrelated to Vyavsay or public innovation procurement, politely redirect. Spell the brand Vyavsay in text. VERIFIED CONTEXT: ${context}`;
}
async function fetchJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json();
}
async function callOpenAICompatible({ url, key, model, messages, headers = {} }) {
  const data = await fetchJson(url, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers }, body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 450 }) });
  return clean(data.choices?.[0]?.message?.content, "", 4000);
}
async function callGemini({ key, model, messages }) {
  const system = messages.find((item) => item.role === "system")?.content || "";
  const contents = messages.filter((item) => item.role !== "system").map((item) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] }));
  const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.25, maxOutputTokens: 450 } }) });
  return clean(data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(""), "", 4000);
}
async function askProviders(messages) {
  const providers = [
    process.env.GROQ_API_KEY && { name: "groq", run: () => callOpenAICompatible({ url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "openai/gpt-oss-20b", messages }) },
    process.env.GEMINI_API_KEY && { name: "gemini", run: () => callGemini({ key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-2.5-flash", messages }) },
    process.env.OPENROUTER_API_KEY && { name: "openrouter", run: () => callOpenAICompatible({ url: "https://openrouter.ai/api/v1/chat/completions", key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || "openrouter/free", messages, headers: { "HTTP-Referer": process.env.PUBLIC_URL || "https://vyavsay.onrender.com", "X-Title": "Vyavsay" } }) },
  ].filter(Boolean);
  for (const provider of providers) {
    try {
      const answer = await provider.run();
      if (answer) return { answer, provider: provider.name };
    } catch (error) {
      console.warn(`Assistant provider ${provider.name} failed: ${error.message}`);
    }
  }
  return null;
}

export function speechText(text, browser = false) {
  const pronunciation = browser ? "vyuh-vuh-saay" : "व्यवसाय";
  return clean(text, "", MAX_SPEECH).replace(/\bVyav(?:a)?say\b/gi, pronunciation);
}

export function pcmToWav(pcm, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function createAssistantService() {
  const router = Router();
  router.post("/query", async (req, res, next) => {
    try {
      const message = clean(req.body?.message);
      if (!message) return res.status(422).json({ error: "message is required" });
      const db = readDB();
      const sessionId = clean(req.body?.sessionId) || `chat_${randomUUID()}`;
      const role = roles.has(req.body?.role) ? req.body.role : "Guest";
      const contextRef = clean(req.body?.contextRef, "") || null;
      const now = new Date().toISOString();
      db.chatSessions ||= [];
      db.chatMessages ||= [];
      let session = db.chatSessions.find((item) => item.id === sessionId);
      if (!session) {
        session = { id: sessionId, userId: clean(req.body?.userId, "guest") || "guest", role, contextRef, status: "Active", createdAt: now, updatedAt: now };
        db.chatSessions.push(session);
      }
      if (contextRef) session.contextRef = contextRef;
      const effectiveContext = contextRef || session.contextRef;
      const live = liveAnswer(message, db, effectiveContext);
      const history = db.chatMessages.filter((item) => item.sessionId === sessionId).slice(-8).map((item) => ({ role: item.speaker === "Assistant" ? "assistant" : "user", content: item.text }));
      const generated = live || await askProviders([{ role: "system", content: systemPrompt(role, platformContext(db, effectiveContext)) }, ...history, { role: "user", content: message }]);
      const answer = generated?.answer || fallbackAnswer(message);
      const provider = live ? "vyavsay-data" : generated?.provider || "fallback-library";
      session.updatedAt = now;
      db.chatMessages.push({ id: `msg_${randomUUID()}`, sessionId, speaker: "User", text: message, audioUsed: Boolean(req.body?.audioUsed), toolCalled: null, createdAt: now });
      db.chatMessages.push({ id: `msg_${randomUUID()}`, sessionId, speaker: "Assistant", text: answer, audioUsed: Boolean(req.body?.audioUsed), toolCalled: live?.tool || null, provider, createdAt: new Date().toISOString() });
      writeDB(db);
      res.json({ sessionId, answer, grounded: Boolean(live), source: provider });
    } catch (error) {
      next(error);
    }
  });
  router.post("/speech", async (req, res) => {
    const text = speechText(req.body?.text);
    if (!text) return res.status(422).json({ error: "text is required" });
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "Natural voice is not configured" });
    try {
      const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Speak in a warm, natural, professional Indian female voice with relaxed pacing. Read only this response: ${text}` }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || "Kore" } } } },
        }),
      });
      if (!response.ok) throw new Error(`Gemini TTS returned ${response.status}`);
      const data = await response.json();
      const encoded = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;
      if (!encoded) throw new Error("Gemini TTS returned no audio");
      res.set({ "Content-Type": "audio/wav", "Cache-Control": "no-store" });
      res.send(pcmToWav(Buffer.from(encoded, "base64")));
    } catch (error) {
      console.warn(`Natural voice failed: ${error.message}`);
      res.status(502).json({ error: "Natural voice is temporarily unavailable" });
    }
  });
  router.get("/sessions/:id", (req, res) => {
    const db = readDB();
    const session = find(db, "chatSessions", req.params.id);
    if (!session) return res.status(404).json({ error: "Chat session not found" });
    res.json({ session, messages: (db.chatMessages || []).filter((item) => item.sessionId === session.id) });
  });
  return { router };
}
