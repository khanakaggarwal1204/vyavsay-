import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { departmentId, hash } from "../validation/source.js";
import { accounts as scaleUpAccounts } from "../scaleup/domain.js";
import {
  CATALOG,
  CONTROLS,
  IP_OPTIONS,
  validateAnswers,
  resultFor,
} from "./catalog.js";
import { createTemplateStore } from "./store.js";
import { renderTemplateDocument } from "./document.js";

const check = (ok, message, status = 409) => {
  if (!ok) throw Object.assign(new Error(message), { status });
};
const text = (v, label, min = 1, max = 5000) => {
  check(
    typeof v === "string" && v.trim().length >= min && v.length <= max,
    `${label} must contain ${min}-${max} characters.`,
    422,
  );
  return v.trim();
};
export function templateAccounts(source) {
  return scaleUpAccounts(source)
    .filter(
      (a) =>
        !["demo-department", "demo-startup"].includes(a.organisationId) &&
        ["proposer", "procurement", "startup", "admin"].includes(a.role),
    )
    .map((a) => ({
      ...a,
      role:
        a.role === "proposer"
          ? "author"
          : a.role === "procurement"
            ? "reviewer"
            : a.role,
      name: a.name
        .replace("proposer", "Template author")
        .replace("procurement", "Template reviewer"),
    }));
}
const template = (id) => CATALOG.find((t) => t.id === id);
const canSee = (actor, r) =>
  actor.role === "admin" ||
  (actor.role === "startup"
    ? actor.organisationId === r.startupId
    : actor.organisationId === r.organisationId);
const canEdit = (actor, r) =>
  canSee(actor, r) &&
  (actor.role === "author" ||
    (actor.role === "startup" && r.templateId === "cybersecurity"));

function sourceFor(db, challengeId, startupId, contractId) {
  const challenge = (db.challenges || []).find((c) => c.id === challengeId);
  check(challenge, "Challenge not found.", 404);
  const startup = startupId
    ? (db.startups || []).find((s) => s.id === startupId)
    : null;
  check(!startupId || startup, "Startup not found.", 404);
  const contract = contractId
    ? (db.contracts || []).find(
        (c) =>
          c.id === contractId &&
          c.challengeId === challengeId &&
          c.startupId === startupId,
      )
    : null;
  check(
    !contractId || contract,
    "Contract does not match this challenge and startup.",
    422,
  );
  const design = (db.pilotDesigns || []).find(
    (p) => p.challengeId === challengeId && p.startupId === startupId,
  );
  const scores = (db.evaluations || []).filter(
    (e) => e.challengeId === challengeId && e.startupId === startupId,
  );
  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      dept: challenge.dept,
      theme: challenge.theme,
      risk: challenge.risk,
      budget: challenge.budget,
      deadline: challenge.deadline,
      requirementStatement: challenge.requirementStatement || null,
    },
    startup: startup ? { id: startup.id, name: startup.name } : null,
    contract: contract
      ? {
          id: contract.id,
          budgetAmount: contract.budgetAmount,
          durationMonths: contract.durationMonths,
          milestones: contract.milestones.map(
            ({ id, name, amount, percentage, dueDate }) => ({
              id,
              name,
              amount,
              percentage,
              dueDate,
            }),
          ),
        }
      : null,
    pilot: design
      ? {
          id: design.id,
          scopeLabel: design.scopeLabel,
          durationMonths: design.durationMonths,
        }
      : null,
    evaluationScore: scores.length
      ? Math.round(
          (scores.reduce((sum, e) => sum + e.total, 0) / scores.length) * 10,
        ) / 10
      : null,
  };
}
function stale(r, db) {
  if (!r.challengeId) return false;
  try {
    return (
      hash(sourceFor(db, r.challengeId, r.startupId, r.contractId)) !==
      r.sourceHash
    );
  } catch {
    return true;
  }
}
function loadPolicies(filename) {
  if (!filename) return [];
  const rules = JSON.parse(fs.readFileSync(filename, "utf8"));
  check(
    Array.isArray(rules) && rules.length <= 1000,
    "Procurement rules must be an array.",
    422,
  );
  const ids = new Set();
  for (const p of rules) {
    check(p && typeof p === "object", "Invalid procurement rule.", 422);
    for (const key of ["id", "name", "jurisdiction", "source", "reviewedBy"])
      text(p[key], `Policy ${key}`);
    check(!ids.has(p.id), "Duplicate procurement policy ID.", 422);
    ids.add(p.id);
    check(
      /^https:\/\//.test(p.source) &&
        Number.isSafeInteger(p.minValue) &&
        Number.isSafeInteger(p.maxValue) &&
        p.minValue >= 0 &&
        p.maxValue >= p.minValue,
      "Invalid procurement policy bounds/source.",
      422,
    );
    check(
      Array.isArray(p.urgency) &&
        p.urgency.length &&
        p.urgency.every((x) => ["routine", "urgent"].includes(x)) &&
        Array.isArray(p.vendorRelationship) &&
        p.vendorRelationship.length &&
        p.vendorRelationship.every((x) => ["new", "repeat"].includes(x)),
      "Invalid procurement applicability.",
      422,
    );
    check(
      [p.effectiveFrom, p.effectiveUntil].every(
        (d) =>
          typeof d === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(d) &&
          Number.isFinite(Date.parse(d)) &&
          new Date(d).toISOString().slice(0, 10) === d,
      ) && p.effectiveFrom <= p.effectiveUntil,
      "Invalid procurement policy dates.",
      422,
    );
  }
  return rules;
}

export function createTemplateService({
  readSource,
  writeSource,
  filename,
  now = () => new Date().toISOString(),
  policyFile = process.env.VYAVSAY_PROCUREMENT_RULES,
  resolveActor,
  demo = process.env.NODE_ENV !== "production",
} = {}) {
  const policies = loadPolicies(policyFile),
    store = createTemplateStore(filename),
    router = Router();
  const tokenOf = (req) =>
    (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("vyavsay_templates="))
      ?.slice("vyavsay_templates=".length);
  const safe = (fn) => (req, res, next) => {
    try {
      fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  const project = (r, db) => ({
    ...r,
    stale: stale(r, db),
    result: resultFor(r, policies, now()),
    canEdit: undefined,
  });
  const get = (state, id, actor) => {
    const r = state.records.find((r) => r.id === id);
    check(r && canSee(actor, r), "Template record not found.", 404);
    return r;
  };
  const recordEvent = (tx, r, actor, action) =>
    tx.append({
      action,
      actorId: actor.id,
      at: now(),
      record: structuredClone(r),
    });

  router.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const origin = req.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        const allowed = demo
          ? ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
          : url.host === req.get("host");
        if (!allowed)
          return res
            .status(403)
            .json({ error: "Cross-origin template request denied." });
      } catch {
        return res.status(403).json({ error: "Invalid origin." });
      }
    }
    if (req.get("sec-fetch-site") === "cross-site")
      return res.status(403).json({ error: "Cross-site request denied." });
    next();
  });
  router.get(
    "/accounts",
    safe((_req, res) =>
      res.json({
        mode: demo ? "local-demo" : "authenticated",
        accounts: demo ? templateAccounts(readSource()) : [],
      }),
    ),
  );
  router.post(
    "/session",
    safe((req, res) => {
      check(demo, "Demo account selection is disabled.", 403);
      const actor = templateAccounts(readSource()).find(
        (a) => a.id === req.body?.accountId,
      );
      check(actor, "Choose a listed template account.", 422);
      const token = randomUUID();
      store.session(token, actor.id);
      res.cookie("vyavsay_templates", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 28800000,
        path: "/api/templates",
      });
      res.json({ actor });
    }),
  );
  router.delete(
    "/session",
    safe((req, res) => {
      store.logout(tokenOf(req));
      res.clearCookie("vyavsay_templates", { path: "/api/templates" });
      res.json({ ok: true });
    }),
  );
  // Authentication is resolved on the server. UI role selectors are never trusted.
  router.use((req, res, next) => {
    try {
      const actor = resolveActor
        ? resolveActor(req)
        : demo
          ? templateAccounts(readSource()).find(
              (a) => a.id === store.actor(tokenOf(req)),
            )
          : null;
      check(
        actor &&
          ["author", "startup", "reviewer", "admin"].includes(actor.role) &&
          actor.id &&
          actor.organisationId,
        "Sign in to the Templates workspace.",
        401,
      );
      req.actor = actor;
      next();
    } catch (e) {
      next(e);
    }
  });
  router.get(
    "/",
    safe((req, res) => {
      const db = readSource(),
        actor = req.actor;
      const challenges = (db.challenges || []).filter(
        (c) =>
          actor.role === "admin" ||
          actor.role === "startup" ||
          departmentId(c.dept) === actor.organisationId,
      );
      res.json({
        actor,
        catalog: CATALOG,
        controls: CONTROLS,
        ipOptions: IP_OPTIONS,
        challenges,
        startups:
          actor.role === "startup"
            ? (db.startups || [])
                .filter((s) => s.id === actor.organisationId)
                .map(({ id, name }) => ({ id, name }))
            : (db.startups || []).map(({ id, name }) => ({ id, name })),
        contracts: (db.contracts || [])
          .filter(
            (c) =>
              challenges.some((ch) => ch.id === c.challengeId) &&
              (actor.role !== "startup" ||
                c.startupId === actor.organisationId),
          )
          .map(
            ({ id, challengeId, startupId, budgetAmount, durationMonths }) => ({
              id,
              challengeId,
              startupId,
              budgetAmount,
              durationMonths,
            }),
          ),
        records: store
          .read()
          .records.filter((r) => canSee(actor, r))
          .map((r) => project(r, db)),
        mode: demo ? "local-demo" : "authenticated",
      });
    }),
  );

  function mutate(req, res, action) {
    const key = req.get("Idempotency-Key");
    check(
      typeof key === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(key),
      "A valid idempotency key is required.",
      422,
    );
    const requestHash = hash({
        path: req.path,
        body: req.body,
        method: req.method,
      }),
      identity = req.actor.id + ":" + key;
    const db = readSource();
    const id = store.transaction((state, tx) => {
      const prior = state.commands.find((c) => c.identity === identity);
      if (prior) {
        check(
          prior.hash === requestHash,
          "Request key already used with different data.",
        );
        get(state, prior.id, req.actor);
        return prior.id;
      }
      const r = action(state, tx, db);
      state.commands.push({ identity, hash: requestHash, id: r.id });
      return r.id;
    });
    res.json(project(get(store.read(), id, req.actor), db));
  }
  router.post(
    "/records",
    safe((req, res) =>
      mutate(req, res, (state, tx, db) => {
        const body = req.body || {},
          t = template(body.templateId);
        check(t, "Unknown template.", 422);
        check(
          req.actor.role === "author" ||
            (req.actor.role === "startup" && t.id === "cybersecurity"),
          "This account cannot create this template.",
          403,
        );
        const challengeId = body.challengeId || null,
          startupId = t.startup ? body.startupId : null,
          contractId = t.id === "agreement" ? body.contractId : null;
        check(challengeId || t.id === "problem", "Select a challenge.", 422);
        check(
          !t.startup || typeof startupId === "string",
          "Select a startup.",
          422,
        );
        check(
          t.id !== "agreement" || typeof contractId === "string",
          "Select an existing pilot contract.",
          422,
        );
        const source = challengeId
          ? sourceFor(db, challengeId, startupId, contractId)
          : { challenge: null };
        const organisationId = source.challenge
          ? departmentId(source.challenge.dept)
          : req.actor.organisationId;
        check(
          req.actor.role === "startup"
            ? startupId === req.actor.organisationId
            : organisationId === req.actor.organisationId,
          "Challenge is outside your department.",
          403,
        );
        check(
          !state.records.some(
            (r) =>
              r.templateId === t.id &&
              r.challengeId === challengeId &&
              r.startupId === startupId &&
              r.contractId === contractId &&
              challengeId,
          ),
          "A record already exists. Open it to continue or revise.",
        );
        const c = source.challenge;
        let answers = {};
        if (t.id === "problem" && c)
          answers = {
            title: c.title,
            sector: c.theme,
            ...(c.requirementStatement
              ? { painPoint: c.requirementStatement }
              : {}),
          };
        if (["agreement", "data-ip"].includes(t.id))
          answers.ipOption = IP_OPTIONS[0].id;
        if (t.id === "agreement" && source.pilot)
          answers.scope = source.pilot.scopeLabel;
        const r = {
          id: randomUUID(),
          templateId: t.id,
          templateVersion: t.version,
          challengeId,
          startupId,
          contractId,
          organisationId,
          createdBy: req.actor.id,
          createdByPersonId: req.actor.personId || req.actor.id,
          source,
          sourceHash: hash(source),
          answers,
          evidence: [],
          status: "draft",
          version: 1,
          createdAt: now(),
          updatedAt: now(),
          review: null,
        };
        state.records.push(r);
        recordEvent(tx, r, req.actor, "created");
        return r;
      }),
    ),
  );
  router.post(
    "/records/:id/:action",
    safe((req, res) =>
      mutate(req, res, (state, tx, db) => {
        const r = get(state, req.params.id, req.actor),
          body = req.body || {},
          action = req.params.action,
          t = template(r.templateId);
        check(
          Number.isInteger(body.expectedVersion) &&
            body.expectedVersion === r.version,
          "This record changed. Refresh before trying again.",
        );
        if (action === "review") {
          check(
            req.actor.role === "reviewer" &&
              req.actor.organisationId === r.organisationId &&
              req.actor.id !== r.createdBy &&
              (req.actor.personId || req.actor.id) !==
                (r.createdByPersonId || r.createdBy),
            "An independent department reviewer is required.",
            403,
          );
          check(
            r.status === "submitted" && !stale(r, db),
            "Submit current source data for review first.",
          );
          check(
            ["approved", "changes_requested"].includes(body.decision),
            "Invalid review decision.",
            422,
          );
          const reason = text(body.reason, "Review findings", 15);
          if (
            r.templateId === "cybersecurity" &&
            body.decision === "approved"
          ) {
            check(
              Array.isArray(body.checkedEvidence) &&
                CONTROLS.every((c) =>
                  r.evidence.some(
                    (e) =>
                      e.control === c.key &&
                      body.checkedEvidence.includes(e.id),
                  ),
                ),
              "Review the evidence for every security control.",
              422,
            );
            check(
              typeof body.validUntil === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(body.validUntil) &&
                Number.isFinite(Date.parse(body.validUntil)) &&
                new Date(body.validUntil).toISOString().slice(0, 10) ===
                  body.validUntil &&
                body.validUntil >= now().slice(0, 10) &&
                Date.parse(body.validUntil) <=
                  Date.parse(now()) + 366 * 86400000,
              "Security review expiry must be within the next year.",
              422,
            );
          }
          r.status = body.decision;
          r.review = {
            actorId: req.actor.id,
            reason,
            at: now(),
            validUntil: body.validUntil || null,
            evidenceIds: r.evidence.map((e) => e.id),
            sourceHash: r.sourceHash,
          };
        } else {
          check(
            canEdit(req.actor, r),
            "This account cannot edit this record.",
            403,
          );
          if (action === "revise") {
            check(
              !r.publishedChallengeId,
              "Published problem records are immutable. Create a new record for a new challenge.",
            );
            check(
              ["approved", "changes_requested", "submitted"].includes(r.status),
              "Only a submitted or reviewed record can be revised.",
            );
            r.status = "draft";
            r.review = null;
          } else {
            check(
              r.status === "draft",
              "Create a revision before editing a submitted record.",
            );
            if (action === "save") r.answers = validateAnswers(t, body.answers);
            else if (action === "refresh-source") {
              check(r.challengeId, "No linked challenge to refresh.", 422);
              r.source = sourceFor(
                db,
                r.challengeId,
                r.startupId,
                r.contractId,
              );
              r.sourceHash = hash(r.source);
              r.evidence = [];
            } else if (action === "submit") {
              validateAnswers(t, r.answers, true);
              check(
                !stale(r, db),
                "Source details changed. Refresh source and recheck your answers.",
              );
              if (t.id === "cybersecurity")
                check(
                  CONTROLS.every((c) =>
                    r.evidence.some((e) => e.control === c.key),
                  ),
                  "Upload evidence for all security controls.",
                  422,
                );
              r.status = "submitted";
            } else check(false, "Unknown template action.", 404);
          }
        }
        r.version++;
        r.updatedAt = now();
        recordEvent(tx, r, req.actor, action);
        return r;
      }),
    ),
  );
  router.post(
    "/records/:id/evidence/upload",
    safe((req, res) =>
      mutate(req, res, (state, tx) => {
        const r = get(state, req.params.id, req.actor),
          b = req.body || {};
        check(canEdit(req.actor, r), "Evidence access denied.", 403);
        check(
          r.templateId === "cybersecurity" && r.status === "draft",
          "Evidence can only change in a cybersecurity draft.",
        );
        check(
          b.expectedVersion === r.version,
          "This record changed. Refresh first.",
        );
        check(
          CONTROLS.some((c) => c.key === b.control),
          "Unknown security control.",
          422,
        );
        const name = text(b.name, "Filename", 1, 120);
        check(
          !/[\\/\r\n]/.test(name) &&
            ["application/pdf", "text/plain"].includes(b.contentType),
          "Only PDF or text evidence is accepted.",
          422,
        );
        check(
          typeof b.base64 === "string" &&
            b.base64.length <= 1400000 &&
            /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
              b.base64,
            ),
          "Invalid file encoding.",
          422,
        );
        const bytes = Buffer.from(b.base64, "base64");
        check(
          bytes.length > 0 && bytes.length <= 1048576,
          "Evidence must be 1 byte to 1 MB.",
          422,
        );
        check(
          b.contentType === "application/pdf"
            ? bytes.subarray(0, 5).toString() === "%PDF-"
            : !bytes.includes(0) &&
                Buffer.from(bytes.toString("utf8")).equals(bytes),
          "File contents do not match the selected format.",
          422,
        );
        const digest = hash(b.base64);
        check(
          !r.evidence.some((e) => e.control === b.control && e.hash === digest),
          "This evidence is already attached.",
        );
        const e = {
          id: randomUUID(),
          control: b.control,
          name,
          contentType: b.contentType,
          size: bytes.length,
          hash: digest,
          uploadedBy: req.actor.id,
          at: now(),
        };
        tx.upload(e.id, bytes);
        r.evidence = r.evidence.filter((x) => x.control !== b.control);
        r.evidence.push(e);
        r.version++;
        r.updatedAt = now();
        recordEvent(tx, r, req.actor, "evidence_uploaded");
        return r;
      }),
    ),
  );
  router.get(
    "/records/:id/evidence/:evidenceId",
    safe((req, res) => {
      get(store.read(), req.params.id, req.actor);
      const evidence = store
        .history(req.params.id)
        .flatMap((h) => h.record.evidence)
        .find((e) => e.id === req.params.evidenceId);
      check(evidence, "Evidence not found.", 404);
      const bytes = store.evidence(evidence.id);
      check(bytes, "Stored evidence is unavailable.", 503);
      res
        .set({
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="evidence-${evidence.id}${evidence.contentType === "application/pdf" ? ".pdf" : ".txt"}"`,
          "Content-Security-Policy": "default-src 'none'; sandbox",
        })
        .send(Buffer.from(bytes));
    }),
  );
  router.get(
    "/records/:id/history",
    safe((req, res) => {
      get(store.read(), req.params.id, req.actor);
      res.json(store.history(req.params.id));
    }),
  );
  router.get(
    "/records/:id/document",
    safe((req, res) => {
      const r = get(store.read(), req.params.id, req.actor);
      res
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="vyavsay-${r.templateId}-${r.id}.html"`,
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        })
        .send(renderTemplateDocument(project(r, readSource())));
    }),
  );
  router.get(
    "/records/:id/export",
    safe((req, res) => {
      const r = get(store.read(), req.params.id, req.actor);
      res
        .set({
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="vyavsay-${r.templateId}-${r.id}.json"`,
        })
        .json({
          label: "Template record; not a signed contract or legal clearance",
          template: template(r.templateId),
          record: project(r, readSource()),
          history: store.history(r.id),
        });
    }),
  );

  // Publish a reviewed new problem into the legacy challenge list with a stable ID.
  // If the second store write fails, retry reconciles the same challenge, never a duplicate.
  router.post(
    "/records/:id/publish/challenge",
    safe((req, res) =>
      mutate(req, res, (state, tx, db) => {
        const r = get(state, req.params.id, req.actor);
        check(
          canEdit(req.actor, r) && r.templateId === "problem",
          "Only the department author can publish a problem.",
          403,
        );
        if (r.publishedChallengeId) return r;
        check(
          req.body?.expectedVersion === r.version &&
            r.status === "approved" &&
            !r.challengeId,
          "A reviewed new problem is required.",
        );
        const a = validateAnswers(template("problem"), r.answers, true),
          id = "CH-TPL-" + r.id;
        const actorName = templateAccounts(db)
          .find((x) => x.id === r.createdBy)
          ?.name?.split(" · ")[0];
        check(
          actorName && writeSource,
          "Challenge publishing is unavailable.",
          503,
        );
        const payload = {
          id,
          title: a.title,
          dept: actorName,
          status: "Applications Open",
          apps: 0,
          theme: a.sector,
          risk: "Medium",
          budget: `₹${a.budgetMin / 100000}–${a.budgetMax / 100000} L`,
          deadline: a.timeline,
          requirementStatement: a.painPoint,
          outcome: a.outcome,
          constraints: a.constraints,
          budgetMin: a.budgetMin,
          budgetMax: a.budgetMax,
          templateRecordId: r.id,
          templateVersion: r.templateVersion,
        };
        const existing = (db.challenges || []).find((c) => c.id === id);
        check(
          !existing || hash(existing) === hash(payload),
          "Published challenge differs from the approved record.",
        );
        if (!existing) {
          db.challenges.push(payload);
          writeSource(db);
        }
        r.publishedChallengeId = id;
        r.version++;
        recordEvent(tx, r, req.actor, "challenge_published");
        return r;
      }),
    ),
  );

  function securityGate(challengeId, startupId) {
    try {
      const r = store
        .read()
        .records.find(
          (r) =>
            r.templateId === "cybersecurity" &&
            r.challengeId === challengeId &&
            r.startupId === startupId,
        );
      const eligible =
        !!r &&
        r.status === "approved" &&
        !stale(r, readSource()) &&
        r.review?.validUntil >= now().slice(0, 10) &&
        CONTROLS.every((c) =>
          r.evidence.some(
            (e) => e.control === c.key && r.review.evidenceIds.includes(e.id),
          ),
        );
      return {
        eligible,
        reasons: eligible
          ? []
          : [
              "A current, independently reviewed cybersecurity checklist with evidence is required in Templates before field or live data access.",
            ],
      };
    } catch {
      return {
        eligible: false,
        reasons: [
          "Cybersecurity evidence is unavailable. Data access remains blocked.",
        ],
      };
    }
  }
  router.use((err, _req, res, _next) => {
    if (!err.status) console.error("Templates:", err.message);
    res.status(err.status || 500).json({
      error: err.status
        ? err.message
        : "Templates could not be saved or loaded. Please retry.",
    });
  });
  return { router, store, securityGate, close: () => store.close() };
}
