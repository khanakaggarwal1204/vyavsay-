/* ---------------------------------------------------------------------- */
/*  API CLIENT — talks to the Express backend in /backend                  */
/*  In dev, Vite proxies /api/* to http://localhost:4000 (see vite.config).*/
/* ---------------------------------------------------------------------- */

async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin", // send the httpOnly vyavsay_session cookie
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  queryAssistant: (payload) => request("/assistant/query", { method: "POST", body: JSON.stringify(payload) }),
  getAssistantSession: (sessionId) => request(`/assistant/sessions/${encodeURIComponent(sessionId)}`),
  getChallenges: () => request("/challenges"),
  getChallenge: (id) => request(`/challenges/${id}`),
  createChallenge: (payload) => request("/challenges", { method: "POST", body: JSON.stringify(payload) }),
  structureRequirement: (fields) => request("/requirements/structure", { method: "POST", body: JSON.stringify(fields) }),
  createChallengeDraft: (payload) => request("/challenge-drafts", { method: "POST", body: JSON.stringify(payload) }),
  saveChallengeDraft: (id, payload, expectedVersion) => request(`/challenge-drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...payload, expectedVersion }) }),
  submitChallengeDraft: (id, expectedVersion) => request(`/challenge-drafts/${encodeURIComponent(id)}/submit`, { method: "POST", body: JSON.stringify({ expectedVersion }) }),
  reviewChallengeDraft: (id, expectedVersion, decision, findings) => request(`/challenge-drafts/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ expectedVersion, decision, findings }) }),
  publishChallengeDraft: (id, expectedVersion) => request(`/challenge-drafts/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify({ expectedVersion }) }),
  getStartups: () => request("/startups"),
  getMyStartup: () => request("/startups/me"),
  createStartup: (payload) => request("/startups", { method: "POST", body: JSON.stringify(payload) }),
  updateStartup: (id, payload) => request(`/startups/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getStartupInvitations: () => request("/startup-invitations"),
  getDiscovery: (challengeId) => request(`/challenges/${challengeId}/discovery`),
  refreshDiscoveryIndex: (challengeId) => request(`/challenges/${challengeId}/discovery/reindex`, { method: "POST", body: JSON.stringify({}) }),
  inviteStartup: (challengeId, startupId) => request(`/challenges/${challengeId}/invitations`, { method: "POST", body: JSON.stringify({ startupId }) }),
  getApplications: (challengeId) => request(`/challenges/${challengeId}/applications`),
  applyToChallenge: (challengeId, startupId) =>
    request(`/challenges/${challengeId}/applications`, {
      method: "POST",
      body: JSON.stringify({ startupId }),
    }),
  rescreenApplication: (applicationId) => request(`/applications/${encodeURIComponent(applicationId)}/rescreen`, { method: "POST", body: JSON.stringify({}) }),
  getRubric: (challengeId) => request(`/challenges/${challengeId}/rubric`),
  getEvaluations: (challengeId) => request(`/challenges/${challengeId}/evaluations`),
  submitEvaluation: (challengeId, { startupId, evaluatorName, scores }) =>
    request(`/challenges/${challengeId}/evaluations`, {
      method: "POST",
      body: JSON.stringify({ startupId, evaluatorName, scores }),
    }),

  // Feature 5: Performance Measurement (KPI targets locked in at pilot
  // start, achievement % auto-computed from field results as they arrive).
  getPilots: () => request("/pilots"),
  getPilot: (pilotId) => request(`/pilots/${pilotId}`),
  getPilotForChallenge: (challengeId) => request(`/challenges/${challengeId}/pilot`),
  createPilot: ({ challengeId, startupId, name, kpis }) =>
    request(`/pilots`, {
      method: "POST",
      body: JSON.stringify({ challengeId, startupId, name, kpis }),
    }),
  recordKpiResult: (pilotId, kpiKey, actual) =>
    request(`/pilots/${pilotId}/kpis/${kpiKey}`, {
      method: "PATCH",
      body: JSON.stringify({ actual }),
    }),

  // Milestone-Based Contracting: draft a contract from a challenge's
  // already-collected budget, split into a standard milestone schedule.
  getContracts: (challengeId) => request(`/challenges/${challengeId}/contracts`),
  createContract: (challengeId, { startupId, durationMonths }) =>
    request(`/challenges/${challengeId}/contracts`, {
      method: "POST",
      body: JSON.stringify({ startupId, durationMonths }),
    }),
  updateMilestoneStatus: (contractId, milestoneId, status) =>
    request(`/contracts/${contractId}/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Sandbox / Pilot Design: scope + duration locked upfront, phases gated
  // so live citizen data can't be reached before the sandbox phase passes.
  getPilotDesign: (challengeId) => request(`/challenges/${challengeId}/pilot-design`),
  createPilotDesign: (challengeId, { startupId, scopeLabel, durationMonths }) =>
    request(`/challenges/${challengeId}/pilot-design`, {
      method: "POST",
      body: JSON.stringify({ startupId, scopeLabel, durationMonths }),
    }),
  advancePilotPhase: (pilotDesignId) => request(`/pilot-design/${pilotDesignId}/advance`, { method: "POST" }),

  // Authentication: registration is verified per role (CIN + DPIIT for
  // startups, official email domain for government officials, admin-issued
  // invite codes for Expert Evaluator / Validation Agency / Platform Admin).
  getRoles: () => request("/auth/roles"),
  // rememberMe defaults to true server-side when omitted, but we always send
  // it explicitly here so the checkbox state is unambiguous.
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (email, password, rememberMe = true) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password, rememberMe }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request("/auth/me"),

  // Role-scoped, real-time dashboard data (see backend/src/routes.js
  // GET /api/dashboard/summary) — metrics and "my tasks" computed live from
  // the same store every other screen reads/writes, so a startup's own
  // registration/draft shows up here immediately, and each role only ever
  // sees its own numbers and its own task list.
  getDashboardSummary: () => request("/dashboard/summary"),
};
