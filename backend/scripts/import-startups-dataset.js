#!/usr/bin/env node
/**
 * Import a general Indian-startups CSV into src/data/seed.json.
 *
 * This is a second importer alongside import-dpiit.js, for a different (and
 * very common) CSV shape — a general startup directory/funding dataset
 * rather than the official DPIIT registry export. It expects columns:
 *
 *   Company, City, Starting Year, Founders, Industries, Description,
 *   No. of Employees, Funding Amount in $, Funding Round, No. of Investors
 *
 * These companies are NOT DPIIT-verified by this import (no CIN is present
 * in this dataset) — they're seeded as real companies with `dpiit: false`
 * and `recog: "Not DPIIT Verified"`. A Government Official/Evaluator/Admin
 * dashboard will show them as real entries either way; only the DPIIT
 * recognition badge is withheld until a startup account is created for one
 * of them (or its founder registers directly) with a real CIN/DPIIT number.
 *
 * Usage:
 *   node scripts/import-startups-dataset.js /path/to/Startups1.csv
 *   node scripts/import-startups-dataset.js /path/to/Startups1.csv --limit 50
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "..", "src", "data", "seed.json");

const INDUSTRY_TO_THEME = [
  { match: /agri|farm(?!aceut)/i, theme: "AgriTech", tag: "AgriTech" },
  { match: /health|pharma|biotech|medical|wellness/i, theme: "HealthTech", tag: "HealthTech" },
  { match: /transport|logistic|automotive|mobility/i, theme: "Mobility", tag: "Mobility" },
  { match: /energy|environment|clean\s?tech|waste|water/i, theme: "CleanTech", tag: "CleanTech" },
  { match: /education|edtech|learning|coaching/i, theme: "EdTech", tag: "EdTech" },
];
const EXTRA_TAGS = [
  { match: /machine learning|artificial intelligence|\bai\b|nlp|computer vision/i, tag: "AI/ML" },
  { match: /\biot\b|sensor/i, tag: "IoT" },
  { match: /marketplace|aggregator|e-commerce/i, tag: "Marketplace" },
  { match: /analytics|\bdata\b|gps|tracking|saas|software/i, tag: "Analytics" },
];

function themeAndTagsFor(industriesRaw) {
  const combined = industriesRaw || "";
  const themeMatch = INDUSTRY_TO_THEME.find((t) => t.match.test(combined));
  const tags = new Set(themeMatch ? [themeMatch.tag] : []);
  for (const t of EXTRA_TAGS) if (t.match.test(combined)) tags.add(t.tag);
  const firstIndustry = combined.split(",")[0]?.trim();
  if (tags.size === 0) tags.add(firstIndustry || "Other");
  return { theme: themeMatch ? themeMatch.theme : "Miscellaneous", tags: [...tags] };
}

// TRL (Technology Readiness Level) isn't in this dataset — approximate it
// from company age and headcount, both of which correlate loosely with
// product maturity. This is a labelled estimate, not a verified assessment.
function estimateTrl(yearsActive, employeesBand) {
  const bandSize = { "1-10": 1, "11-50": 2, "51-100": 3, "101-250": 4, "251-500": 5, "501-1000": 6, "1001-5000": 7, "5001-10000": 8 }[employeesBand] || 3;
  const ageScore = yearsActive >= 8 ? 3 : yearsActive >= 4 ? 2 : yearsActive >= 1 ? 1 : 0;
  return `TRL ${Math.min(9, Math.max(3, bandSize + ageScore))}`;
}

function badgeFor(fundingAmount, investors) {
  if (fundingAmount >= 50_000_000 && investors >= 5) return "Verified";
  if (fundingAmount > 0) return "Eligible";
  return "Under Review";
}

function slugId(name, existingIds) {
  const base = "st_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  let id = base;
  let n = 2;
  while (existingIds.has(id)) id = `${base}_${n++}`;
  return id;
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-startups-dataset.js <path-to-csv> [--limit N]");
    process.exit(1);
  }
  const limitFlagIdx = process.argv.indexOf("--limit");
  const limit = limitFlagIdx !== -1 ? parseInt(process.argv[limitFlagIdx + 1], 10) : Infinity;

  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  const existingIds = new Set(seed.startups.map((s) => s.id));
  const existingNames = new Set(seed.startups.map((s) => s.name.toLowerCase()));

  const currentYear = new Date().getFullYear();
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (imported >= limit) break;
    const name = (row["Company"] || "").trim();
    if (!name) { skipped++; continue; }
    if (existingNames.has(name.toLowerCase())) { skipped++; continue; } // avoid duplicating a company already in seed.json

    const startingYear = parseInt(row["Starting Year"], 10);
    const yearsActive = Number.isFinite(startingYear) ? Math.max(currentYear - startingYear, 0) : 2;
    const employeesBand = (row["No. of Employees"] || "").trim();
    const fundingAmount = parseInt(row["Funding Amount in $"], 10) || 0;
    const investors = parseInt(row["No. of Investors"], 10) || 0;
    const { theme, tags } = themeAndTagsFor(row["Industries"]);
    const id = slugId(name, existingIds);

    seed.startups.push({
      id,
      name,
      sector: (row["Industries"] || "Other").split(",").slice(0, 2).join(" · ").trim() || "Other",
      trl: estimateTrl(yearsActive, employeesBand),
      recog: "Not DPIIT Verified",
      pilots: 0,
      rating: null,
      badge: badgeFor(fundingAmount, investors),
      loc: row["City"] || "Unknown",
      tags,
      registered: false, // real company, but no Vyavsay account has claimed/registered it yet
      dpiit: false,
      yearsActive,
      certifications: [],
      cin: null,
      website: null,
      source: "Startup dataset (real)",
      founders: row["Founders"] || null,
      description: row["Description"] || null,
      employees: employeesBand || null,
      fundingAmountUsd: fundingAmount || null,
      fundingRound: row["Funding Round"] || null,
      investorCount: investors || null,
      _theme_hint: theme,
    });
    existingIds.add(id);
    existingNames.add(name.toLowerCase());
    imported++;
  }

  fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2));
  console.log(`Imported ${imported} real startups (skipped ${skipped} rows — no name, or already present).`);
  console.log(`Total startups in seed.json: ${seed.startups.length}`);
  console.log("Delete backend/src/data/store-v3.json (or POST /api/admin/reset) to pick up the new seed on next run.");
}

main();
