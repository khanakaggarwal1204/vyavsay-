/* ---------------------------------------------------------------------- */
/*  AUTHENTICATION & IDENTITY VERIFICATION                                 */
/*  Every account on the platform is one of five roles. Registration is    */
/*  gated differently per role so the platform can be reasonably confident */
/*  who it's letting in before granting access:                            */
/*    - Startup: MCA-format CIN required; DPIIT recognition cross-checked  */
/*      for instant verification, otherwise the account is created as      */
/*      "Pending Verification" until reviewed.                             */
/*    - Government Official: official email domain allow-list — personal   */
/*      email addresses are rejected outright.                             */
/*    - Expert Evaluator / Validation Agency / Platform Admin: these are   */
/*      oversight roles, so registration requires an admin-issued invite   */
/*      code rather than being open self-signup.                            */
/* ---------------------------------------------------------------------- */

import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ROLES = ["Government Official", "Startup", "Expert Evaluator", "Validation Agency", "Platform Admin"];
export const INVITE_ONLY_ROLES = ["Expert Evaluator", "Validation Agency", "Platform Admin"];

// Presentation-only bootstrap access. This code is intentionally reusable so
// the team can demonstrate the admin workspace from more than one device.
// All dynamically issued invite codes remain single-use.
const REUSABLE_DEMO_INVITES = new Set(["ADMIN-DEMO1"]);

function isReusableDemoInvite(invite) {
  return invite?.role === "Platform Admin" && REUSABLE_DEMO_INVITES.has(invite.code);
}

// Official government email domains recognised at registration. In a real
// deployment this would be sourced from NIC/Digital India's domain registry;
// kept as a plain allow-list here so it's easy to extend per state/dept.
export const GOV_EMAIL_DOMAINS = ["gov.in", "nic.in", "maharashtra.gov.in", "digitalindia.gov.in"];

// Ministry of Corporate Affairs CIN format: L/U + 5-digit industry code +
// 2-letter state code + 4-digit year + 3-letter ownership code + 6-digit
// registration number (21 characters total).
const CIN_REGEX = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/* ------------------------------- Passwords ------------------------------ */

/** scrypt with a random per-user salt — nothing resembling a plaintext or reversible password is ever stored. */
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function validatePassword(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter.";
  return null;
}

/* --------------------------- Role-specific checks ------------------------ */

export function isValidCin(cin) {
  return CIN_REGEX.test((cin || "").toUpperCase().trim());
}

export function isGovEmail(email) {
  const domain = (email || "").split("@")[1]?.toLowerCase();
  return !!domain && GOV_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * Validate the role-specific fields and decide the account's starting
 * verification status. Returns { error } to reject registration outright,
 * or { verificationStatus, verificationNote, profile } to proceed.
 */
export function verifyRegistration(role, fields, db) {
  if (role === "Startup") {
    const cin = (fields.cin || "").toUpperCase().trim();
    if (!fields.companyName || !fields.companyName.trim()) return { error: "Company name is required." };
    if (!isValidCin(cin)) return { error: "Enter a valid 21-character CIN as issued by the Ministry of Corporate Affairs (e.g. U72900MH2019PTC123456)." };
    const dpiitNumber = (fields.dpiitNumber || "").trim() || null;
    const verified = !!dpiitNumber;
    return {
      verificationStatus: verified ? "Verified" : "Pending Verification",
      verificationNote: verified
        ? "Auto-verified: valid CIN format and DPIIT recognition number on file."
        : "CIN format valid. Add a DPIIT recognition number or await manual document review to unlock applications.",
      profile: { companyName: fields.companyName.trim(), cin, dpiitNumber, sector: fields.sector || null, website: fields.website || null },
    };
  }

  if (role === "Government Official") {
    if (!fields.department || !fields.department.trim()) return { error: "Department is required." };
    if (!fields.designation || !fields.designation.trim()) return { error: "Designation is required." };
    if (!isGovEmail(fields.email)) return { error: "Use your official government email address (e.g. name@maharashtra.gov.in)." };
    return {
      verificationStatus: "Verified",
      verificationNote: "Auto-verified: registered with an official government email domain.",
      profile: { department: fields.department.trim(), designation: fields.designation.trim(), employeeId: fields.employeeId || null },
    };
  }

  if (INVITE_ONLY_ROLES.includes(role)) {
    const code = (fields.inviteCode || "").trim();
    if (!code) return { error: "A valid invite code is required to register for this role." };
    const invite = (db.inviteCodes || []).find((i) => i.code === code && i.role === role && (!i.usedBy || isReusableDemoInvite(i)));
    if (!invite) return { error: "That invite code is invalid, already used, or not issued for this role." };
    return {
      verificationStatus: "Verified",
      verificationNote: isReusableDemoInvite(invite)
        ? "Auto-verified: registered with the reusable presentation Platform Admin code."
        : `Auto-verified: registered with a valid ${role} invite code.`,
      profile: { organization: fields.organization || null, inviteCode: code },
      consumesInvite: isReusableDemoInvite(invite) ? null : invite,
    };
  }

  return { error: "Unknown role." };
}

/* --------------------------------- Sessions ------------------------------ */

export function createSession(db, userId) {
  db.sessions = db.sessions || [];
  const token = randomUUID();
  db.sessions.push({ token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
  return token;
}

export function findSession(db, token) {
  const session = (db.sessions || []).find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
}

export function destroySession(db, token) {
  db.sessions = (db.sessions || []).filter((s) => s.token !== token);
}

/* ------------------------------ Rate limiting ----------------------------- */
// In-memory, per-process — sufficient for this single-instance demo backend.
// Resets on restart, which is an acceptable trade-off against the complexity
// of persisting attempt counters.
const failedAttempts = new Map(); // email -> { count, lockedUntil }

export function checkLockout(email) {
  const entry = failedAttempts.get(email);
  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return null;
}

export function recordFailedAttempt(email) {
  const entry = failedAttempts.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  failedAttempts.set(email, entry);
}

export function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

/* --------------------------------- Helpers -------------------------------- */

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email || "");
}

/** Strip everything but what's safe to send to the client / store in a session response. */
export function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
