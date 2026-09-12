import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, challengeDiscoveryText, startupDiscoveryText } from "../src/semanticDiscovery.js";
import { matchStartupsForChallenge } from "../src/matching.js";

const challenge = {
  id: "ch-1",
  theme: "Mobility",
  risk: "Low",
  requirementStatement: "A platform to track public transport movement and improve commuter information.",
  rawProblemStatement: "Buses are difficult to locate in real time.",
  objective: "Improve public transport reliability.",
  capabilities: ["GPS", "real-time analytics"],
  embedding: [1, 0],
};

function startup(overrides = {}) {
  return {
    id: "st-1",
    name: "RouteSense",
    description: "We provide real-time fleet tracking and commuter information.",
    sector: "Mobility · Analytics",
    tags: ["Mobility", "Analytics"],
    trl: "TRL 6",
    dpiit: true,
    registered: true,
    yearsActive: 3,
    certifications: [],
    pilots: 2,
    loc: "Pune, Maharashtra",
    embedding: [1, 0],
    ...overrides,
  };
}

test("stored vectors are compared mathematically without an AI call at discovery time", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1], [1, 0]), null);
  assert.match(startupDiscoveryText(startup()), /fleet tracking/i);
  assert.match(challengeDiscoveryText(challenge), /public transport/i);
});

test("hard eligibility filters candidates before semantic ranking", () => {
  const result = matchStartupsForChallenge([
    startup(),
    startup({ id: "st-2", name: "Unverified RouteSense", dpiit: false, embedding: [1, 0] }),
  ], challenge);

  assert.equal(result.matches.length, 1);
  assert.equal(result.excluded.length, 1);
  assert.equal(result.matches[0].semanticScore, 100);
  assert.match(result.excluded[0].reasons.join(" "), /DPIIT/i);
});
