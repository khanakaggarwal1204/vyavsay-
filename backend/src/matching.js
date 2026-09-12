import { runEligibilityCheck } from "./eligibility.js";
import { cosineSimilarity } from "./semanticDiscovery.js";

const THEME_TAGS = {
  AgriTech: ["AgriTech"],
  HealthTech: ["HealthTech"],
  Mobility: ["Mobility"],
  CleanTech: ["CleanTech"],
  EdTech: ["EdTech"],
  Miscellaneous: [],
};

const SHORTLIST_THRESHOLD = 55;

function tokens(value) {
  return new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
}

function trlNumber(value) {
  const match = String(value || "").match(/\b([1-9])\b/);
  return match ? Number(match[1]) : 0;
}

function minimumTrl(challenge) {
  return challenge?.risk === "High" ? 6 : challenge?.risk === "Low" ? 4 : 5;
}

function locationMatches(startup, challenge) {
  const startupWords = tokens(startup.loc);
  const locationWords = tokens(challenge.location);
  return [...startupWords].some((word) => locationWords.has(word));
}

function requiredTagsFor(challenge) {
  return THEME_TAGS[challenge?.theme] || [];
}

function sectorMatches(startup, challenge) {
  const requiredTags = requiredTagsFor(challenge);
  return requiredTags.length === 0 || (startup.tags || []).some((tag) => requiredTags.includes(tag));
}

export function discoveryEligibility(startup, challenge) {
  const base = runEligibilityCheck(startup, challenge);
  const reasons = [...base.results.filter((result) => !result.pass).map((result) => result.label)];
  if (!startup.dpiit) reasons.push("DPIIT recognition is required for discovery");
  if (!sectorMatches(startup, challenge)) reasons.push("Sector does not match this challenge");
  if (trlNumber(startup.trl) < minimumTrl(challenge)) reasons.push(`Minimum technology readiness is TRL ${minimumTrl(challenge)}`);
  return {
    eligible: base.status === "Eligible" && startup.dpiit && sectorMatches(startup, challenge) && trlNumber(startup.trl) >= minimumTrl(challenge),
    reasons,
  };
}

function ruleFit(startup, challenge) {
  const challengeWords = tokens([challenge.requirementStatement, challenge.rawProblemStatement, challenge.objective, ...(challenge.capabilities || [])].join(" "));
  const startupWords = tokens([startup.description, startup.sector, ...(startup.tags || [])].join(" "));
  const sharedWords = [...startupWords].filter((word) => challengeWords.has(word)).length;
  const technologyFit = challengeWords.size ? Math.min(sharedWords / Math.min(challengeWords.size, 8), 1) : 0.4;
  const maturityFit = Math.max(0, 1 - Math.abs(trlNumber(startup.trl) - minimumTrl(challenge)) / 5);
  const governmentExperience = Math.min(Number(startup.pilots) || 0, 3) / 3;
  return {
    score: (sectorMatches(startup, challenge) ? 0.35 : 0) + technologyFit * 0.2 + maturityFit * 0.15 + (locationMatches(startup, challenge) ? 0.1 : 0) + governmentExperience * 0.2,
    technologyFit,
    maturityFit,
    governmentExperience,
  };
}

function explanation(startup, challenge, rule, semanticScore) {
  const reasons = [];
  if (sectorMatches(startup, challenge)) reasons.push("Sector match");
  if (semanticScore != null && semanticScore >= 0.7) reasons.push("Strong conceptual fit with the challenge");
  else if (semanticScore != null) reasons.push("Meaning-based capability fit");
  if (rule.technologyFit >= 0.25) reasons.push("Overlapping technologies or capabilities");
  if (rule.maturityFit >= 0.75) reasons.push("Suitable technology readiness level");
  if (rule.governmentExperience > 0) reasons.push("Prior government pilot experience");
  if (locationMatches(startup, challenge)) reasons.push("Location proximity");
  return reasons.length ? reasons : ["Eligible profile with explainable rule fit"];
}

/**
 * Recommendations never decide eligibility. Eligible startups are ranked with
 * 60% stored-vector semantic similarity and 40% deterministic, explainable fit.
 * If either vector is unavailable, rules alone keep discovery available.
 */
export function matchStartupsForChallenge(startups, challenge) {
  const candidates = [];
  const excluded = [];
  for (const startup of startups || []) {
    const eligibility = discoveryEligibility(startup, challenge);
    if (!eligibility.eligible) {
      excluded.push({ id: startup.id, name: startup.name, reasons: eligibility.reasons });
      continue;
    }
    const rule = ruleFit(startup, challenge);
    const cosine = cosineSimilarity(challenge.embedding, startup.embedding);
    const semanticScore = cosine == null ? null : Math.max(0, Math.min(1, (cosine + 1) / 2));
    const combinedScore = semanticScore == null ? rule.score : semanticScore * 0.6 + rule.score * 0.4;
    candidates.push({
      ...startup,
      matchScore: Math.round(combinedScore * 100),
      semanticScore: semanticScore == null ? null : Math.round(semanticScore * 100),
      ruleScore: Math.round(rule.score * 100),
      sectorMatch: sectorMatches(startup, challenge),
      govtExperience: Number(startup.pilots) || 0,
      shortlisted: combinedScore * 100 >= SHORTLIST_THRESHOLD,
      reasons: explanation(startup, challenge, rule, semanticScore),
    });
  }
  return {
    matches: candidates.sort((left, right) => right.matchScore - left.matchScore),
    excluded,
    semanticReady: candidates.filter((candidate) => candidate.semanticScore != null).length,
  };
}

export { SHORTLIST_THRESHOLD, THEME_TAGS };
