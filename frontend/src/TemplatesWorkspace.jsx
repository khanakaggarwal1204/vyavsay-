import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Plus, Save, Send, FileText } from "lucide-react";
import "./templates.css";

const ROOT = "/api/templates";
async function request(path, body, key) {
  const response = await fetch(ROOT + path, {
    credentials: "include",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
          },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw Object.assign(
      new Error(data?.error || `Request failed (${response.status}).`),
      { status: response.status },
    );
  if (!data || typeof data !== "object")
    throw new Error("Unexpected server response. Please retry.");
  return data;
}

export default function TemplatesWorkspace() {
  const [accounts, setAccounts] = useState([]),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [type, setType] = useState("problem"),
    [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState({}),
    [link, setLink] = useState({}),
    [history, setHistory] = useState(null);
  const [reason, setReason] = useState(""),
    [expiry, setExpiry] = useState(""),
    [checked, setChecked] = useState([]);
  const pending = useRef(null);
  const record = data?.records.find((r) => r.id === selected);
  const definition = data?.catalog.find((t) => t.id === type);
  const editable =
    record &&
    record.status === "draft" &&
    (data.actor.role === "author" ||
      (data.actor.role === "startup" && type === "cybersecurity"));
  async function load() {
    const next = await request("/");
    if (
      ![
        "catalog",
        "records",
        "challenges",
        "startups",
        "contracts",
        "controls",
        "ipOptions",
      ].every((k) => Array.isArray(next[k])) ||
      !next.actor
    )
      throw new Error("Incomplete workspace response.");
    setData(next);
    return next;
  }
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (e.status === 401) {
        setData(null);
        setSelected("");
      }
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    request("/accounts")
      .then(async (result) => {
        if (active) setAccounts(result.accounts || []);
        try {
          const next = await request("/");
          if (
            active &&
            Array.isArray(next.records) &&
            Array.isArray(next.catalog)
          )
            setData(next);
        } catch (e) {
          if (active && result.mode !== "local-demo") setError(e.message);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setAnswers(record?.answers || {});
    setHistory(null);
    setReason("");
    setChecked([]);
  }, [selected, record?.version]);
  async function mutate(path, body) {
    const signature = JSON.stringify([path, body]);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    const result = await request(path, body, pending.current.key);
    await load();
    setSelected(result.id);
    pending.current = null;
    return result;
  }
  const action = (name, extra = {}) =>
    run(() =>
      mutate(`/records/${record.id}/${name}`, {
        expectedVersion: record.version,
        ...extra,
      }),
    );
  function choose(id) {
    setSelected(id);
    setError("");
  }
  async function upload(control, file) {
    if (!file) return;
    await run(async () => {
      if (file.size > 1048576 || !file.size)
        throw new Error("Choose a PDF or text file between 1 byte and 1 MB.");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(file);
      });
      await mutate(`/records/${record.id}/evidence/upload`, {
        expectedVersion: record.version,
        control,
        name: file.name,
        contentType:
          file.type || (file.name.endsWith(".txt") ? "text/plain" : ""),
        base64,
      });
    });
  }
  return (
    <section className="templates-workspace" aria-busy={busy}>
      <header className="tpl-heading">
        <div>
          <h1>Standard Templates</h1>
          <p>Challenge, contract and assurance records</p>
        </div>
        <button
          title="Refresh workspace"
          aria-label="Refresh workspace"
          disabled={busy}
          onClick={() => run(load)}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <div className="tpl-account">
        <label>
          Workspace account
          <select
            aria-label="Workspace account"
            value={data?.actor.id || ""}
            disabled={busy}
            onChange={(e) =>
              run(async () => {
                setData(null);
                setSelected("");
                pending.current = null;
                await request("/session", { accountId: e.target.value });
                await load();
              })
            }
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <span>
          {data?.mode === "local-demo" || accounts.length > 0
            ? "Local demo identity"
            : "Authenticated workspace"}
        </span>
      </div>
      {error && (
        <div className="tpl-error" role="alert">
          {error}
        </div>
      )}
      {busy && <p role="status">Loading or saving…</p>}
      {!data ? (
        <p>Select a workspace account to continue.</p>
      ) : (
        <>
          <nav className="tpl-tabs" aria-label="Template libraries">
            {data.catalog.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                aria-pressed={type === t.id}
                onClick={() => {
                  setType(t.id);
                  choose("");
                  setLink({});
                }}
              >
                {t.name}
              </button>
            ))}
          </nav>
          <div className="tpl-layout">
            <aside className="tpl-records">
              <h2>{definition.name}</h2>
              <p>Template version {definition.version}</p>
              {data.records
                .filter((r) => r.templateId === type)
                .map((r) => (
                  <button
                    key={r.id}
                    disabled={busy}
                    aria-pressed={selected === r.id}
                    onClick={() => choose(r.id)}
                  >
                    <FileText size={16} />
                    <span>
                      {r.answers.title ||
                        r.source.challenge?.title ||
                        "New problem statement"}
                      <small>
                        {r.status.replaceAll("_", " ")} · revision {r.version}
                      </small>
                    </span>
                  </button>
                ))}
              {!data.records.some((r) => r.templateId === type) && (
                <p>No records yet.</p>
              )}
              {(data.actor.role === "author" ||
                (data.actor.role === "startup" &&
                  type === "cybersecurity")) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() =>
                      mutate("/records", { templateId: type, ...link }),
                    );
                  }}
                >
                  <h3>New record</h3>
                  <label>
                    Challenge
                    <select
                      required={type !== "problem"}
                      disabled={busy}
                      value={link.challengeId || ""}
                      onChange={(e) => setLink({ challengeId: e.target.value })}
                    >
                      <option value="">
                        {type === "problem"
                          ? "New challenge"
                          : "Select challenge"}
                      </option>
                      {data.challenges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {definition.startup && (
                    <label>
                      Startup
                      <select
                        required
                        disabled={busy}
                        value={link.startupId || ""}
                        onChange={(e) =>
                          setLink({
                            ...link,
                            startupId: e.target.value,
                            contractId: "",
                          })
                        }
                      >
                        <option value="">Select startup</option>
                        {data.startups.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {type === "agreement" && (
                    <label>
                      Pilot contract
                      <select
                        required
                        disabled={busy}
                        value={link.contractId || ""}
                        onChange={(e) =>
                          setLink({ ...link, contractId: e.target.value })
                        }
                      >
                        <option value="">Select existing contract</option>
                        {data.contracts
                          .filter(
                            (c) =>
                              c.challengeId === link.challengeId &&
                              c.startupId === link.startupId,
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} · INR {c.budgetAmount}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <button disabled={busy} className="tpl-primary">
                    <Plus size={16} /> Create draft
                  </button>
                </form>
              )}
            </aside>
            <article className="tpl-detail">
              {!record ? (
                <p>Select a record or create a draft.</p>
              ) : (
                <>
                  <div className="tpl-heading">
                    <h2>{definition.name}</h2>
                    <span>
                      {record.status.replaceAll("_", " ")} · v{record.version}
                    </span>
                  </div>
                  {record.stale && (
                    <div role="alert" className="tpl-error">
                      Linked source data changed. Revise and refresh the source
                      before resubmitting.
                    </div>
                  )}
                  {record.source.challenge && (
                    <p>
                      <strong>{record.source.challenge.title}</strong>
                      <br />
                      {record.source.challenge.dept}
                      {record.source.startup &&
                        ` · ${record.source.startup.name}`}
                    </p>
                  )}
                  {record.source.contract && (
                    <dl>
                      <dt>Contract budget</dt>
                      <dd>
                        INR{" "}
                        {record.source.contract.budgetAmount.toLocaleString(
                          "en-IN",
                        )}
                      </dd>
                      <dt>Duration</dt>
                      <dd>{record.source.contract.durationMonths} months</dd>
                      <dt>Evaluation score</dt>
                      <dd>{record.source.evaluationScore ?? "Not recorded"}</dd>
                    </dl>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      action("save", { answers });
                    }}
                  >
                    <fieldset disabled={!editable || busy}>
                      {definition.fields.map((f) => (
                        <label key={f.key}>
                          {f.label}
                          {f.type === "select" ? (
                            <select
                              value={answers[f.key] ?? ""}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  [f.key]: e.target.value,
                                })
                              }
                            >
                              <option value="">Select</option>
                              {f.options.map((o) => (
                                <option key={o} value={o}>
                                  {data.ipOptions.find((i) => i.id === o)
                                    ?.label || o}
                                </option>
                              ))}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea
                              rows={3}
                              maxLength={5000}
                              value={answers[f.key] ?? ""}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  [f.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              type={f.type}
                              min={f.type === "number" ? 0 : undefined}
                              max={f.type === "number" ? 1e10 : undefined}
                              step={f.type === "number" ? 1 : undefined}
                              maxLength={5000}
                              value={answers[f.key] ?? ""}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  [f.key]:
                                    f.type === "number" && e.target.value !== ""
                                      ? Number(e.target.value)
                                      : e.target.value,
                                })
                              }
                            />
                          )}
                        </label>
                      ))}
                      {editable && (
                        <button className="tpl-primary">
                          <Save size={16} /> Save draft
                        </button>
                      )}
                    </fieldset>
                  </form>
                  {record.result && (
                    <section className="tpl-result">
                      <h3>Assessment / standard terms</h3>
                      {record.result.categories ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Criterion</th>
                              <th>Weight</th>
                              <th>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.result.categories.map((c) => (
                              <tr key={c.key}>
                                <td>{c.label}</td>
                                <td>{record.result.weights[c.key]}%</td>
                                <td>0–10</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <>
                          <p>{record.result.level || record.result.status}</p>
                          {record.result.clause && (
                            <p>{record.result.clause}</p>
                          )}
                          {[
                            ...(record.result.reasons || []),
                            ...(record.result.mitigations || []),
                          ].map((s) => (
                            <p key={s}>{s}</p>
                          ))}
                          {record.result.matches?.map((p) => (
                            <p key={p.id}>
                              {p.name} ·{" "}
                              <a
                                href={p.source}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Policy source
                              </a>
                            </p>
                          ))}
                        </>
                      )}
                      {record.source.contract?.milestones.map((m) => (
                        <p key={m.id}>
                          {m.name}: {m.percentage}% · INR {m.amount} ·{" "}
                          {m.dueDate}
                        </p>
                      ))}
                    </section>
                  )}
                  {type === "cybersecurity" && (
                    <section className="tpl-result">
                      <h3>Security evidence</h3>
                      {data.controls.map((c) => {
                        const evidence = record.evidence.find(
                          (e) => e.control === c.key,
                        );
                        return (
                          <div className="tpl-control" key={c.key}>
                            <strong>{c.label}</strong>
                            {evidence ? (
                              <a
                                href={`${ROOT}/records/${record.id}/evidence/${evidence.id}`}
                              >
                                {evidence.name}
                              </a>
                            ) : (
                              <span>Evidence missing</span>
                            )}
                            {editable && (
                              <input
                                aria-label={`Upload ${c.label}`}
                                disabled={busy}
                                type="file"
                                accept=".pdf,.txt"
                                onChange={(e) => {
                                  upload(c.key, e.target.files[0]);
                                  e.target.value = "";
                                }}
                              />
                            )}{" "}
                            {evidence &&
                              data.actor.role === "reviewer" &&
                              record.status === "submitted" && (
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={checked.includes(evidence.id)}
                                    onChange={(e) =>
                                      setChecked(
                                        e.target.checked
                                          ? [...checked, evidence.id]
                                          : checked.filter(
                                              (id) => id !== evidence.id,
                                            ),
                                      )
                                    }
                                  />{" "}
                                  Evidence reviewed
                                </label>
                              )}
                          </div>
                        );
                      })}
                    </section>
                  )}
                  {record.review && (
                    <p>
                      <strong>Review findings:</strong> {record.review.reason}
                      {record.review.validUntil &&
                        ` · Valid until ${record.review.validUntil}`}
                    </p>
                  )}
                  {data.actor.role === "reviewer" &&
                    record.status === "submitted" && (
                      <section className="tpl-result">
                        <label>
                          Review findings
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        {type === "cybersecurity" && (
                          <label>
                            Review expiry
                            <input
                              type="date"
                              value={expiry}
                              onChange={(e) => setExpiry(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                        )}
                        <div className="tpl-actions">
                          <button
                            disabled={busy || reason.trim().length < 15}
                            onClick={() =>
                              action("review", {
                                decision: "approved",
                                reason,
                                validUntil: expiry,
                                checkedEvidence: checked,
                              })
                            }
                          >
                            Approve
                          </button>
                          <button
                            disabled={busy || reason.trim().length < 15}
                            onClick={() =>
                              action("review", {
                                decision: "changes_requested",
                                reason,
                              })
                            }
                          >
                            Request changes
                          </button>
                        </div>
                      </section>
                    )}
                  <div className="tpl-actions">
                    {editable && (
                      <>
                        <button
                          disabled={
                            busy ||
                            JSON.stringify(answers) !==
                              JSON.stringify(record.answers)
                          }
                          onClick={() => action("submit")}
                        >
                          <Send size={16} /> Submit for review
                        </button>
                        {record.challengeId && (
                          <button
                            disabled={busy}
                            onClick={() => action("refresh-source")}
                          >
                            <RefreshCw size={16} /> Refresh source
                          </button>
                        )}
                      </>
                    )}
                    {!editable &&
                      ["author", "startup"].includes(data.actor.role) &&
                      !record.publishedChallengeId &&
                      record.status !== "draft" && (
                        <button
                          disabled={busy}
                          onClick={() => action("revise")}
                        >
                          Create revision
                        </button>
                      )}
                    {type === "problem" &&
                      record.status === "approved" &&
                      !record.challengeId &&
                      !record.publishedChallengeId &&
                      data.actor.role === "author" && (
                        <button
                          disabled={busy}
                          onClick={() => action("publish/challenge")}
                        >
                          Publish challenge
                        </button>
                      )}
                    <a href={`${ROOT}/records/${record.id}/document`}>
                      <FileText size={16} /> Printable document
                    </a>
                    <a href={`${ROOT}/records/${record.id}/export`}>
                      <Download size={16} /> Export JSON
                    </a>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const h = await request(
                            `/records/${record.id}/history`,
                          );
                          if (!Array.isArray(h))
                            throw new Error("Invalid history response.");
                          setHistory(h);
                        })
                      }
                    >
                      Revision history
                    </button>
                  </div>
                  {record.publishedChallengeId && (
                    <p>Published: {record.publishedChallengeId}</p>
                  )}
                  {history && (
                    <section className="tpl-result">
                      <h3>Revision history</h3>
                      {history.map((h, i) => (
                        <details key={i}>
                          <summary>
                            v{h.record.version} ·{" "}
                            {h.action.replaceAll("_", " ")} ·{" "}
                            {new Date(h.at).toLocaleString()}
                          </summary>
                          <p>{h.actorId}</p>
                          <pre>{JSON.stringify(h.record.answers, null, 2)}</pre>
                        </details>
                      ))}
                    </section>
                  )}
                </>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  );
}
