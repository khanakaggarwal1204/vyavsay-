import assert from "node:assert/strict";
import test from "node:test";
import { runEligibilityCheck } from "../src/eligibility.js";

test("DPIIT recognition relaxes the experience requirement for a young startup", () => {
  const verdict = runEligibilityCheck({ registered: true, dpiit: true, yearsActive: 1, certifications: [] }, { risk: "Low" }, "2026-09-12T00:00:00.000Z");
  assert.equal(verdict.status, "Eligible");
});

test("a non-DPIIT startup needs the standard operating experience", () => {
  const verdict = runEligibilityCheck({ registered: true, dpiit: false, yearsActive: 2, certifications: ["ISO 27001"] }, { risk: "Low" });
  assert.equal(verdict.status, "Auto-Rejected");
  assert.match(verdict.reason, /3 years/i);
});

test("medium and high-risk challenges require ISO 27001 evidence", () => {
  const failed = runEligibilityCheck({ registered: true, dpiit: true, yearsActive: 1, certifications: [] }, { risk: "High" });
  const passed = runEligibilityCheck({ registered: true, dpiit: true, yearsActive: 1, certifications: ["ISO/IEC 27001:2022"] }, { risk: "High" });
  assert.equal(failed.status, "Auto-Rejected");
  assert.equal(passed.status, "Eligible");
});
