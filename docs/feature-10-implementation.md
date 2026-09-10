# Feature 10 — Evidence-based scale-up (local prototype)

## Start

Run `npm start --prefix backend` and `npm run dev --prefix frontend` from the cloned repository. The backend uses 127.0.0.1:4001; open the Vite URL. Select **Scale-Up**. Scale-Up has its own clearly labelled demo account selector.

## Explore the full workflow

1. In **Validation**, complete the chosen PRACTICE case, including both primary reviews for High risk and any selected re-audit. You can submit an expansion proposal before validation completes, but it will remain blocked.
2. In **Scale-Up**, select **Demo department · proposer** and the same PRACTICE case. Click **Fill synthetic expansion example**, inspect the scope/evidence, then **Submit for automatic assessment**. The example totals INR 220,000 over 12 months for 100 units at two synthetic depots.
3. If independent validation is eligible, the example produces a deterministic recommendation; otherwise the missing-evidence reasons are shown. Refresh after completing Feature 9, or allow the background worker to pick up the change.
4. Select **Demo department · finance**. Enter a meaningful findings statement, a funding approval reference and at least INR 220,000 approved funding. Confirm cost verification and no conflict. Approve.
5. Select **Demo department · procurement**. Enter findings and a procurement review reference. Confirm prerequisites are satisfied and declare no conflict. Approve.
6. Select **Demo department · authority**. Enter findings, declare no conflict, confirm the exact scope and select an expiry within the next 90 days. Approve. No role can skip the earlier stages or count the same person twice.
7. Once approved, the authority can **Record synthetic handover**. Synthetic cases never update actual pilot designs or initiate payments. Real local cases use an internal adapter to mark the linked field phase passed, activate live phase and record the exact approval scope only after current Feature 10 checks succeed.
8. Download a JSON report, or use **Print / save as PDF** for a browser printout. Draft reports are labelled non-authorised. The PDF is browser output, not a signed certificate.

Use **Oversight administrator · Read only** to inspect audit records across cases. Admin cannot approve expansion. Startups can inspect their cases but cannot propose or approve spending.

## Automation and scoring

Once a proposal is submitted, the backend automatically loads current Feature 9 eligibility, accepted independent KPI findings and the referenced evidence snapshot. Feature 9 in turn checks Feature 8 delivery/dispute context. The source adapter never trusts an old frontend badge or imported Paid claim.

The worker runs every minute and reconciles on requests. It creates one recommendation per proposal/input snapshot, records missing prerequisites, runs the fixed policy, identifies the next review stage, issues overdue/changed-approval/expiry notices, and retries queued handovers. No browser visit is needed to progress these jobs while the single local backend is running.

Prototype policy v1:

- Performance 40%: average capped baseline-to-target achievement from conservative independently checked values across approving validators. Mandatory failures block scoring.
- Deployment 25%: equal contributions from supported capacity versus proposed units and the share of evidenced locations marked ready. Incomplete capacity or location readiness prevents an expansion recommendation regardless of aggregate score.
- Sustainability 20%: capped ratio of evidenced baseline unit-month cost to estimated expansion unit-month cost. This is a narrow cost comparison, not a benefit-cost or ROI study. The UI exposes the assumptions.
- Risk controls 15%: share of security, continuity and data/IP controls with evidenced effective mitigations. Unresolved critical controls block scoring; unresolved noncritical controls prevent expansion approval.

80+ can recommend phased expansion within the assessed scope; 60–79 recommends an additional pilot; lower scores recommend redesign. Missing evidence yields a null score and insufficient evidence. Critical unresolved findings produce a blocked discontinue-review suggestion. No recommendation automatically cancels a contract or approves national rollout.

The rubric is a visible, versioned demo policy, not a statutory rule or validated predictive model. Policy changes require code review/version change; users cannot adjust weights per case through the API. Proposed risk/capacity facts require evidence and independent review; the system cannot itself establish their truth. Additional-pilot or redesign recommendations require a revised scoped proposal rather than permitting live expansion.

## Records, safeguards and endpoints

Immutable proposal versions, input snapshots, reviews and decisions persist in `backend/src/data/feature10.sqlite*` (ignored by Git). The source seed, Feature 8 obligations and Feature 9 decisions are not overwritten. Historical records remain; current applicability is computed against latest source data and the latest proposal.

API base `/api/scale-up`:

- `GET /accounts`, `POST /session`, `GET /`
- `POST /:caseId/submit`: new or revised proposal; requires expected proposal version.
- `POST /:caseId/reassess`: renewed assessment after expiry (material source changes are reconciled automatically).
- `POST /:caseId/review`: finance, procurement and authority stages, with strict ordering.
- `POST /:caseId/activate`: authority-only request for the exact approved scope; no custom scope accepted here.
- `GET /:caseId/export`: permission-checked JSON report, labelled draft or local demo approval.

All workflow mutations require a demo session and Idempotency-Key. Same key/different input fails. Review actions bind recommendation ID and input hash, recheck current state, require reason and conflict declaration, and execute transactionally. A browser retry after uncertain network failure retains the original request key.

Finance verifies costs and funding that covers the entire ceiling. Procurement records its review reference and prerequisite confirmation. The departmental authority confirms scope and expiry. Proposer, finance, procurement and authority have distinct simulated person IDs. Admin is read-only. Actors are filtered by organisation; the current authority is rechecked at handover.

The backend's legacy pilot-design advance route cannot enter Live Rollout anymore. It directs callers to the authorised Scale-Up handover endpoint. This replaces Feature 9 eligibility as sufficient authorisation for that transition.

Handover uses a persisted queue. Before dispatch it rechecks current validation/decision eligibility, authority, scope and expiry. The local adapter records a handoff ID on the pilot design so replay after a crash is idempotent. Adapter errors remain queued for retry. Changed authorisation blocks the queued request. A blocked request requires a new applicable decision rather than silently executing after conditions change.

New proposal scope or changed validation input makes earlier approvals stale. Unpaid invoices alone do not reduce scores or block validation; Feature 9's current conservative open-dispute gate is respected. Expired approvals require renewed review. Revised proposals cannot reuse previous signatures. Expanding a scope never raises an existing payment obligation.

## Limits and production work

This is local demo infrastructure: selectable accounts, simulated delegations, no external identity registry, no government procurement integration and no real payment. A financial reference is entered and reviewed; available public funds are not verified live. Production must connect authenticated authorities, legal/procurement policy, verified conflict/person registries and funding updates/withdrawals.

No AI API key or external AI call is added. Deterministic summaries remain available without a provider; AI summary status is explicitly disabled. JSON export and browser print are implemented; signed reports and dedicated Word/PDF generation are not included.

Each feature has its own append-only hash chain with explicit cross-feature snapshot references. These are not represented as one continuous chain. Database triggers and immutable copies prevent ordinary application edits; externally retained checkpoints, database-role separation and backups are needed against privileged machine/database owners. No 90% or zero-collusion guarantee is claimed.

The rollout adapter and original upstream JSON store assume a single local backend process. A production deployment needs transactional database state, durable queue claiming and managed workers. A later stale decision blocks new handovers; it does not automatically undo a deployment already started. Post-deployment monitoring, suspension and revocation require explicit operational workflows.

Tests: `npm test --prefix backend`. Build: `npm run build --prefix frontend`. Features 8 and 9 remain in the regression suite.
