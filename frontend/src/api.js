/* ---------------------------------------------------------------------- */
/*  API CLIENT — talks to the Express backend in /backend                  */
/*  In dev, Vite proxies /api/* to http://localhost:4000 (see vite.config).*/
/* ---------------------------------------------------------------------- */

async function request(path, options) {
  const res = await fetch(`/api${path}`, {
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
  getStartups: () => request("/startups"),
  getDiscovery: (challengeId) => request(`/challenges/${challengeId}/discovery`),
  getApplications: (challengeId) => request(`/challenges/${challengeId}/applications`),
  applyToChallenge: (challengeId, startupId) =>
    request(`/challenges/${challengeId}/applications`, {
      method: "POST",
      body: JSON.stringify({ startupId }),
    }),
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
};
