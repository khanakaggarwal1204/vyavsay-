# Vyavsay

A government ↔ startup innovation-procurement platform: departments publish
challenges, startups apply, and the platform carries each application through
eligibility screening, expert evaluation, pilots, contracting, payments, and
scale-up.

This repo has two parts:

- `frontend/` — React + Vite UI
- `backend/` — Express API that powers **Challenge Identification**,
  **AI Startup Discovery**, **Auto-Eligibility Screening**, and **Expert
  Evaluation** (the rest of the UI is still a static demo)

## Running it locally

You need two terminals — the backend and the frontend run separately.

**1. Backend (Express API, port 4000)**

```bash
cd backend
npm install
npm start
```

You should see `Vyavsay backend listening on http://localhost:4000`.
Data is stored in `backend/src/data/store.json`, which is created from
`seed.json` on first run. Delete `store.json` (or `POST /api/admin/reset`) to
reset the demo data at any time.

**2. Frontend (Vite dev server, port 5173)**

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. In dev, Vite proxies any `/api/*` request to
`http://localhost:4000` (see `frontend/vite.config.js`) — no extra
configuration needed. If your backend runs somewhere else, set `VITE_API_URL`
before starting Vite, e.g. `VITE_API_URL=http://localhost:5000 npm run dev`.

## The AI-backed features

**Challenge Identification** — in Challenges → Create Challenge, capture the
department, title, objective, beneficiaries and raw problem in plain language,
then click **Structure with AI**. It calls
`POST /api/requirements/structure`, which uses a backend-only LLM (Gemini,
Groq, or OpenRouter when configured) to create an editable drafting suggestion,
validates the JSON response, logs the request and result, and falls back to a
controlled rules engine when a provider is unavailable. It never publishes on
its own; it turns free text into an editable Requirement, measurable Expected Outcome,
Constraints, a challenge theme, and a list of concrete capabilities — e.g. "Our files frequently get
lost during inter-department transfers" becomes "A secure digital
document-tracking system with immutable audit trails and role-based access."
The browser keeps a local recovery copy while the backend autosaves a durable
private draft and time-stamped audit history. A draft progresses through
**Draft → Under Review → Published**. The author edits and submits it for
review; a Platform Admin must explicitly publish it before startups can see it.

### Challenge-structuring providers

All keys are server-only Render environment variables; never add them to the
frontend or commit them to Git. The provider order is **Gemini → Groq → Mistral
→ Together → OpenRouter's model fallback chain → deterministic rules engine**.
Unset keys are skipped.

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Primary structured drafting provider. |
| `GROQ_API_KEY` | Fast direct fallback. |
| `MISTRAL_API_KEY` | Optional direct fallback. |
| `TOGETHER_API_KEY` | Optional direct fallback. |
| `OPENROUTER_API_KEY` | One key for OpenRouter's multi-model fallback request. |
| `STRUCTURING_OPENROUTER_MODELS` | Optional comma-separated priority list. Defaults to Gemini Flash, GPT-OSS 20B, then Llama 3.3 70B. |

The deterministic rules engine is intentionally last: it maintains a useful,
auditable drafting flow during provider outages or rate limits.
The structuring engine is drafting support only and never makes a final
procurement decision.

Open any challenge (Challenges → click a row) to see the other two:

- **AI Startup Discovery** tab — calls `GET /api/challenges/:id/discovery`.
  Scores every startup in the database against the challenge's sector/theme,
  past government-pilot experience, and technology readiness, then shows the
  shortlist. "Invite to apply" on a card calls
  `POST /api/challenges/:id/applications` and creates a real application.

- **Eligibility Screening** tab — calls `GET /api/challenges/:id/applications`.
  Every application is run through a rule engine
  (`backend/src/eligibility.js`) checking registration, DPIIT/experience
  relaxation, and — for Medium/High-risk challenges — a mandatory ISO 27001
  security certification. A failed mandatory rule auto-rejects the
  application before it reaches an evaluator.

- **Expert Evaluation** tab — a fixed scoring rubric (innovation,
  feasibility, cost, security, scalability) that every evaluator scores a
  startup against on a 0–10 scale. The category weightings shift
  automatically based on the challenge's risk profile
  (`backend/src/evaluation.js`), and every submission's weighted total and
  the resulting startup ranking are computed server-side — never left to one
  reviewer's personal judgement. Calls `GET /api/challenges/:id/rubric` for
  the weightings, `GET /api/challenges/:id/evaluations` for existing scores +
  ranking, and `POST /api/challenges/:id/evaluations` to submit a new score.

### API reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/startups` | List all startups |
| GET | `/api/challenges` | List all challenges |
| GET | `/api/challenges/:id` | Get one challenge |
| POST | `/api/requirements/structure` | Body containing the challenge fields — creates an auditable LLM drafting suggestion with Requirement, Expected Outcome and Constraints, with a deterministic fallback. |
| POST | `/api/challenge-drafts` | Creates a private, autosaved Draft owned by the signed-in department user. |
| PATCH | `/api/challenge-drafts/:id` | Saves an editable Draft and appends an audit-history event. |
| POST | `/api/challenge-drafts/:id/submit` | Validates all required fields and moves a Draft to Under Review. |
| POST | `/api/challenge-drafts/:id/publish` | Platform Admin only: publishes an approved review record for startup visibility. |
| POST | `/api/challenges` | Body `{ title, dept, budget, risk, theme, requirementStatement, capabilities, deadline, location }` — publish a new challenge |
| GET | `/api/challenges/:id/discovery` | AI-matched, sorted startup shortlist |
| GET | `/api/challenges/:id/applications` | Applications + live eligibility verdicts |
| POST | `/api/challenges/:id/applications` | Body `{ "startupId": "st_..." }` — submit/invite, runs eligibility immediately |
| GET | `/api/challenges/:id/rubric` | Risk-adjusted scoring-rubric weights for the challenge |
| GET | `/api/challenges/:id/evaluations` | Rubric weights + all submitted evaluations + auto-ranked startups |
| POST | `/api/challenges/:id/evaluations` | Body `{ startupId, evaluatorName, scores: { innovation, feasibility, cost, security, scalability } }` (each 0–10) — submits a score, auto-computes the weighted total |
| POST | `/api/admin/reset` | Reset demo data back to the seed |

## Startup data: real vs. demo

`backend/src/data/seed.json` mixes two kinds of records, distinguished by a
`source` field on each startup:

- `"source": "DPIIT Startup India (real)"` — genuine, DPIIT-recognised
  companies with real names, CINs, and sectors, pulled from the public
  "State and City wise list of Start-ups Recognised by DPIIT" dataset. The UI
  shows these with a **DPIIT VERIFIED** badge and, where known, their CIN and
  website.
- `"source": "Demo placeholder"` — fictional companies kept around because
  they exercise every rule in the eligibility/matching engines on purpose
  (e.g. one with no ISO 27001 cert, one that isn't DPIIT-recognised, one
  incorporated 11 years ago) — useful for demos, but not real.

**What the public dataset does and doesn't give you.** It has real company
names, legal names, CINs, websites, states/cities, and DPIIT-assigned
industry/sector labels. It does **not** track certifications, past
government-pilot counts, or a technology-readiness level (TRL) — no public
registry tracks those, since they're self-declared info a real platform
collects when a startup signs up. Imported real startups get safe defaults
(`certifications: []`, `pilots: 0`, `trl: "Not yet assessed"`) that a
department or the startup itself would fill in for real.

### Importing more real startups

1. Get a CSV export of the DPIIT startup registry — e.g. create a free
   account at [dataful.in/datasets/20873](https://dataful.in/datasets/20873),
   or search the current [data.gov.in](https://www.data.gov.in) Open
   Government Data catalog for "DPIIT Recognized Startups". Expected columns:
   `state, city, company_name, legal_name, cin, company_website,
   company_status, focus_industry, focus_sector, services_provided`.
2. Run the import script:
   ```bash
   cd backend
   npm run import:dpiit -- /path/to/dpiit-startups.csv
   # or limit how many rows to pull in:
   npm run import:dpiit -- /path/to/dpiit-startups.csv --limit 50
   ```
   This appends new entries to `seed.json`, auto-mapping each company's
   `focus_industry`/`focus_sector` to the platform's challenge themes
   (AgriTech, HealthTech, Mobility, CleanTech, EdTech) and tags (AI/ML, IoT,
   Marketplace, Analytics), and computing years-active from the CIN's
   embedded incorporation year.
3. Delete `backend/src/data/store.json` (or `POST /api/admin/reset`) so the
   backend picks up the updated seed on next start.
