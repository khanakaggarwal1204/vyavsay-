import { CATALOG, IP_OPTIONS } from "./catalog.js";

const escape = (value) =>
  String(value ?? "Not recorded").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const section = (title, value) =>
  `<section><h2>${escape(title)}</h2><p>${escape(value)}</p></section>`;

export function renderTemplateDocument(record) {
  const definition = CATALOG.find((t) => t.id === record.templateId);
  const source = record.source;
  const rows = definition.fields
    .map((field) => {
      const answer = record.answers[field.key];
      return section(
        field.label,
        field.key === "ipOption"
          ? IP_OPTIONS.find((o) => o.id === answer)?.label
          : answer,
      );
    })
    .join("");
  const result = record.result;
  const assessment = result
    ? section(
        "Assessment status",
        result.level || result.status || result.risk,
      ) +
      (result.clause ? section("Selected clause", result.clause) : "") +
      [...(result.reasons || []), ...(result.mitigations || [])]
        .map((v) => section("Finding / mitigation", v))
        .join("") +
      (result.categories
        ? `<table><thead><tr><th>Criterion</th><th>Weight</th><th>Score (0-10)</th></tr></thead><tbody>${result.categories.map((c) => `<tr><td>${escape(c.label)}</td><td>${escape(result.weights[c.key])}%</td><td>________</td></tr>`).join("")}</tbody></table>`
        : "") +
      (result.matches || [])
        .map((p) =>
          section(
            "Suggested pathway",
            `${p.name}\nSource: ${p.source}\nReviewed by: ${p.reviewedBy}\nEffective: ${p.effectiveFrom} to ${p.effectiveUntil}`,
          ),
        )
        .join("")
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vyavsay - ${escape(definition.name)}</title><style>body{font:14px/1.6 Arial,sans-serif;color:#173349;max-width:850px;margin:40px auto;padding:0 24px}h1{font-size:26px}h2{font-size:15px;margin-bottom:5px}section{border-top:1px solid #dce5e9;margin-top:18px}p{white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{padding:10px;text-align:left;border:1px solid #dce5e9}.notice{border-left:3px solid #a35429;padding-left:12px}@media print{body{margin:0}section,tr{break-inside:avoid}}</style></head><body><header><strong>VYAVSAY</strong><h1>${escape(definition.name)}</h1><p>Record ${escape(record.id)} | Template v${record.templateVersion} | Revision ${record.version}<br>Status: ${escape(record.status)}${record.stale ? " | SOURCE CHANGED" : ""}</p></header><p class="notice">Review copy. This document is not a signed agreement, legal clearance, procurement authorisation or security certification.</p>${source.challenge ? section("Challenge / department", `${source.challenge.title}\n${source.challenge.dept}`) : ""}${source.startup ? section("Startup", source.startup.name) : ""}${source.contract ? section("Existing contract", `Reference: ${source.contract.id}\nBudget: INR ${source.contract.budgetAmount}\nDuration: ${source.contract.durationMonths} months\nEvaluation score: ${source.evaluationScore ?? "Not recorded"}`) + source.contract.milestones.map((m) => section(m.name, `${m.percentage}% | INR ${m.amount} | Due: ${m.dueDate}`)).join("") : ""}${rows}${assessment}${record.evidence.map((e) => section(`Evidence: ${e.control}`, `${e.name}\nDigest: ${e.hash}\nUploaded: ${e.at}`)).join("")}${record.review ? section("Review findings", `${record.review.reason}\nReviewer: ${record.review.actorId}\nDate: ${record.review.at}${record.review.validUntil ? "\nValid until: " + record.review.validUntil : ""}`) : ""}<footer><p>Updated: ${escape(record.updatedAt)}. Any material revision requires a new review.</p></footer></body></html>`;
}
