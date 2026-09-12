import { RUBRIC_CATEGORIES, weightsForChallenge } from "../evaluation.js";
import { PROBLEM_STATEMENT_FIELDS } from "../problemStatementSchema.js";

const field = (key, label, type = "text", options) => ({
  key,
  label,
  type,
  required: true,
  ...(options ? { options } : {}),
});
export const IP_OPTIONS = [
  {
    id: "department-data",
    label: "Department data / startup core technology",
    text: "The department controls pilot-generated data. The startup retains its pre-existing technology. Access, permitted processing, retention and deletion require the approved data schedule.",
  },
  {
    id: "licensed-results",
    label: "Startup technology / licensed deliverables",
    text: "The startup retains pre-existing technology and grants the department a licence to agreed deliverables. The agreement must specify licence duration, permitted users, transfer rights and data responsibilities.",
  },
  {
    id: "joint-results",
    label: "Jointly developed deliverables",
    text: "Ownership and exploitation of jointly developed deliverables require an express allocation in the agreement. Each party retains its pre-existing intellectual property. Data rights remain subject to applicable obligations.",
  },
];
export const CONTROLS = [
  { key: "encryption", label: "Encryption in transit and at rest" },
  {
    key: "localisation",
    label: "Hosting location and data handling requirements",
  },
  {
    key: "certifications",
    label: "Required certifications and security assessment",
  },
];
export const CATALOG = [
  {
    id: "problem",
    name: "Outcome-Based Problem Statement",
    category: "Challenge",
    version: 2,
    fields: PROBLEM_STATEMENT_FIELDS,
  },
  {
    id: "evaluation",
    name: "Evaluation Criteria",
    category: "Evaluation",
    fields: [],
  },
  {
    id: "agreement",
    name: "Pilot Agreement",
    category: "Contract",
    startup: true,
    fields: [
      field("scope", "Pilot scope", "textarea"),
      field("acceptance", "Acceptance criteria", "textarea"),
      field(
        "paymentTerms",
        "Payment terms and invoice requirements",
        "textarea",
      ),
      field(
        "ipOption",
        "Data and IP option",
        "select",
        IP_OPTIONS.map((o) => o.id),
      ),
    ],
  },
  {
    id: "data-ip",
    name: "Data / IP Clauses",
    category: "Contract",
    fields: [
      field(
        "ipOption",
        "Ownership option",
        "select",
        IP_OPTIONS.map((o) => o.id),
      ),
      field(
        "dataSchedule",
        "Access, retention, deletion and licence schedule",
        "textarea",
      ),
    ],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity Checklist",
    category: "Security",
    startup: true,
    fields: [
      field("systemScope", "System, version and data scope", "textarea"),
      field(
        "requirements",
        "Applicable security / certification requirements",
        "textarea",
      ),
    ],
  },
  {
    id: "risk",
    name: "Risk Management",
    category: "Risk",
    fields: [
      field("dataSensitivity", "Data sensitivity", "select", [
        "public",
        "personal",
        "patient-adjacent",
      ]),
      field(
        "criticalService",
        "Could failure interrupt an essential service?",
        "select",
        ["no", "yes"],
      ),
      field("internetExposure", "Internet-facing deployment?", "select", [
        "no",
        "yes",
      ]),
      field("externalAccess", "Third-party access to data?", "select", [
        "no",
        "yes",
      ]),
    ],
  },
  {
    id: "procurement",
    name: "Procurement Pathways",
    category: "Procurement",
    fields: [
      field("contractValue", "Contract value (INR)", "number"),
      field("jurisdiction", "Applicable jurisdiction"),
      field("urgency", "Urgency", "select", ["routine", "urgent"]),
      field("vendorRelationship", "Vendor relationship", "select", [
        "new",
        "repeat",
      ]),
      field("purchaseScope", "Goods / services and proposed scope", "textarea"),
    ],
  },
].map((t) => ({
  ...t,
  version: t.version || 1,
  contentStatus: "Review required",
  fields: t.fields,
}));

export function validateAnswers(template, input, complete = false) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Object.assign(new Error("Answers must be an object."), {
      status: 422,
    });
  if (Object.keys(input).some((k) => !template.fields.some((f) => f.key === k)))
    throw Object.assign(new Error("Unknown answer field."), { status: 422 });
  const answers = {};
  for (const f of template.fields) {
    const v = input[f.key];
    if (v === undefined || v === "") {
      if (complete && f.required)
        throw Object.assign(new Error(`${f.label} is required.`), {
          status: 422,
        });
      continue;
    }
    const valid =
      f.type === "number"
        ? Number.isSafeInteger(v) && v >= 0 && v <= 1e10
        : typeof v === "string" &&
          v.trim().length > 0 &&
          v.length <= 5000 &&
          !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) &&
          (!f.options || f.options.includes(v));
    if (!valid)
      throw Object.assign(new Error(`${f.label} is invalid.`), { status: 422 });
    answers[f.key] = typeof v === "string" ? v.trim() : v;
  }
  if (
    answers.budgetMin !== undefined &&
    answers.budgetMax !== undefined &&
    answers.budgetMin > answers.budgetMax
  )
    throw Object.assign(
      new Error("Minimum budget cannot exceed maximum budget."),
      { status: 422 },
    );
  if (template.id === "problem" && complete) {
    const measurable = /\d/.test(answers.expectedOutcome) &&
      /(day|week|month|year|quarter|within|by\s)/i.test(answers.expectedOutcome);
    if (!measurable)
      throw Object.assign(
        new Error("Expected outcome must include a number and timeframe."),
        { status: 422 },
      );
    if (answers.primaryKpiTarget === answers.primaryKpiBaseline)
      throw Object.assign(
        new Error("KPI target must differ from its baseline."),
        { status: 422 },
      );
    for (const key of ["submissionDeadline", "expectedPilotStartDate", "targetDate"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(answers[key]) || !Number.isFinite(Date.parse(answers[key])))
        throw Object.assign(new Error(`${key} must be a valid date.`), { status: 422 });
    }
    if (answers.submissionDeadline >= answers.expectedPilotStartDate)
      throw Object.assign(
        new Error("Expected pilot start must be after the startup submission deadline."),
        { status: 422 },
      );
  }
  return answers;
}

export function assessRisk(a) {
  const reasons = [],
    mitigations = [];
  if (a.dataSensitivity === "patient-adjacent")
    reasons.push("Patient-adjacent data requires heightened security review.");
  if (a.dataSensitivity === "personal")
    reasons.push("Personal data requires access and retention controls.");
  if (a.criticalService === "yes")
    reasons.push("Service failure could affect essential operations.");
  if (a.internetExposure === "yes")
    reasons.push("Internet exposure increases attack surface.");
  if (a.externalAccess === "yes")
    reasons.push("Third-party access needs explicit restrictions.");
  const level =
    a.dataSensitivity === "patient-adjacent" || a.criticalService === "yes"
      ? "High"
      : reasons.length
        ? "Medium"
        : "Low";
  if (level !== "Low")
    mitigations.push(
      "Require encryption evidence and least-privilege access.",
      "Agree a bounded sandbox and early review checkpoint.",
    );
  if (a.externalAccess === "yes")
    mitigations.push("Approve third-party access and data/IP clauses.");
  return {
    level,
    reasons,
    mitigations,
    policy: "Risk assessment v1; decision support, not legal certification",
  };
}

export function resultFor(
  record,
  policies = [],
  now = new Date().toISOString(),
) {
  const a = record.answers;
  if (record.templateId === "risk") {
    try {
      validateAnswers(
        CATALOG.find((t) => t.id === "risk"),
        a,
        true,
      );
    } catch {
      return { status: "Complete the questionnaire to assess risk." };
    }
    return assessRisk(a);
  }
  if (record.templateId === "evaluation")
    return {
      categories: RUBRIC_CATEGORIES,
      ...weightsForChallenge(record.source.challenge),
      scale: "0-10 per category; weighted total out of 100",
    };
  if (["agreement", "data-ip"].includes(record.templateId))
    return {
      clause: IP_OPTIONS.find((o) => o.id === a.ipOption)?.text || null,
      status:
        "Draft clauses require authorised review; no agreement is signed here.",
    };
  if (record.templateId === "procurement") {
    const matches = policies.filter(
      (p) =>
        p.jurisdiction === a.jurisdiction &&
        a.contractValue >= p.minValue &&
        a.contractValue <= p.maxValue &&
        p.urgency.includes(a.urgency) &&
        p.vendorRelationship.includes(a.vendorRelationship) &&
        p.effectiveFrom <= now.slice(0, 10) &&
        p.effectiveUntil >= now.slice(0, 10),
    );
    return {
      status: matches.length
        ? "Suggested for procurement review"
        : "Officer review required",
      matches,
      reasons: matches.length
        ? []
        : [
            "No verified configured rule covers this purchase. Value, urgency or a repeat vendor alone does not establish an authorised route.",
          ],
    };
  }
  return null;
}
