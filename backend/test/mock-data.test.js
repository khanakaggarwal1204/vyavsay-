import assert from "node:assert/strict";
import test from "node:test";
import { readMockData, syncMockData } from "../src/mockData.js";

test("mock CSV files map to complete marketplace and official records", () => {
  const data = readMockData();
  assert.equal(data.startups.length, 12);
  assert.equal(data.governmentOfficials.length, 10);
  assert.equal(data.startups[0].tags.includes("Document Management"), true);
  assert.equal(data.startups[0].certifications.includes("ISO 27001"), true);
  assert.equal(data.governmentOfficials[0].role, "Government Official");
});

test("mock import is idempotent and preserves existing records", () => {
  const db = { startups: [{ id: "st_existing", name: "Existing" }], mockGovernmentOfficials: [] };
  const first = syncMockData(db);
  const second = syncMockData(db);
  assert.equal(first.importedStartups, 12);
  assert.equal(first.importedGovernmentOfficials, 10);
  assert.equal(second.changed, false);
  assert.equal(db.startups.length, 13);
});
