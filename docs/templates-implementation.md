# Standard Templates

## Scope

The Templates workspace replaces the previous static library. Seven versioned definitions drive the server validation and frontend fields. Express and the existing React/Vite frontend remain unchanged as the stack; no runtime dependencies were added.

- Problem statement (Template v2): the shared challenge schema captures the department, plain-language problem, editable technical requirement, measurable outcome, constraints, bounded budget, pilot dates, and a primary KPI with its baseline, target, method, evidence source, and target date. Submission validation, independent review, corrections, and publication are enforced. Linked existing challenges are snapshotted, not silently overwritten. Published problem records are immutable.
- Evaluation: the existing `evaluation.js` categories and risk-adjusted weights are reused. Scoring remains in Evaluations; this library supplies the same reusable scoring sheet, not a competing scoring engine.
- Pilot agreement: requires a real linked contract; snapshots its startup, challenge, evaluation score, duration, scope and milestone amounts. Editable acceptance/payment terms and IP selection require review. No signatures or legal clearance are implied.
- Data/IP: three standard ownership options and a mandatory data schedule.
- Cybersecurity: PDF/text evidence for encryption, hosting/data handling and certifications/security assessment; independently reviewed with an expiry. Missing, expired, revised or stale evidence blocks sandbox-to-field advancement and the live scale-up handoff adapter.
- Risk: deterministic questionnaire-based level, reasons and mitigations. Incomplete questionnaires do not produce a reassuring Low rating. This is decision support; it does not silently change existing challenge evaluation weights mid-competition.
- Procurement: suggestions use explicitly configured, reviewed, date-bounded rules. Without matching rules, officer review is required. There is no hardcoded fast-track route for an INR 8 lakh purchase.

## API

All paths below are under `/api/templates`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/accounts` | Local demo account registry; empty in production |
| POST / DELETE | `/session` | Local demo login / logout |
| GET | `/` | Scoped catalogue, linked sources, records |
| POST | `/records` | Create a draft |
| POST | `/records/:id/save` | Validate and save answers |
| POST | `/records/:id/submit` | Enforce completeness and source currency |
| POST | `/records/:id/review` | Independent review, findings, evidence expiry |
| POST | `/records/:id/revise` | Reopen, invalidating previous approval |
| POST | `/records/:id/refresh-source` | Refresh linked snapshot, invalidate old evidence |
| POST | `/records/:id/evidence/upload` | Validate/store evidence, maximum 1 MB |
| GET | `/records/:id/evidence/:evidenceId` | Authorised attachment-only download |
| POST | `/records/:id/publish/challenge` | Publish an approved new problem |
| GET | `/records/:id/history` | Append-only revision history |
| GET | `/records/:id/export` | Complete JSON record and history |
| GET | `/records/:id/document` | Escaped, printable HTML review document |

Record mutations require `Idempotency-Key` (8-100 letters, numbers, underscores or hyphens). Updates also require `expectedVersion`. Reusing a key with changed input returns 409; retrying the same request does not duplicate records. The frontend retains the key after network failure. Draft saves allow missing fields; submission does not.

## Persistence and integration

`backend/src/data/templates.sqlite` is created automatically, using the repository's existing Node 24 SQLite convention. It contains record state, idempotency commands, append-only history, evidence blobs and local sessions. Transactions roll back together. No migration of existing source records is necessary. Existing JSON challenge records receive additional template provenance and structured fields only when a new reviewed problem is published.

The challenge JSON store and template SQLite store cannot commit atomically together. Publication uses a stable challenge ID and reconciles an interrupted retry to avoid duplicate publication. Back up the JSON source and SQLite database together. Use SQLite's supported backup procedure, rather than copying only the database file while WAL writes are active.

## Identity and security boundaries

The repository currently has no production-wide identity provider. This implementation reuses the newer workspaces' local demo account registry and server-side HttpOnly/SameSite session pattern. The global UI role selector does not authorise template actions. Authors are department-scoped; startups only edit their own cybersecurity records; reviewers cannot review their own person identity; administrators are read-only.

With `NODE_ENV=production`, demo impersonation is disabled and template access fails closed. Deployment requires supplying a trusted `resolveActor(req)` integration to `createTemplateService`, with server-verified `id`, `personId`, `role` and `organisationId` matching the department registry. Do not derive those from unverified headers or request bodies. Existing legacy routes outside this feature still need application-wide authentication before public deployment.

Evidence is size/type checked, downloaded as an attachment with restrictive CSP, and never rendered inline. This is not malware scanning or automated verification of certificate authenticity. Reviewers must inspect actual evidence against applicable requirements. Production deployment also needs retention/backup policy, malware scanning, storage access controls, HTTPS and monitoring. No real citizen data is granted or transferred by this app.

## Procurement configuration

Set `VYAVSAY_PROCUREMENT_RULES` to an absolute JSON file containing an array. Each reviewed rule needs:

```json
{
  "id": "internal-policy-reference",
  "name": "Reviewed pathway name",
  "jurisdiction": "Exact applicable jurisdiction",
  "source": "https://official-source.example/policy",
  "reviewedBy": "Authorised procurement reviewer reference",
  "minValue": 0,
  "maxValue": 100000,
  "urgency": ["routine"],
  "vendorRelationship": ["new", "repeat"],
  "effectiveFrom": "2026-01-01",
  "effectiveUntil": "2026-12-31"
}
```

This is a schema example, not a real policy or legal threshold. Replace every value using authorised legal/procurement review. Matching considers all configured criteria; multiple matches remain suggestions for a human decision. Missing configuration is supported. Malformed configuration fails at startup.

## Run and verify

Node 24 or newer is required.

```sh
cd ~/Documents/Vyavsay/backend
npm install
npm test
npm start
```

In a second terminal:

```sh
cd ~/Documents/Vyavsay/frontend
npm install
npm run dev
```

Open Vite's printed URL, enter Templates, and select a local account. Create/save/submit as the department author, then select that department's reviewer and record findings. Startups can prepare their own security checklist. After approval, a new problem can be published by its author. A printable HTML download can be opened and printed to PDF by the browser.

For an alternate backend port, start with `PORT=4012 npm start` and the frontend with `VITE_API_URL=http://127.0.0.1:4012 npm run dev -- --port 5177`. Production hosting must proxy `/api` to the backend. `VITE_API_URL` configures the development proxy, not a browser-side secret or authentication bypass.

Tests cover schema validation, all seven library outputs, source prefill, scope isolation, independent review, version/idempotency conflicts, evidence gating/expiry/downloads, stale source, publication, persistent restart, transaction rollback, production fail-closed behaviour and safe exports. No lint/typecheck script exists in the repository; frontend compilation uses `npm run build`.
