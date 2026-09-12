import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createTemplateService,
  templateAccounts,
} from "../src/templates/service.js";
import { createTemplateStore } from "../src/templates/store.js";
import {
  CATALOG,
  validateAnswers,
  resultFor,
} from "../src/templates/catalog.js";
import { weightsForChallenge } from "../src/evaluation.js";
import { renderTemplateDocument } from "../src/templates/document.js";

test("printable documents escape user HTML and expose no executable content", () => {
  const html = renderTemplateDocument({
    id: "test",
    templateId: "problem",
    templateVersion: 1,
    version: 1,
    status: "draft",
    source: {},
    answers: { title: "<script>alert(1)</script>" },
    evidence: [],
    updatedAt: "2026-09-10",
  });
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /not a signed agreement/);
});

test("printable export is authorised and source failures return a safe error", async (t) => {
  const f = await setup(t),
    author = await f.login("author");
  const r = await create(f, author, "problem");
  assert.equal((await fetch(`${f.base}/records/${r.id}/document`)).status, 401);
  const response = await fetch(`${f.base}/records/${r.id}/document`, {
    headers: { cookie: author },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /sandbox/);
  assert.match(await response.text(), /Problem Statement/);
  const broken = await setup(t, {
    readSource: () => {
      throw Error("sensitive internal failure");
    },
  });
  const failure = await broken.call("/accounts");
  assert.equal(failure.status, 500);
  assert.ok(!JSON.stringify(failure.body).includes("sensitive"));
});

test("production adapter cannot let one person author and review under different roles", async (t) => {
  const registry = templateAccounts(fixture());
  let actor = {
    ...registry.find((a) => a.role === "author" && a.name.startsWith("Health")),
    personId: "same-person",
  };
  const f = await setup(t, { demo: false, resolveActor: () => actor });
  let r = await create(f, "", "problem");
  r = await change(f, "", r, "save", { answers: problem });
  r = await change(f, "", r, "submit");
  actor = {
    ...registry.find(
      (a) => a.role === "reviewer" && a.name.startsWith("Health"),
    ),
    personId: "same-person",
  };
  assert.equal(
    (
      await f.call(`/records/${r.id}/review`, {
        expectedVersion: r.version,
        decision: "approved",
        reason: "This person also authored the draft.",
      })
    ).status,
    403,
  );
});

const fixture = () => ({
  challenges: [
    {
      id: "c1",
      title: "Hospital capacity",
      dept: "Health",
      theme: "HealthTech",
      risk: "High",
      budget: "12 L",
      deadline: "December 2026",
    },
    {
      id: "c2",
      title: "Roads",
      dept: "Transport",
      theme: "Transport",
      risk: "Low",
    },
  ],
  startups: [
    { id: "s1", name: "Health startup" },
    { id: "s2", name: "Other startup" },
  ],
  contracts: [
    {
      id: "k1",
      challengeId: "c1",
      startupId: "s1",
      budgetAmount: 1200000,
      durationMonths: 4,
      milestones: [
        {
          id: "m1",
          name: "Sandbox",
          percentage: 100,
          amount: 1200000,
          dueDate: "2026-12-01",
        },
      ],
    },
  ],
  pilotDesigns: [
    {
      id: "p1",
      challengeId: "c1",
      startupId: "s1",
      scopeLabel: "One hospital",
      durationMonths: 4,
    },
  ],
  evaluations: [{ challengeId: "c1", startupId: "s1", total: 88 }],
});
const problem = {
  title: "Track public files",
  department: "Health",
  sector: "Governance",
  objective: "Make inter-department file transfers traceable.",
  rawProblemStatement: "Files are lost during transfers.",
  beneficiaries: "Department staff and citizens waiting for services.",
  location: "Pune district",
  requirementStatement: "Provide secure document tracking with immutable transfer logs.",
  expectedOutcome: "Reduce untraceable transfers by 50% within 4 months.",
  constraints: "Department data stays isolated.",
  budgetMin: 100000,
  budgetMax: 800000,
  currency: "INR",
  pilotDurationMonths: 4,
  submissionDeadline: "2026-10-01",
  expectedPilotStartDate: "2026-11-01",
  primaryKpiName: "Untraceable transfers",
  primaryKpiBaseline: 100,
  primaryKpiTarget: 50,
  primaryKpiUnit: "cases per month",
  measurementMethod: "Compare transfer logs with missing-file reports.",
  evidenceSource: "Department transfer and incident registers.",
  targetDate: "2027-03-01",
};
async function setup(t, options = {}) {
  let db = fixture(),
    clock = "2026-09-10T00:00:00.000Z";
  const service = createTemplateService({
    readSource: () => structuredClone(db),
    writeSource: (next) => {
      db = next;
    },
    filename: ":memory:",
    now: () => clock,
    ...options,
  });
  const app = express();
  app.use(express.json({ limit: "1600kb" }));
  app.use("/api/templates", service.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    service.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api/templates`;
  const call = async (url, body, cookie = "", key = randomUUID()) => {
    const response = await fetch(base + url, {
      headers: {
        cookie,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const login = async (role, name = "Health") => {
    const account = templateAccounts(db).find(
      (a) =>
        a.role === role &&
        (role === "startup"
          ? a.organisationId === name
          : a.name.startsWith(name)),
    );
    return (await call("/session", { accountId: account.id })).cookie;
  };
  return {
    service,
    base,
    call,
    login,
    db: () => db,
    setClock: (value) => {
      clock = value;
    },
  };
}
async function create(f, cookie, templateId, extra = {}) {
  const r = await f.call(
    "/records",
    {
      templateId,
      ...(templateId === "problem" ? {} : { challengeId: "c1" }),
      ...extra,
    },
    cookie,
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
async function change(f, cookie, r, action, extra = {}) {
  const out = await f.call(
    `/records/${r.id}/${action}`,
    { expectedVersion: r.version, ...extra },
    cookie,
  );
  assert.equal(out.status, 200, JSON.stringify(out.body));
  return out.body;
}

test("all seven schemas validate missing, unexpected, invalid, and reversed numeric input", () => {
  assert.equal(CATALOG.length, 7);
  const t = CATALOG[0];
  assert.throws(() => validateAnswers(t, {}, true), /required/);
  for (const answers of [
    null,
    [],
    { nope: true },
    { budgetMin: -1 },
    { budgetMin: "8" },
    { budgetMin: Infinity },
    { title: "\u0000" },
    { ...problem, budgetMin: 900000 },
  ])
    assert.throws(() => validateAnswers(t, answers));
  assert.deepEqual(validateAnswers(t, problem, true), problem);
  assert.throws(() =>
    validateAnswers(
      CATALOG.find((t) => t.id === "risk"),
      { dataSensitivity: "invented" },
    ),
  );
  assert.equal(resultFor({ templateId: "risk", answers: {} }).level, undefined);
});
test("auth, organisation isolation, role limits, CSRF and exports", async (t) => {
  const f = await setup(t);
  assert.equal((await f.call("/")).status, 401);
  assert.equal(
    (
      await fetch(f.base + "/accounts", {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.call("/session", { accountId: "invented" })).status,
    422,
  );
  const author = await f.login("author"),
    other = await f.login("author", "Transport"),
    startup = await f.login("startup", "s1");
  const r = await create(f, author, "problem");
  assert.equal(
    (await f.call(`/records/${r.id}/export`, undefined, other)).status,
    404,
  );
  assert.equal(
    (
      await f.call(
        "/records",
        { templateId: "evaluation", challengeId: "c1" },
        startup,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.call(
        "/records",
        { templateId: "evaluation", challengeId: "c2" },
        author,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/save`,
        { expectedVersion: r.version, answers: problem },
        other,
      )
    ).status,
    404,
  );
  const exportResult = await f.call(
    `/records/${r.id}/export`,
    undefined,
    author,
  );
  assert.equal(exportResult.body.history.length, 1);
  assert.match(exportResult.body.label, /not a signed/);
});
test("problem draft, version conflicts, independent review, publishing and idempotency", async (t) => {
  const f = await setup(t),
    author = await f.login("author"),
    reviewer = await f.login("reviewer");
  const key = randomUUID(),
    body = { templateId: "problem" };
  const first = await f.call("/records", body, author, key),
    repeat = await f.call("/records", body, author, key);
  assert.equal(first.body.id, repeat.body.id);
  assert.equal(f.service.store.read().records.length, 1);
  assert.equal(
    (await f.call("/records", { templateId: "risk" }, author, key)).status,
    409,
  );
  let r = first.body;
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/submit`,
        { expectedVersion: r.version },
        author,
      )
    ).status,
    422,
  );
  r = await change(f, author, r, "save", { answers: problem });
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/save`,
        { expectedVersion: 1, answers: problem },
        author,
      )
    ).status,
    409,
  );
  r = await change(f, author, r, "submit");
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/review`,
        {
          expectedVersion: r.version,
          decision: "approved",
          reason: "All details reviewed independently.",
        },
        author,
      )
    ).status,
    403,
  );
  r = await change(f, reviewer, r, "review", {
    decision: "approved",
    reason: "All challenge fields reviewed independently.",
  });
  r = await change(f, author, r, "publish/challenge");
  assert.equal(f.db().challenges.length, 3);
  assert.equal(f.db().challenges[2].templateRecordId, r.id);
  await change(f, author, r, "publish/challenge");
  assert.equal(f.db().challenges.length, 3);
  assert.equal(
    (await f.call(`/records/${r.id}/history`, undefined, author)).body.length,
    5,
  );
});
test("existing rubric and agreement sources are reused; draft terms and risk are explicit", async (t) => {
  const f = await setup(t),
    author = await f.login("author");
  const evaluation = await create(f, author, "evaluation");
  assert.deepEqual(
    evaluation.result.weights,
    weightsForChallenge(f.db().challenges[0]).weights,
  );
  assert.equal(evaluation.result.categories.length, 5);
  assert.equal(
    (
      await f.call(
        "/records",
        {
          templateId: "agreement",
          challengeId: "c1",
          startupId: "s1",
          contractId: "wrong",
        },
        author,
      )
    ).status,
    422,
  );
  const agreement = await create(f, author, "agreement", {
    startupId: "s1",
    contractId: "k1",
  });
  assert.equal(agreement.source.contract.budgetAmount, 1200000);
  assert.equal(agreement.source.evaluationScore, 88);
  assert.equal(agreement.answers.scope, "One hospital");
  const ip = await create(f, author, "data-ip");
  assert.equal(ip.answers.ipOption, "department-data");
  assert.match(ip.result.status, /review/);
  let risk = await create(f, author, "risk");
  risk = await change(f, author, risk, "save", {
    answers: {
      dataSensitivity: "patient-adjacent",
      criticalService: "no",
      internetExposure: "no",
      externalAccess: "no",
    },
  });
  assert.equal(risk.result.level, "High");
  assert.ok(risk.result.mitigations.length);
  const procurement = await create(f, author, "procurement");
  assert.equal(procurement.result.status, "Officer review required");
  assert.equal(
    (
      await f.call(
        "/records",
        { templateId: "risk", challengeId: "c1" },
        author,
      )
    ).status,
    409,
  );
});
test("evidence is required, reviewed independently, downloadable, expiring and revision-bound", async (t) => {
  const f = await setup(t),
    startup = await f.login("startup", "s1"),
    other = await f.login("startup", "s2"),
    reviewer = await f.login("reviewer");
  let r = await create(f, startup, "cybersecurity", { startupId: "s1" });
  r = await change(f, startup, r, "save", {
    answers: {
      systemScope: "Hospital sandbox v1",
      requirements: "Encryption, hosting and certification assessment",
    },
  });
  assert.equal(f.service.securityGate("c1", "s1").eligible, false);
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/submit`,
        { expectedVersion: r.version },
        startup,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/evidence/upload`,
        {
          expectedVersion: r.version,
          control: "encryption",
          name: "bad.pdf",
          contentType: "application/pdf",
          base64: Buffer.from("not PDF").toString("base64"),
        },
        startup,
      )
    ).status,
    422,
  );
  for (const control of ["encryption", "localisation", "certifications"]) {
    r = await change(f, startup, r, "evidence/upload", {
      control,
      name: `${control}.txt`,
      contentType: "text/plain",
      base64: Buffer.from(
        `Independent ${control} assessment evidence`,
      ).toString("base64"),
    });
  }
  const fileUrl = `/records/${r.id}/evidence/${r.evidence[0].id}`;
  assert.equal(
    (await fetch(f.base + fileUrl, { headers: { cookie: other } })).status,
    404,
  );
  const download = await fetch(f.base + fileUrl, {
    headers: { cookie: startup },
  });
  assert.equal(download.status, 200);
  assert.match(await download.text(), /assessment evidence/);
  r = await change(f, startup, r, "submit");
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/review`,
        {
          expectedVersion: r.version,
          decision: "approved",
          reason: "Security evidence independently examined.",
          checkedEvidence: [],
          validUntil: "2026-10-01",
        },
        reviewer,
      )
    ).status,
    422,
  );
  r = await change(f, reviewer, r, "review", {
    decision: "approved",
    reason: "Security evidence independently examined.",
    checkedEvidence: r.evidence.map((e) => e.id),
    validUntil: "2026-10-01",
  });
  assert.equal(f.service.securityGate("c1", "s1").eligible, true);
  f.setClock("2026-10-02T00:00:00.000Z");
  assert.equal(f.service.securityGate("c1", "s1").eligible, false);
  f.setClock("2026-09-10T00:00:00.000Z");
  r = await change(f, startup, r, "revise");
  assert.equal(f.service.securityGate("c1", "s1").eligible, false);
  f.db().challenges[0].title = "Changed scope";
  assert.equal(
    (
      await f.call(
        `/records/${r.id}/submit`,
        { expectedVersion: r.version },
        startup,
      )
    ).status,
    409,
  );
  r = await change(f, startup, r, "refresh-source");
  assert.equal(r.evidence.length, 0);
  assert.equal(r.stale, false);
});
test("SQLite record/evidence/history persist and failed transactions roll back", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vyavsay-templates-")),
    file = path.join(dir, "state.sqlite");
  let store = createTemplateStore(file);
  try {
    store.transaction((s, tx) => {
      s.records.push({ id: "r1" });
      tx.upload("e1", Buffer.from("proof"));
      tx.append({ record: { id: "r1" }, action: "created" });
    });
    assert.throws(() =>
      store.transaction((s, tx) => {
        s.records.push({ id: "r2" });
        tx.append({ record: { id: "r2" } });
        throw Error("disk simulation");
      }),
    );
    store.close();
    store = createTemplateStore(file);
    assert.equal(store.read().records.length, 1);
    assert.equal(store.history("r1").length, 1);
    assert.equal(store.history("r2").length, 0);
    assert.equal(Buffer.from(store.evidence("e1")).toString(), "proof");
  } finally {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("procurement suggestions require configured applicability and valid dates", () => {
  const record = {
    templateId: "procurement",
    answers: {
      jurisdiction: "Test",
      contractValue: 800000,
      urgency: "routine",
      vendorRelationship: "new",
    },
  };
  const rule = {
    id: "test",
    jurisdiction: "Test",
    minValue: 0,
    maxValue: 900000,
    urgency: ["routine"],
    vendorRelationship: ["new"],
    effectiveFrom: "2026-01-01",
    effectiveUntil: "2026-12-31",
  };
  assert.equal(resultFor(record, [rule], "2026-09-10").matches.length, 1);
  assert.equal(resultFor(record, [rule], "2027-01-01").matches.length, 0);
  assert.equal(
    resultFor(
      { ...record, answers: { ...record.answers, contractValue: 1000000 } },
      [rule],
      "2026-09-10",
    ).matches.length,
    0,
  );
});
test("production does not expose demo impersonation or unauthenticated data", async (t) => {
  const f = await setup(t, { demo: false });
  assert.deepEqual((await f.call("/accounts")).body.accounts, []);
  assert.equal(
    (await f.call("/session", { accountId: "anything" })).status,
    403,
  );
  assert.equal((await f.call("/")).status, 401);
});
