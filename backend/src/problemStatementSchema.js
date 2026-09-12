const field = (key, label, type = "text", options, required = true) => ({
  key,
  label,
  type,
  required,
  ...(options ? { options } : {}),
});

export const PROBLEM_STATEMENT_FIELDS = [
  field("title", "Challenge title"),
  field("department", "Department"),
  field("sector", "Sector / theme"),
  field("objective", "Department objective", "textarea"),
  field("rawProblemStatement", "Raw problem in plain language", "textarea"),
  field("beneficiaries", "Target beneficiaries"),
  field("location", "Pilot location"),
  field("requirementStatement", "Technical requirement", "textarea"),
  field("expectedOutcome", "Measurable expected outcome", "textarea"),
  field("constraints", "Constraints", "textarea"),
  field("budgetMin", "Minimum pilot budget", "number"),
  field("budgetMax", "Maximum pilot budget", "number"),
  field("currency", "Currency", "select", ["INR"]),
  field("pilotDurationMonths", "Pilot duration (months)", "number"),
  field("submissionDeadline", "Startup submission deadline", "date"),
  field("expectedPilotStartDate", "Expected pilot start date", "date"),
  field("primaryKpiName", "Primary KPI"),
  field("primaryKpiBaseline", "KPI baseline", "number"),
  field("primaryKpiTarget", "KPI target", "number"),
  field("primaryKpiUnit", "KPI unit"),
  field("measurementMethod", "Measurement method", "textarea"),
  field("evidenceSource", "Evidence source", "textarea"),
  field("targetDate", "KPI target date", "date"),
];

export const PROBLEM_STATEMENT_KEYS = PROBLEM_STATEMENT_FIELDS.map((item) => item.key);

export function formatBudget({ budgetMin, budgetMax, currency = "INR" }) {
  if (!Number.isSafeInteger(budgetMin) || !Number.isSafeInteger(budgetMax)) return "TBD";
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  const format = (value) => value >= 100000 ? `${Number((value / 100000).toFixed(2))} L` : value.toLocaleString("en-IN");
  return `${symbol}${format(budgetMin)}–${format(budgetMax)}`;
}
