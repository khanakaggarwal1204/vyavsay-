import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_DIR = path.resolve(__dirname, "..", "..", "docs", "mock-data");

function readCsv(name) {
  return parse(fs.readFileSync(path.join(MOCK_DATA_DIR, name), "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function asBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function splitList(value) {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

export function readMockData() {
  const startups = readCsv("startups.csv").map((row) => ({
    id: row.startup_id,
    name: row.company_name,
    sector: row.sector,
    tags: splitList(row.technology_tags),
    trl: row.trl,
    loc: row.location,
    website: row.website || null,
    description: row.description,
    pilots: Number(row.past_government_pilots),
    yearsActive: Number(row.years_active),
    certifications: splitList(row.certifications),
    registered: asBoolean(row.registered),
    dpiit: asBoolean(row.dpiit_recognised),
    recog: row.recognition_status,
    cin: row.cin,
    rating: Number(row.rating),
    badge: row.badge,
    source: row.source || "Vyavsay mock CSV",
    screeningCase: row.screening_case,
    mock: true,
  }));

  const governmentOfficials = readCsv("government-officials.csv").map((row) => ({
    id: row.official_id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    designation: row.designation,
    employeeId: row.employee_id,
    organisation: row.organisation,
    location: row.location,
    source: "Vyavsay mock CSV",
    mock: true,
  }));

  return { startups, governmentOfficials };
}

// Adds only missing CSV records. This is deliberately idempotent: deployments
// can restart safely without replacing user-created profiles or admin records.
export function syncMockData(db) {
  const mockData = readMockData();
  let changed = false;

  db.startups ||= [];
  const startupIds = new Set(db.startups.map((startup) => startup.id));
  const missingStartups = mockData.startups.filter((startup) => !startupIds.has(startup.id));
  if (missingStartups.length) {
    db.startups.push(...missingStartups);
    changed = true;
  }

  db.mockGovernmentOfficials ||= [];
  const officialIds = new Set(db.mockGovernmentOfficials.map((official) => official.id));
  const missingOfficials = mockData.governmentOfficials.filter((official) => !officialIds.has(official.id));
  if (missingOfficials.length) {
    db.mockGovernmentOfficials.push(...missingOfficials);
    changed = true;
  }

  return { changed, importedStartups: missingStartups.length, importedGovernmentOfficials: missingOfficials.length };
}
