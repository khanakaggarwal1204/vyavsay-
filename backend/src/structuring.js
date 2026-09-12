/* ---------------------------------------------------------------------- */
/*  CHALLENGE IDENTIFICATION — turns a department's free-form problem      */
/*  description into a standard, structured problem statement instead of  */
/*  a free-form request, and gives every challenge the same clear shape.  */
/* ---------------------------------------------------------------------- */

// Each entry recognises a common government problem pattern and maps it to
// a standard requirement statement, a challenge theme (reused by AI Startup
// Discovery's sector matching), and the concrete capabilities a solution
// would need. Checked in order; the type with the most keyword hits wins.
const PROBLEM_TYPES = [
  {
    key: "document-tracking",
    theme: "Miscellaneous",
    triggers: [/\blost\b/i, /misplac/i, /\bmissing\b/i, /file(s)?\b/i, /document(s)?\b/i, /record(s)?\b/i, /paperwork/i, /transfer/i, /inter[- ]?department/i, /hand[- ]?off/i],
    requirementStatement: "A secure digital document-tracking system with immutable audit trails and role-based access.",
    capabilities: ["Digital document tracking", "Immutable audit trails", "Role-based access control", "Inter-department transfer workflow"],
  },
  {
    key: "waste-management",
    theme: "CleanTech",
    triggers: [/waste/i, /garbage/i, /sanitation/i, /\bbin(s)?\b/i, /urban/i, /municipal/i],
    requirementStatement: "A smart, sensor-based waste management system with real-time bin-fill monitoring and optimised collection routing.",
    capabilities: ["IoT bin-fill sensors", "Route optimisation", "Municipal dashboard & alerts"],
  },
  {
    key: "crop-health",
    theme: "AgriTech",
    triggers: [/crop/i, /pest/i, /\bfarm(er|ing)?\b/i, /agricultur/i, /plant disease/i, /infestation/i],
    requirementStatement: "An AI-based crop health monitoring system for early detection of disease and pest infestation, with farmer-facing alerts.",
    capabilities: ["Image-based disease detection", "Pest infestation alerts", "Farmer-facing mobile advisory"],
  },
  {
    key: "public-transport",
    theme: "Mobility",
    triggers: [/traffic/i, /transport/i, /\bbus(es)?\b/i, /commut/i, /vehicle tracking/i, /fleet/i, /route\b/i],
    requirementStatement: "A real-time public transport tracking and passenger information system integrated with existing fleet GPS data.",
    capabilities: ["Real-time vehicle tracking", "Passenger information system", "Fleet GPS integration"],
  },
  {
    key: "healthcare-access",
    theme: "HealthTech",
    triggers: [/health/i, /patient/i, /clinic/i, /diagnos/i, /telemedicine/i, /rural.*(care|health)/i],
    requirementStatement: "A rural telemedicine and primary-care triage platform connecting citizens to remote clinicians.",
    capabilities: ["Remote patient triage", "Telemedicine consultation", "Clinician scheduling & records"],
  },
  {
    key: "water-quality",
    theme: "CleanTech",
    triggers: [/water quality/i, /contamina/i, /decentrali[sz]ed water/i, /\bwater\b/i],
    requirementStatement: "A decentralised water-quality monitoring network with real-time contamination alerts.",
    capabilities: ["Distributed water-quality sensors", "Real-time contamination alerts", "Public dashboard"],
  },
  {
    key: "skilling-employment",
    theme: "EdTech",
    triggers: [/skill/i, /training/i, /employment/i, /job market/i, /curricul/i, /placement/i],
    requirementStatement: "A skill-gap analytics platform aligning training program curricula to real-time job market demand.",
    capabilities: ["Job-market demand analytics", "Curriculum gap analysis", "Placement tracking"],
  },
];

function combinedText(fields) {
  return [fields.title, fields.objective, fields.beneficiaries, fields.rawProblemStatement ?? fields.painPoint, fields.expectedOutcome ?? fields.outcome, fields.constraints]
    .filter(Boolean)
    .join(" \n ");
}

/**
 * Turn a department's structured-form free-text answers into a standard
 * problem statement. Always returns something — falls back to a generic
 * (low-confidence) restatement of the department's own words if no known
 * problem pattern is recognised, rather than failing.
 */
export function structureRequirement(fields) {
  const text = combinedText(fields);
  if (!text.trim()) {
    return {
      theme: "Miscellaneous",
      requirementStatement: null,
      expectedOutcome: null,
      constraints: null,
      capabilities: [],
      matchedProblemType: null,
      confidence: "none",
    };
  }

  let best = null;
  let bestScore = 0;
  for (const type of PROBLEM_TYPES) {
    const score = type.triggers.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }

  if (best && bestScore > 0) {
    return {
      theme: best.theme,
      requirementStatement: best.requirementStatement,
      expectedOutcome: fields.expectedOutcome || fields.outcome || "Achieve a measurable improvement of at least 30% within 6 months of the pilot launch.",
      constraints: fields.constraints || "Integrate with existing department systems, protect sensitive data, and comply with applicable government security and procurement requirements.",
      capabilities: best.capabilities,
      matchedProblemType: best.key,
      confidence: bestScore >= 2 ? "high" : "medium",
    };
  }

  // Fallback: no recognised pattern — restate what the department gave us
  // in the standard "Requirement: ..." shape rather than leaving it blank,
  // and flag low confidence so the department knows to refine it manually.
  const seed = (fields.rawProblemStatement || fields.painPoint || fields.objective || fields.title || "").trim();
  return {
    theme: "Miscellaneous",
    requirementStatement: seed ? `A digital solution to address: "${seed}".` : null,
    expectedOutcome: fields.expectedOutcome || fields.outcome || "Define a measurable service improvement target and timeframe before submitting this challenge for review.",
    constraints: fields.constraints || "Document existing systems, data access limits, security obligations, and procurement constraints before publication.",
    capabilities: [],
    matchedProblemType: null,
    confidence: "low",
  };
}
