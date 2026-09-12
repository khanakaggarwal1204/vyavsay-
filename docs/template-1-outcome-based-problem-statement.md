# Template 1 — Outcome-Based Problem Statement

## The problem it fixes

A department may know that an operational process is failing but describe it as a complaint rather than a testable challenge. Startups then receive no stable scope, measurement plan, budget ceiling, or evidence standard against which to design a pilot.

## What the official experiences

The official completes five guided steps:

1. **Plain-language problem:** department, challenge title, sector, objective, beneficiaries, and the raw operational problem.
2. **Structured specification:** an editable technical requirement, measurable expected outcome, and constraints.
3. **Pilot and budget:** location, minimum and maximum INR budget, duration, submission deadline, and expected pilot start.
4. **Measurement plan:** primary KPI, baseline, target, unit, measurement method, evidence source, and target date.
5. **Author review:** a complete record preview before submission.

The browser keeps a user-scoped recovery copy. After the first meaningful entry, the backend creates a private versioned draft and serialises later autosaves so delayed requests cannot overwrite a newer version.

## How “Structure with AI” works

The React frontend sends the official's current draft to the Express backend. The browser never receives an API key or calls a model provider directly. The backend builds the prompt, calls the first configured provider, validates that the response contains a requirement, measurable outcome, and constraints, then records the input, output, provider, model, user, and timestamp.

Providers are tried in this order when configured: Gemini, Groq, Mistral, Together, and OpenRouter. If none returns valid structured output, a deterministic category-based drafting engine provides a fallback. The screen states whether a model or the deterministic fallback produced the draft. Every generated field remains editable.

## What deliberately does not use AI

The following controls are deterministic:

- Completeness and field validation.
- Budget bounds and date ordering.
- KPI baseline/target consistency.
- Record versions and access control.
- Review-state transitions.
- The rule that an author cannot review their own challenge.
- Publication eligibility.
- Procurement pathway selection; this is deferred to the separately reviewed Procurement Pathway Template.

These controls must return the same answer for the same record and cannot be delegated to a language model.

## Review and publication workflow

Submission begins with a hybrid automated pre-review. Fixed rules check required fields, measurable outcomes, positive budget ranges, date order, pilot duration, KPI evidence, exposed credentials or identifiers, prompt-injection text and mandatory named-brand wording. A configured LLM then checks language quality, consistency and possible competitive bias. AI findings are warnings only; they cannot approve, reject or override a fixed rule.

`Draft → Automated Pre-Review → Changes Requested / Manual Review / Ready for Confirmation → Approved → Published`

Blocking rule failures return the exact version for correction. Warnings or an unavailable or malformed AI response go to manual review. A clean report becomes Ready for Confirmation. A different authorised person must approve the exact content hash before publication. Editing a returned version invalidates its earlier report and approval.

The department author can edit Draft and Changes Requested records. A Platform Admin who is a different user records findings for warnings, or confirms a clean automated report. Only that approving reviewer can publish the exact approved version. Direct creation of an Applications Open challenge is disabled, closing the older publication bypass.

Draft, Under Review, Changes Requested, and Approved records remain private to the author and Platform Admin. Published records become visible to startups and are queued for startup-discovery indexing.

## How Template 1 connects to later features

The published record carries the structured requirement, sector, beneficiaries, location, budget range, dates, constraints, and primary KPI into the challenge record. Startup Discovery and Eligibility use the published challenge. Pilot Design and Performance Measurement can reuse the budget, duration, KPI, method, evidence source, and target date rather than asking the department to re-enter them.

Risk remains explicitly provisional until the Risk Management Template is completed and reviewed. No procurement route is inferred from budget or startup status; the Procurement Pathway Template and authorised officer remain responsible for that decision.

## What is genuinely built

- User-scoped local recovery and durable backend autosave.
- Version-checked saves.
- Optional live LLM structuring with validated JSON and provider fallbacks.
- Deterministic fallback structuring.
- Editable outputs and truthful engine disclosure.
- Structured budget, dates, and KPI fields.
- Independent review, correction, resubmission, approval, and publication controls.
- Self-review prevention and a closed direct-publication route.
- Time-stamped field snapshots in challenge history.
- Explainable automated review findings, safe AI-outage routing and content-hash binding.
- Connection to the published challenge used by discovery and eligibility.

## Remaining production work

The current challenge store and its history are JSON-backed prototype infrastructure. Production still requires a transactional managed database, independently retained audit checkpoints, verified government identity/MFA, retention rules for model logs, formal template governance, and authorised integrations for risk, procurement, e-signature, and government marketplaces.
