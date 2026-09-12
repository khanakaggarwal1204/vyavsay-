import { createHash } from "node:crypto";
import { readDB, writeDB } from "./db.js";

const MAX_EMBEDDING_TEXT = 12000;
const DEFAULT_MODEL = "gemini-embedding-001";
const DEFAULT_DIMENSIONS = 768;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function tagList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).join(", ") : "";
}

export function startupDiscoveryText(startup) {
  return [
    `Startup: ${text(startup.name)}`,
    `Description: ${text(startup.description)}`,
    `Sector: ${text(startup.sector)}`,
    `Technologies: ${tagList(startup.tags)}`,
    `Government pilot experience: ${Number(startup.pilots) || 0}`,
  ].filter(Boolean).join("\n").slice(0, MAX_EMBEDDING_TEXT);
}

export function challengeDiscoveryText(challenge) {
  return [
    `Challenge: ${text(challenge.title)}`,
    `Requirement: ${text(challenge.requirementStatement)}`,
    `Problem: ${text(challenge.rawProblemStatement)}`,
    `Objective: ${text(challenge.objective)}`,
    `Expected outcome: ${text(challenge.expectedOutcome)}`,
    `Theme: ${text(challenge.theme)}`,
    `Needed capabilities: ${tagList(challenge.capabilities)}`,
  ].filter(Boolean).join("\n").slice(0, MAX_EMBEDDING_TEXT);
}

export function embeddingFingerprint(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]);
    const b = Number(right[index]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  if (!leftMagnitude || !rightMagnitude) return null;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export async function createEmbedding(input, taskType = "RETRIEVAL_DOCUMENT") {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !input) return null;

  const model = process.env.DISCOVERY_EMBEDDING_MODEL || DEFAULT_MODEL;
  const outputDimensionality = Number(process.env.DISCOVERY_EMBEDDING_DIMENSIONS) || DEFAULT_DIMENSIONS;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: input }] },
        embedContentConfig: { taskType, outputDimensionality },
      }),
    },
  );

  if (!response.ok) throw new Error(`Embedding provider returned ${response.status}`);
  const data = await response.json();
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length === 0 || !values.every(Number.isFinite)) throw new Error("Embedding provider returned an invalid vector");
  return { values, model, dimensions: values.length };
}

async function refreshRecordEmbedding(kind, id) {
  const initialDb = readDB();
  const initialRecord = (kind === "startup" ? initialDb.startups : initialDb.challenges).find((record) => record.id === id);
  if (!initialRecord) return { status: "missing" };

  const input = kind === "startup" ? startupDiscoveryText(initialRecord) : challengeDiscoveryText(initialRecord);
  const fingerprint = embeddingFingerprint(input);
  if (!input) return { status: "skipped" };
  if (initialRecord.embeddingFingerprint === fingerprint && Array.isArray(initialRecord.embedding)) return { status: "current" };

  const embedding = await createEmbedding(input, kind === "startup" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY");
  if (!embedding) return { status: "unconfigured" };

  // Re-read before writing: never attach an old vector to a profile edited while the API call ran.
  const db = readDB();
  const current = (kind === "startup" ? db.startups : db.challenges).find((record) => record.id === id);
  const currentInput = current && (kind === "startup" ? startupDiscoveryText(current) : challengeDiscoveryText(current));
  if (!current || embeddingFingerprint(currentInput) !== fingerprint) return { status: "stale" };

  current.embedding = embedding.values;
  current.embeddingFingerprint = fingerprint;
  current.embeddingModel = embedding.model;
  current.embeddingDimensions = embedding.dimensions;
  current.embeddingUpdatedAt = new Date().toISOString();
  writeDB(db);
  return { status: "updated" };
}

export function queueEmbeddingRefresh(kind, id) {
  void refreshRecordEmbedding(kind, id).catch((error) => {
    // Embeddings improve recommendations but never prevent a profile or challenge from being saved.
    console.warn(`Semantic ${kind} index refresh failed for ${id}: ${error.message}`);
  });
}

export function queueChallengeDiscoveryIndex(challengeId) {
  queueEmbeddingRefresh("challenge", challengeId);
  const db = readDB();
  for (const startup of db.startups || []) queueEmbeddingRefresh("startup", startup.id);
}
