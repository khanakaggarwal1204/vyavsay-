import test from "node:test";
import assert from "node:assert/strict";
import {
  challengeVisibleTo,
  draftCompleteness,
  normaliseChallengeDraft,
  validateDraftForReview,
} from "../src/challengeIdentification.js";
import { structureRequirement } from "../src/structuring.js";

const readyDraft = {
  title: "Track lost department files",
  department: "Records Department",
  objective: "Make document transfers traceable.",
  rawProblemStatement: "Our files keep getting lost between departments.",
  beneficiaries: "Department staff and citizens waiting for a service.",
  location: "Pune district",
  timeline: "Four-month pilot starting January 2027",
  budget: "Rs. 10-15 lakh",
  requirementStatement: "A secure digital document-tracking system with immutable audit trails and role-based access.",
  expectedOutcome: "Reduce untraceable transfers by 30% within 4 months.",
  constraints: "Use existing records systems and comply with data security rules.",
};

test("challenge structuring produces editable requirement, measurable outcome and constraints", () => {
  const result = structureRequirement(normaliseChallengeDraft(readyDraft));
  assert.match(result.requirementStatement, /document-tracking/i);
  assert.match(result.expectedOutcome, /30%/);
  assert.match(result.constraints, /existing records/i);
  assert.equal(result.reviewRequired, undefined);
});

test("draft completeness is deterministic and review blocks incomplete or unmeasurable records", () => {
  assert.deepEqual(draftCompleteness({}), { completed: 0, total: 11, percent: 0 });
  assert.equal(draftCompleteness(readyDraft).percent, 100);
  assert.match(validateDraftForReview({ ...readyDraft, expectedOutcome: "Improve the service soon." }).error, /measurable number/i);
  assert.equal(validateDraftForReview(readyDraft), null);
});

test("private challenge records are visible only to their author or a Platform Admin", () => {
  const challenge = { status: "Draft", createdBy: "gov-1" };
  assert.equal(challengeVisibleTo(challenge, null), false);
  assert.equal(challengeVisibleTo(challenge, { id: "gov-2", role: "Government Official" }), false);
  assert.equal(challengeVisibleTo(challenge, { id: "gov-1", role: "Government Official" }), true);
  assert.equal(challengeVisibleTo(challenge, { id: "admin-1", role: "Platform Admin" }), true);
  assert.equal(challengeVisibleTo({ status: "Published" }, null), true);
});
