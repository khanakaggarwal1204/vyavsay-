import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "data", "seed.json");
const STORE_PATH = path.join(__dirname, "data", "store-v3.json");

function ensureStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.copyFileSync(SEED_PATH, STORE_PATH);
  }
}

// `node scripts/import-*.js` only ever edits seed.json — it never touches an
// already-running deployment's store-v3.json. Without this, a freshly
// imported dataset (e.g. scripts/import-startups-dataset.js) sits in
// seed.json forever and every role keeps seeing only whatever demo/DPIIT
// startups happened to be in the store the first time it was created.
// This merges any startups present in seed.json but missing from the live
// store (matched by id) into the store, once per process lifetime. It never
// touches applications/evaluations/contracts/startup-profiles that have
// since accumulated in the live store — a full resetDB() would discard all
// of that, which is too destructive for a routine dataset sync.
let startupsSyncedFromSeed = false;

function syncStartupsFromSeed(db) {
  if (startupsSyncedFromSeed) return db;
  startupsSyncedFromSeed = true;
  let seed;
  try {
    seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  } catch {
    return db;
  }
  const existingIds = new Set((db.startups || []).map((s) => s.id));
  const missing = (seed.startups || []).filter((s) => !existingIds.has(s.id));
  if (missing.length > 0) {
    db.startups = [...(db.startups || []), ...missing];
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2));
  }
  return db;
}

export function readDB() {
  ensureStore();
  const db = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  return syncStartupsFromSeed(db);
}

export function writeDB(db) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2));
}

/** Reset the store back to the original seed data (used by POST /api/admin/reset). */
export function resetDB() {
  fs.copyFileSync(SEED_PATH, STORE_PATH);
  return readDB();
}
