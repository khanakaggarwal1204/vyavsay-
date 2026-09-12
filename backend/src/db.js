import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncMockData } from "./mockData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "data", "seed.json");
const STORE_PATH = path.join(__dirname, "data", "store-v3.json");

function ensureStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.copyFileSync(SEED_PATH, STORE_PATH);
  }
}

// `node scripts/import-*.js` only ever edits seed.json — it never touches an
// already-running deployment's store-v3.json. Without this, anything added
// to seed.json after the store was first created (a freshly imported
// dataset, a demo invite code, a seed account) sits there forever and the
// live store never picks it up. This merges seed-only records into the
// store, once per process lifetime, for every collection below — matched
// by the given key so nothing already in the live store is duplicated or
// overwritten. It never touches records that only exist in the live store
// (applications, evaluations, contracts, real registered users, sessions,
// etc.) — a full resetDB() would discard all of that, which is too
// destructive for a routine sync.
const SYNCED_COLLECTIONS = [
  { key: "startups", idField: "id" },
  { key: "users", idField: "id" },
  { key: "inviteCodes", idField: "code" },
];

let syncedFromSeed = false;

function syncFromSeed(db) {
  if (syncedFromSeed) return db;
  syncedFromSeed = true;
  let seed;
  try {
    seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  } catch {
    return db;
  }
  let changed = false;
  for (const { key, idField } of SYNCED_COLLECTIONS) {
    const existingIds = new Set((db[key] || []).map((record) => record[idField]));
    const missing = (seed[key] || []).filter((record) => !existingIds.has(record[idField]));
    if (missing.length > 0) {
      db[key] = [...(db[key] || []), ...missing];
      changed = true;
    }
  }
  try {
    const mockSync = syncMockData(db);
    changed ||= mockSync.changed;
  } catch (error) {
    // Demo CSVs enhance the local dataset but must not block core platform data.
    console.warn("Unable to load mock data:", error.message);
  }
  if (changed) fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2));
  return db;
}

export function readDB() {
  ensureStore();
  const db = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  return syncFromSeed(db);
}

export function writeDB(db) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2));
}

/** Reset the store back to the original seed data (used by POST /api/admin/reset). */
export function resetDB() {
  fs.copyFileSync(SEED_PATH, STORE_PATH);
  return readDB();
}
