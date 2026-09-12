import TemplatesWorkspace from "./TemplatesWorkspace.jsx";
import PaymentsWorkspace from "./PaymentsWorkspace.jsx";
import ValidationWorkspace from "./ValidationWorkspace.jsx";
import ScaleUpWorkspace from "./ScaleUpWorkspace.jsx";
import VyavsayAssistant from "./VyavsayAssistant.jsx";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, Target, Rocket, FileText, ClipboardCheck, FlaskConical,
  FileSignature, Wallet, ShieldCheck, TrendingUp, Library, Settings, Search,
  Bell, ChevronDown, ChevronUp, Filter, Plus, ArrowRight, CheckCircle2, Clock,
  AlertTriangle, MapPin, Calendar, Building2, Users, Star, Download, Upload,
  Eye, X, ChevronRight, BadgeCheck, Landmark, FileCheck2, IndianRupee,
  ShieldAlert, UserCheck, Layers, ScrollText, Gauge, ArrowUpRight, Info,
  ChevronLeft, Sparkles, Lock, Globe, RefreshCw,
} from "lucide-react";
import { api } from "./api.js";
import { SAFE_GUIDE_AVATAR } from "./guideAsset.js";
import { LANGUAGES, t } from "./i18n.js";

/* ---------------------------------------------------------------------- */
/*  DESIGN TOKENS                                                          */
/* ---------------------------------------------------------------------- */
const C = {
  ink: "#06305C",
  inkSoft: "#516882",
  paper: "#F1F8FD",
  surface: "#FFFFFF",
  line: "#D9E7F2",
  lineStrong: "#AFC7DA",
  brass: "#D07A1F",
  brassSoft: "#FFF2DF",
  teal: "#068B69",
  tealSoft: "#E0F6EE",
  rust: "#B42318",
  rustSoft: "#FDE7E4",
  navySoft: "#E6F0FA",
  skySoft: "#E8F6FF",
  blue: "#0B5CAD",
  blueSoft: "#E5F1FC",
  violet: "#6B4FD6",
  violetSoft: "#F0ECFF",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Roboto:wght@400;500;600;700&display=swap');
@keyframes vyavsaySpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: no-preference) {
  .vyavsay-chakra-spin { animation: vyavsaySpin 40s linear infinite; transform-origin: 50% 50%; }
}
@media (max-width: 699px) {
  .vyavsay-public-stepper { overflow-x: auto !important; }
  .vyavsay-public-stepper > * { min-width: 92px !important; flex: 0 0 auto !important; }
}
.vyavsay-solve-card:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(6,48,92,0.12) !important; }
@media (max-width: 760px) {
  .challenge-identification-grid { grid-template-columns: 1fr !important; }
  .challenge-identification-steps { overflow-x: auto; padding-bottom: 4px; }
  .challenge-identification-steps > * { min-width: 130px; flex: 0 0 auto !important; }
  .vyavsay-schemes-grid { grid-template-columns: 1fr !important; }
  .vyavsay-solve-grid { grid-template-columns: 1fr !important; }
  .vyavsay-solve-accent { opacity: 0.055 !important; transform: scale(0.78); }
  .vyavsay-solve-girl { display: none !important; }
  .vyavsay-solve-content { padding-right: 0 !important; padding-left: 0 !important; }
  .vyavsay-chakra { width: 250px !important; height: 250px !important; left: -145px !important; opacity: 0.4 !important; }
  .vyavsay-guest-nav { display: none !important; }
  .vyavsay-public-header { padding: 8px 14px !important; gap: 10px !important; }
  .vyavsay-gov-copy, .vyavsay-brand-tagline, .vyavsay-partner-marks { display: none !important; }
  .vyavsay-header-divider { display: none !important; }
  .vyavsay-header-actions { margin-left: auto !important; gap: 6px !important; }
  .vyavsay-header-actions button { padding: 7px 9px !important; font-size: 10.5px !important; }
  .vyavsay-footer-policy-links { gap: 12px !important; justify-content: flex-start !important; overflow-x: auto; }
  .vyavsay-footer-policy-links > * { flex: 0 0 auto; }
  .vyavsay-footer-attribution { grid-template-columns: 1fr !important; }
  .vyavsay-footer-side { justify-content: flex-start !important; }
  .vyavsay-hero {
    min-height: 560px !important;
    background-size: contain !important;
    background-position: center center !important;
  }
  .vyavsay-hero-inner { padding: 26px 18px 28px !important; }
  .vyavsay-hero-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
  .vyavsay-hero-title { font-size: clamp(28px, 8vw, 34px) !important; }
  .vyavsay-hero-logins { gap: 8px 14px !important; flex-wrap: wrap !important; }
}
@media (min-width: 761px) and (max-width: 1050px) {
  .vyavsay-public-header { padding: 9px 18px !important; gap: 12px !important; }
  .vyavsay-guest-nav { display: none !important; }
  .vyavsay-partner-marks { margin-left: auto !important; }
  .vyavsay-hero-grid { grid-template-columns: 1.1fr 0.9fr !important; gap: 24px !important; }
  .vyavsay-hero-title { font-size: 32px !important; }
  .vyavsay-hero {
    min-height: 520px !important;
    background-size: contain !important;
    background-position: center center !important;
  }
}
@media (min-width: 1051px) and (max-width: 1280px) {
  .vyavsay-public-header { padding: 8px 14px !important; gap: 10px !important; }
  .vyavsay-guest-nav { gap: 10px !important; }
  .vyavsay-guest-nav > span { font-size: 10.5px !important; }
  .vyavsay-header-actions { gap: 6px !important; }
  .vyavsay-header-actions button { padding: 7px 9px !important; font-size: 10.5px !important; }
  .vyavsay-partner-marks img { height: 18px !important; }
}
.vyavsay-warli-border {
  display: block;
  width: 100%;
  height: 36px;
  overflow: hidden;
  background: #7a1f1f;
}
@media (max-width: 760px) {
  .vyavsay-warli-border { height: 30px; }
  .vyavsay-hero-pathway { display: none !important; }
  .vyavsay-hero-slogan { font-size: 17px !important; padding: 10px 18px !important; }
  .vyavsay-hero-card { margin-top: 4px; }
  .vyavsay-public-header { min-height: 68px !important; }
}
`;

const BODY_FONT = "'Noto Sans', Roboto, Arial, sans-serif";
const GUEST_BG_IMAGE = `${import.meta.env.BASE_URL}vyavsay-heritage-wide-bg.png`;
export const SOLVE_RIGHT_ART = "data:image/webp;base64,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";
/* Used for headline/display moments — same sans family, heavier weight, tight tracking. Not a second typeface. */
const serif = { fontFamily: BODY_FONT, fontWeight: 900, letterSpacing: 0 };
/* Used for IDs, codes and numeric data — Roboto with tabular figures, per govt SaaS numeral guidance. */
const mono = { fontFamily: "Roboto, Arial, sans-serif", fontVariantNumeric: "tabular-nums", fontWeight: 500 };
const tabular = { fontVariantNumeric: "tabular-nums" };

function LanguageSelector({ language, onChange }) {
  return (
    <label title="Choose display language" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.inkSoft, fontWeight: 700 }}>
      <Globe size={14} aria-hidden="true" />
      <select aria-label="Display language" value={language} onChange={(event) => onChange(event.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 4, background: "#fff", color: C.ink, padding: "6px 7px", font: "inherit" }}>
        {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
  );
}

/* ---------------------------------------------------------------------- */
/*  LIFECYCLE                                                              */
/* ---------------------------------------------------------------------- */
const LIFECYCLE = [
  "Draft", "Draft Challenge", "Under Review", "Ready for Confirmation", "Published", "Applications Open",
  "Eligibility Screening", "Expert Evaluation", "Startup Shortlisted",
  "Pilot Design", "Contracting", "Pilot Active", "Milestone Review",
  "Payment Processing", "Independent Validation", "Scale-Up Review",
  "Scaled / Closed",
];

const PUBLIC_PATHWAY_STAGES = [
  "Problem Defined",
  "Applications Open",
  "Eligibility Screening",
  "Expert Evaluation",
  "Startup Shortlisted",
  "Pilot Design & Contracting",
  "Pilot Active",
  "Milestone Review & Payment",
  "Validation & Scale-Up",
];

const PUBLIC_PATHWAY_GROUPS = [
  ["Draft", "Draft Challenge", "Under Review", "Ready for Confirmation", "Published"],
  ["Applications Open"],
  ["Eligibility Screening"],
  ["Expert Evaluation"],
  ["Startup Shortlisted"],
  ["Pilot Design", "Contracting"],
  ["Pilot Active"],
  ["Milestone Review", "Payment Processing"],
  ["Independent Validation", "Scale-Up Review", "Scaled / Closed"],
];

const STATUS_COLOR = {
  "Draft": ["#8A8D94", "#EDEDE9"],
  "Draft Challenge": ["#8A8D94", "#EDEDE9"],
  "Under Review": [C.brass, C.brassSoft],
  "Ready for Confirmation": [C.teal, C.tealSoft],
  "Published": [C.teal, C.tealSoft],
  "Applications Open": [C.teal, C.tealSoft],
  "Eligibility Screening": [C.brass, C.brassSoft],
  "Expert Evaluation": [C.brass, C.brassSoft],
  "Startup Shortlisted": [C.teal, C.tealSoft],
  "Pilot Design": [C.ink, C.navySoft],
  "Contracting": [C.ink, C.navySoft],
  "Pilot Active": [C.teal, C.tealSoft],
  "Milestone Review": [C.brass, C.brassSoft],
  "Payment Processing": [C.brass, C.brassSoft],
  "Independent Validation": [C.ink, C.navySoft],
  "Scale-Up Review": [C.ink, C.navySoft],
  "Scaled / Closed": ["#0E4A3C", C.tealSoft],
  "At Risk": [C.rust, C.rustSoft],
  "Rejected": [C.rust, C.rustSoft],
};

function StatusChip({ label, small }) {
  const [fg, bg] = STATUS_COLOR[label] || ["#8A8D94", "#EDEDE9"];
  return (
    <span
      style={{
        color: fg,
        background: bg,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        padding: small ? "2px 8px" : "3px 10px",
        borderRadius: 3,
        whiteSpace: "nowrap",
        letterSpacing: 0,
      }}
    >
      {label}
    </span>
  );
}

function AutomatedReviewCard({ report }) {
  if (!report) return null;
  const routeLabel = report.route === "changes_required" ? "Corrections required" : report.route === "ready_for_confirmation" ? "Ready for confirmation" : "Manual review required";
  const tone = report.route === "changes_required" ? C.rust : report.route === "ready_for_confirmation" ? C.teal : C.brass;
  const background = report.route === "changes_required" ? C.rustSoft : report.route === "ready_for_confirmation" ? C.tealSoft : C.brassSoft;
  return (
    <Card style={{ marginBottom: 16, border: `1px solid ${tone}66`, background }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div><div style={{ fontWeight: 800 }}>Automated pre-review</div><div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{report.summary}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ ...serif, fontSize: 24, color: tone }}>{report.score}/100</div><div style={{ fontSize: 9.5, color: C.inkSoft }}>READINESS SCORE</div><div style={{ fontSize: 10.5, fontWeight: 700, color: tone }}>{routeLabel}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 11.5 }}>
        <span>{report.passedChecks}/{report.totalChecks} control groups passed</span><span>•</span><span>Risk: {report.riskLevel}</span><span>•</span><span>AI: {report.ai?.status === "completed" ? `${report.ai.provider}${report.ai.model ? ` · ${report.ai.model}` : ""}` : report.ai?.status === "skipped_sensitive_input" ? "skipped to protect sensitive input" : "unavailable — manually routed"}</span>
      </div>
      {report.findings?.length > 0 && <div style={{ marginTop: 12 }}>
        {report.findings.map((item, index) => <div key={`${item.code}-${index}`} style={{ padding: "9px 0", borderTop: `1px solid ${C.lineStrong}`, fontSize: 12 }}>
          <div style={{ fontWeight: 750, color: item.severity === "blocking" ? C.rust : C.ink }}>{item.severity === "blocking" ? "BLOCKING" : "WARNING"} · {item.code.replaceAll("_", " ")}</div>
          <div style={{ marginTop: 3 }}>{item.message}</div>
          <div style={{ color: C.inkSoft, marginTop: 3 }}><b>Fix:</b> {item.suggestion}</div>
        </div>)}
      </div>}
    </Card>
  );
}

function Stepper({ current, stages = LIFECYCLE }) {
  const isPublic = stages !== LIFECYCLE;
  const idx = isPublic
    ? PUBLIC_PATHWAY_GROUPS.findIndex((group) => group.includes(current)) >= 0
      ? PUBLIC_PATHWAY_GROUPS.findIndex((group) => group.includes(current))
      : stages.indexOf(current)
    : LIFECYCLE.indexOf(current);

  return (
    <div
      className={isPublic ? "vyavsay-public-stepper" : ""}
      style={{
        display: "flex", alignItems: "stretch", gap: 0, paddingBottom: 4,
        overflowX: isPublic ? "hidden" : "auto", width: "100%",
      }}
    >
      {stages.map((stage, i) => {
        const done = i < idx, active = i === idx;
        return (
          <React.Fragment key={stage}>
            <div style={{ display: "flex", alignItems: "flex-start", flex: "1 1 0", minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0 }}>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                    background: active ? C.ink : done ? C.teal : "#fff",
                    color: active || done ? "#fff" : C.inkSoft,
                    border: `1.5px solid ${active ? C.ink : done ? C.teal : C.lineStrong}`,
                    flexShrink: 0,
                  }}
                >
                  {done ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <div
                  style={{
                    fontSize: isPublic ? 9.5 : 9.5, marginTop: 5, textAlign: "center", lineHeight: 1.2,
                    color: active ? C.ink : C.inkSoft, fontWeight: active ? 700 : 500,
                    minWidth: 0, maxWidth: "100%", overflowWrap: "break-word",
                  }}
                >
                  {stage}
                </div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: "1 1 0", minWidth: 8, height: 1.5, background: done ? C.teal : C.line, marginTop: 11 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PRIMITIVES                                                             */
/* ---------------------------------------------------------------------- */
function Card({ children, style, className = "", noPad, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={onClick ? () => setHover(true) : undefined}
      onMouseLeave={onClick ? () => setHover(false) : undefined}
      style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6,
        boxShadow: hover ? "0 14px 34px rgba(6,48,92,0.12)" : "0 10px 28px rgba(6,48,92,0.055)",
        padding: noPad ? 0 : 18,
        cursor: onClick ? "pointer" : undefined,
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow .15s, transform .15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, variant = "primary", icon: Icon, onClick, small, style, disabled, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600,
    fontSize: small ? 12.5 : 13.5, padding: small ? "6px 11px" : "9px 16px",
    borderRadius: 4, cursor: disabled ? "default" : "pointer", border: "1px solid transparent", transition: "opacity .15s",
    opacity: disabled ? 0.55 : 1,
  };
  const variants = {
    primary: { background: C.ink, color: "#fff" },
    brass: { background: C.brass, color: "#fff" },
    secondary: { background: "#fff", color: C.ink, border: `1px solid ${C.lineStrong}` },
    ghost: { background: "transparent", color: C.inkSoft },
    danger: { background: "#fff", color: C.rust, border: `1px solid ${C.rust}55` },
  };
  return (
    <button type={type} onClick={disabled ? undefined : onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.opacity = 0.85; }}
      onMouseOut={(e) => { if (!disabled) e.currentTarget.style.opacity = 1; }}>
      {Icon && <Icon size={small ? 14 : 15} />}
      {children}
    </button>
  );
}

function Metric({ label, value, sub, icon: Icon, tone = C.ink }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 96 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tone}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={tone} strokeWidth={2} />
        </div>
      </div>
      <div style={{ ...tabular, fontFamily: "Roboto, Arial, sans-serif", fontSize: 28, color: C.ink, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.inkSoft }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
        <div style={{ width: 4, borderRadius: 2, background: C.blue }} />
        <div>
          {eyebrow && <div style={{ fontSize: 11.5, color: C.blue, fontWeight: 700, letterSpacing: 0, marginBottom: 3 }}>{eyebrow}</div>}
          <h2 style={{ ...serif, fontSize: 24, color: C.ink, margin: 0 }}>{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", border: `1px solid ${C.lineStrong}`, borderRadius: 4, padding: "9px 11px",
  fontSize: 13.5, color: C.ink, background: "#fff", fontFamily: BODY_FONT,
  boxSizing: "border-box",
};

function BrandMark({ light = false, size = 34 }) {
  const color = light ? "#FFFFFF" : C.ink;
  const compact = size <= 30;
  const hindiSize = Math.max(16, Math.round(size * 0.64));
  const englishSize = Math.max(10.5, Math.round(size * 0.46));
  const taglineSize = Math.max(8.5, Math.round(size * 0.28));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: size, height: size, position: "relative", color }}>
        <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
          <path d="M8 31C12 18 20 11 32 10C26 15 22 22 20 34" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M15 34C20 22 29 16 41 17C34 21 29 27 27 37" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M7 37H42" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div style={{ ...serif, fontSize: hindiSize, lineHeight: 1, color }}>व्यवसाय</div>
        <div style={{ fontSize: englishSize, lineHeight: 1.1, marginTop: 2, color, fontWeight: 600 }}>Vyavsay</div>
        {!compact && <div style={{ fontSize: taglineSize, color: light ? "#D6E7F7" : C.inkSoft, marginTop: 2 }}>Innovation. Collaboration. Impact.</div>}
      </div>
    </div>
  );
}

function AshokaPillarMark() {
  return (
    <svg viewBox="0 0 32 40" width="24" height="30" fill="none" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <circle cx="16" cy="6" r="3.2" fill={C.ink} />
      <circle cx="10.5" cy="8" r="2.7" fill={C.ink} />
      <circle cx="21.5" cy="8" r="2.7" fill={C.ink} />
      <path d="M8 12h16l-2.2 7H10.2L8 12Z" fill={C.ink} />
      <path d="M11 20h10v3H11zM8.5 25h15v2.8h-15z" fill={C.ink} />
      <circle cx="16" cy="31.5" r="3.3" stroke={C.ink} strokeWidth="1.4" />
      <path d="M16 28.2v6.6M12.7 31.5h6.6M13.7 29.2l4.6 4.6M18.3 29.2l-4.6 4.6" stroke={C.ink} strokeWidth=".8" />
      <path d="M7 36h18M9 38.5h14" stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AshokChakraArt() {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <div
      className="vyavsay-chakra"
      style={{
        position: "absolute", left: -105, top: "50%", transform: "translateY(-50%)",
        width: 330, height: 330, color: "#03203E", opacity: 0.42, pointerEvents: "none", zIndex: 0,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 330 330" width="100%" height="100%" fill="none">
        <g className="vyavsay-chakra-spin">
          <circle cx="165" cy="165" r="132" stroke="currentColor" strokeWidth="7" />
          <circle cx="165" cy="165" r="22" stroke="currentColor" strokeWidth="5" />
          <circle cx="165" cy="165" r="8" fill="currentColor" />
          {spokes.map((angle) => (
            <g key={angle} transform={`rotate(${angle} 165 165)`}>
              <path d="M165 35L165 143" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M165 187L165 295" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function HeroArt() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 28, top: 44, width: 430, height: 230, opacity: 0.95 }}>
        <svg viewBox="0 0 430 230" width="100%" height="100%" fill="none" aria-hidden="true">
          <path d="M18 191H418" stroke="#B6D4EA" strokeWidth="2" />
          <path d="M266 84C298 71 327 71 360 85" stroke="#F29B3D" strokeWidth="9" strokeLinecap="round" />
          <path d="M278 101C308 91 334 91 366 103" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
          <path d="M290 118C319 110 344 111 374 122" stroke="#138B55" strokeWidth="9" strokeLinecap="round" />
          <circle cx="334" cy="102" r="8" stroke="#315D9A" strokeWidth="2" />
          <path d="M51 190V121H130V190" fill="#DDEDF9" stroke="#9EC4DE" />
          <path d="M67 121V98H114V121" fill="#CBE4F6" stroke="#9EC4DE" />
          <path d="M78 98V78H103V98" fill="#BCD9EC" stroke="#9EC4DE" />
          <path d="M45 121H136L126 108H56L45 121Z" fill="#F3C271" />
          <path d="M73 190V151C73 139 82 131 91 131C101 131 109 139 109 151V190" fill="#FFFFFF" stroke="#9EC4DE" />
          {[61,121].map((x) => <path key={x} d={`M${x} 135H${x + 16}V153H${x}V135Z`} fill="#FFFFFF" stroke="#9EC4DE" />)}
          <path d="M190 190V130H236V190" fill="#E6F3FB" stroke="#B6D4EA" />
          <path d="M251 190V112H286V190" fill="#D9ECF9" stroke="#B6D4EA" />
          <path d="M303 190V143H341V190" fill="#EAF6FC" stroke="#B6D4EA" />
          <path d="M358 190V124H392V190" fill="#D9ECF9" stroke="#B6D4EA" />
          <circle cx="159" cy="162" r="31" fill="#FFFFFF" stroke="#B6D4EA" />
          <path d="M142 164L155 176L178 148" stroke={C.teal} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="116" y="164" width="92" height="42" rx="8" fill="#FFFFFF" stroke="#B6D4EA" />
          <path d="M129 178H174M129 191H193" stroke="#86AFCB" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ position: "absolute", right: -60, bottom: -70, width: 360, height: 180, background: "rgba(11,92,173,0.08)", borderRadius: "50%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MOCK DATA                                                              */
/* ---------------------------------------------------------------------- */
const CHALLENGES = [
  { id: "SIH26136", title: "Startup-friendly public procurement mechanism", dept: "Skills, Employment & Innovation", status: "Applications Open", apps: 14, budget: "₹18–35 L", deadline: "30 Sep 2026", theme: "Miscellaneous", risk: "Medium" },
  { id: "MH-AG-0091", title: "Early detection of crop disease & pest infestation", dept: "Agriculture", status: "Expert Evaluation", apps: 22, budget: "₹12–20 L", deadline: "12 Sep 2026", theme: "AgriTech", risk: "Low" },
  { id: "MH-HL-0044", title: "Rural primary healthcare access & quality", dept: "Public Health", status: "Startup Shortlisted", apps: 31, budget: "₹40–60 L", deadline: "Closed", theme: "HealthTech", risk: "High" },
  { id: "MH-TR-0022", title: "Real-time public transport tracking", dept: "Transport", status: "Pilot Active", apps: 9, budget: "₹25 L", deadline: "Closed", theme: "Mobility", risk: "Medium" },
  { id: "MH-ED-0013", title: "Aligning skilling programs to job market demand", dept: "Skills & Employment", status: "Under Review", apps: 0, budget: "TBD", deadline: "Draft", theme: "EdTech", risk: "Low" },
  { id: "MH-WT-0007", title: "Decentralised water-quality monitoring", dept: "Water Resources", status: "Independent Validation", apps: 17, budget: "₹22 L", deadline: "Closed", theme: "CleanTech", risk: "Medium" },
];

// NOTE: AI Startup Discovery matching and Auto-Eligibility Screening logic
// used to live here as client-side functions. Both now run on the backend
// (see /backend/src/matching.js and /backend/src/eligibility.js) — the two
// panels below (StartupDiscoveryPanel, EligibilityPanel) fetch live results
// from the API instead of computing them in the browser.

const MILESTONES = [
  { n: "M1 — Sandbox setup & data access", due: "10 Oct 2026", amt: "₹4,00,000", status: "Payment Processing" },
  { n: "M2 — Pilot deployment, 3 districts", due: "05 Nov 2026", amt: "₹8,00,000", status: "Milestone Review" },
  { n: "M3 — Mid-pilot performance report", due: "20 Dec 2026", amt: "₹5,00,000", status: "Pilot Active" },
  { n: "M4 — Final validation & handover", due: "15 Feb 2027", amt: "₹6,00,000", status: "Draft Challenge" },
];

const PAYMENTS = [
  { startup: "TrackNova", milestone: "M1 — Sandbox setup", amt: "₹4,00,000", status: "Paid", days: "—" },
  { startup: "AgriSense Labs", milestone: "M2 — Field deployment", amt: "₹6,50,000", status: "Approval Pending", days: "4 days" },
  { startup: "JalMitra", milestone: "M1 — Sensor install", amt: "₹3,20,000", status: "Overdue", days: "11 days" },
  { startup: "NirogStream", milestone: "M3 — Report submission", amt: "₹2,80,000", status: "Invoice Uploaded", days: "1 day" },
];



const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "challenges", label: "Challenges", icon: Target },
  { key: "marketplace", label: "Startup Marketplace", icon: Rocket },
  { key: "evaluation", label: "Evaluations", icon: ClipboardCheck },
  { key: "pilots", label: "Pilots", icon: FlaskConical },
  { key: "contracts", label: "Contracts", icon: FileSignature },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "validation", label: "Validation", icon: ShieldCheck },
  { key: "scaleup", label: "Scale-Up", icon: TrendingUp },
  { key: "templates", label: "Templates", icon: Library },
];

const ROLES = ["Government Official", "Startup", "Expert Evaluator", "Validation Agency"];

/* ---------------------------------------------------------------------- */
/*  ROLE-BASED ACCESS — every nav destination is explicitly allow-listed   */
/*  Each role sees only the workspaces relevant to its responsibilities.    */
/*  This list is the single                                             */
/*  source of truth for both the sidebar (what's shown) and the router     */
/*  (what's actually renderable) — see canAccess() below.                  */
/* ---------------------------------------------------------------------- */
const NAV_BY_ROLE = {
  "Government Official": ["dashboard", "challenges", "marketplace", "pilots", "contracts", "payments", "templates"],
  "Startup": ["dashboard", "challenges", "pilots", "contracts", "payments", "validation", "scaleup", "templates"],
  "Expert Evaluator": ["dashboard", "challenges", "evaluation", "templates"],
  "Validation Agency": ["dashboard", "validation", "scaleup", "templates"],
};

// Detail/flow views reachable from an allowed nav item but not in NAV itself.
const VIEW_PARENT = { "challenge-detail": "challenges", "create-challenge": "challenges" };

function canAccess(role, view) {
  const allowed = NAV_BY_ROLE[role] || [];
  return allowed.includes(VIEW_PARENT[view] || view);
}

function defaultViewFor(role) {
  return (NAV_BY_ROLE[role] && NAV_BY_ROLE[role][0]) || "dashboard";
}

/* ---------------------------------------------------------------------- */
/*  APP SHELL                                                              */
/* ---------------------------------------------------------------------- */
/* ---------------------------------------------------------------------- */
/*  GUEST OVERVIEW — explains the product before entering the workspace    */
/* ---------------------------------------------------------------------- */
function WarliBorder({ label = "Decorative Warli folk-art border" }) {
  return (
    <div className="vyavsay-warli-border" role="img" aria-label={label}>
      <svg
        viewBox="0 0 1440 52"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="vyavsay-warli-tile" width="240" height="52" patternUnits="userSpaceOnUse">
            <rect width="240" height="52" fill="#7a1f1f" />
            <g fill="none" stroke="#f5e6c8" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 5H240M0 47H240" strokeDasharray="1 5" />

              {/* Dancing figure */}
              <circle cx="28" cy="16" r="3" />
              <path d="M28 19L22 28L34 28ZM28 28L22 38M28 28L35 38M23 23L15 19M33 23L41 18" />

              {/* Musician with drum */}
              <circle cx="67" cy="16" r="3" />
              <path d="M67 19L61 28L73 28ZM67 28L62 38M67 28L73 38M62 23L54 28M72 23L79 28" />
              <ellipse cx="82" cy="29" rx="6" ry="4" />
              <path d="M78 25L86 33M78 33L86 25" />

              {/* Tree */}
              <path d="M112 39V23M112 27L104 20M112 29L120 21M112 24L108 16M112 24L116 15" />
              <circle cx="104" cy="19" r="3" /><circle cx="108" cy="14" r="3" />
              <circle cx="116" cy="14" r="3" /><circle cx="121" cy="20" r="3" />

              {/* Farmer */}
              <circle cx="146" cy="16" r="3" />
              <path d="M146 19L140 28L152 28ZM146 28L141 38M146 28L152 38M141 23L134 29M151 23L160 19M160 19L166 39" />

              {/* Cow */}
              <path d="M178 27L199 27L204 23L210 25L207 30L199 31M181 27L177 23M183 31L181 39M197 31L200 39M207 25L212 21M210 25L214 26" />

              {/* Sun / flower */}
              <circle cx="226" cy="17" r="4" />
              <path d="M226 8V5M226 29V26M217 17H214M238 17H235M220 11L217 8M232 23L235 26M232 11L235 8M220 23L217 26" />
              <path d="M216 40Q226 32 236 40Q226 47 216 40Z" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vyavsay-warli-tile)" />
      </svg>
    </div>
  );
}

function Overview({ onEnter }) {
  const govtProblems = [
    "Formulating outcome-based problem statements",
    "Discovering suitable, eligible startups",
    "Evaluating novel, unproven technology",
    "Structuring controlled pilots",
    "Managing IP and data ownership",
    "Measuring pilot results objectively",
    "Moving a successful pilot into compliant procurement",
  ];
  const startupProblems = [
    "Prior-turnover / experience eligibility rules",
    "Long, opaque government sales cycles",
    "Unclear payment milestones",
    "Little visibility into what departments actually need",
  ];
  const stats = [
    { v: "57", l: "Active problem statements" },
    { v: "193", l: "Software + hardware challenges" },
    { v: "128", l: "Registered startups" },
    { v: "18", l: "Departments onboarded" },
  ];

  return (
    <div style={{ background: "linear-gradient(180deg, #FFFDF8 0%, #F8F1E5 100%)" }}>
      <header style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, boxShadow: "0 8px 26px rgba(6,48,92,0.05)" }}>
        <div className="vyavsay-public-header" style={{ width: "100%", boxSizing: "border-box", padding: "12px 30px", display: "flex", alignItems: "center", gap: 16, minHeight: 82, whiteSpace: "nowrap" }}>
          <div aria-hidden="true" style={{ width: 5, height: 38, borderRadius: 4, overflow: "hidden", flex: "0 0 auto", boxShadow: `0 0 0 1px ${C.line}` }}>
            <div style={{ height: "33.333%", background: "#E57A20" }} />
            <div style={{ height: "33.333%", background: "#FFFFFF" }} />
            <div style={{ height: "33.334%", background: "#0F7A3A" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
            <AshokaPillarMark />
            <div className="vyavsay-gov-copy" style={{ lineHeight: 1.08 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.ink }}>भारत सरकार</div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.ink }}>Government of India</div>
              <div style={{ fontSize: 8.5, color: C.inkSoft, marginTop: 3 }}>Ministry of Electronics &amp; IT</div>
            </div>
          </div>

          <div className="vyavsay-header-divider" aria-hidden="true" style={{ width: 1, height: 38, background: C.lineStrong, flex: "0 0 auto" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
            <div style={{ width: 28, height: 28, color: C.ink, flex: "0 0 auto" }}>
              <svg viewBox="0 0 48 48" width="28" height="28" fill="none" aria-hidden="true">
                <path d="M8 31C12 18 20 11 32 10C26 15 22 22 20 34" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M15 34C20 22 29 16 41 17C34 21 29 27 27 37" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M7 37H42" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ lineHeight: 1.08 }}>
              <div style={{ fontSize: 13, color: C.ink, fontWeight: 900 }}>व्यवसाय <span style={{ color: C.lineStrong, fontWeight: 500 }}>/</span> Vyavsay</div>
              <div className="vyavsay-brand-tagline" style={{ fontSize: 8.5, color: C.inkSoft, marginTop: 4 }}>Innovation. Collaboration. Impact.</div>
            </div>
          </div>

          <nav className="vyavsay-guest-nav" aria-label="Primary navigation" style={{ marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(10px, 1.25vw, 22px)", fontSize: 11, color: C.inkSoft, fontWeight: 700, flex: "1 1 auto", minWidth: 0 }}>
            {[
              ["Home", "होम"], ["How It Works", "कैसे काम करता है"], ["For Departments", "विभागों के लिए"],
              ["For Startups", "स्टार्टअप्स के लिए"], ["About", "परिचय"],
            ].map(([en, hi]) => (
              <span key={en} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}>
                <span>{en}</span><span style={{ fontSize: 8.5, fontWeight: 600, color: C.inkSoft }}>{hi}</span>
              </span>
            ))}
          </nav>

          <div className="vyavsay-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            <Btn variant="secondary" small onClick={() => onEnter("Government Official")}>Explore Challenges</Btn>
            <Btn small onClick={() => onEnter("Startup")}>Register Your Startup</Btn>
          </div>

          <div className="vyavsay-partner-marks" style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 10, borderLeft: `1px solid ${C.line}`, flex: "0 0 auto" }}>
            <img src="/govt-campaign-badges-strip.png" alt="Government campaign partners including G20" style={{ height: 20, width: "auto", display: "block" }} />
            <img src="/digital-india-logo.png" alt="Digital India" style={{ height: 20, width: "auto", display: "block" }} />
          </div>
        </div>
      </header>

      <WarliBorder label="Warli folk-art border below the website header" />

      {/* HERO BAND — civic illustration background with a readability overlay */}
      <div
        className="vyavsay-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "clamp(480px, 34vw, 540px)",
          backgroundColor: "#F2DFBD",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {/* Expand the complete artwork laterally to fill the compact hero. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage: `linear-gradient(rgba(58,42,24,0.10), rgba(58,42,24,0.10)), linear-gradient(90deg, rgba(255,250,240,0.92) 0%, rgba(255,250,240,0.72) 39%, rgba(255,250,240,0.42) 66%, rgba(255,250,240,0.30) 100%), url("${GUEST_BG_IMAGE}")`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        <div className="vyavsay-hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: 1480, margin: "0 auto", padding: "28px 52px 18px" }}>
          <div className="vyavsay-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.04fr 0.96fr", gap: 40, alignItems: "center" }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(224,246,238,0.9)", color: C.blue, padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 16, boxShadow: "0 4px 14px rgba(6,48,92,0.08)" }}>
                <Sparkles size={13} /> Viksit Bharat through innovation
              </div>
              <h1 className="vyavsay-hero-title" style={{ ...serif, fontSize: "clamp(34px, 2.8vw, 48px)", lineHeight: 1.08, margin: 0, marginBottom: 16, maxWidth: 680, color: C.ink }}>
                From government problems to startup solutions — <span style={{ color: C.teal }}>faster.</span>
              </h1>
              <p style={{ fontSize: "clamp(14px, 1vw, 17px)", color: C.ink, lineHeight: 1.5, maxWidth: 680, marginBottom: 20 }}>
                Vyavsay is the procurement pathway for challenges that don't fit standard tendering: define the
                problem, discover eligible startups, run a controlled pilot, pay on verified milestones, get an
                independent validation report, then decide whether to scale, all on one auditable record.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn icon={ArrowRight} onClick={() => onEnter("Government Official")}>Explore Challenges</Btn>
                <Btn variant="secondary" icon={Rocket} onClick={() => onEnter("Startup")}>Register Your Startup</Btn>
              </div>
              <div className="vyavsay-hero-logins" style={{ display: "flex", gap: 14, marginTop: 10 }}>
                <span onClick={() => onEnter("Expert Evaluator")} style={{ fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer" }}>Evaluator login →</span>
                <span onClick={() => onEnter("Validation Agency")} style={{ fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer" }}>Validation agency login →</span>
              </div>
            </div>

            <Card className="vyavsay-hero-card" style={{ position: "relative", zIndex: 1, padding: 20, borderRadius: 14, background: "rgba(255,250,242,0.91)", border: "1px solid rgba(208,122,31,0.22)", boxShadow: "0 18px 42px rgba(79,52,18,0.12)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontSize: 12, color: C.ink, fontWeight: 900, letterSpacing: 0, marginBottom: 13 }}>PLATFORM AT A GLANCE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {stats.map((s) => (
                  <div key={s.l} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.26)", border: "1px solid rgba(208,122,31,0.26)" }}>
                    <div style={{ ...tabular, fontFamily: "Roboto, Arial, sans-serif", fontSize: 31, fontWeight: 900, color: C.ink }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: C.ink, marginTop: 2, fontWeight: 500 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="vyavsay-hero-pathway" aria-label="Procurement pathway" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 4 }}>
            {[Search, FlaskConical, FileText, TrendingUp].map((Icon, index) => {
              const tones = ["#B53B43", "#287A68", "#D39622", "#258A51"];
              return (
                <React.Fragment key={index}>
                  {index > 0 && <div style={{ width: 52, height: 2, background: "rgba(255,255,255,0.92)", boxShadow: "0 1px 3px rgba(6,48,92,0.25)" }} />}
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: tones[index], color: "#fff", border: "3px solid rgba(255,255,255,0.94)", boxShadow: "0 6px 15px rgba(6,48,92,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={28} strokeWidth={2} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
            <span aria-hidden="true" style={{ width: 52, height: 2, borderRadius: 2, background: "#8f2424" }} />
            <div className="vyavsay-hero-slogan" style={{ maxWidth: 900, flex: "0 1 auto", textAlign: "center", padding: "9px 26px", borderRadius: 999, color: "#8f2424", background: "rgba(255,250,240,0.94)", border: "1px solid rgba(208,122,31,0.22)", boxShadow: "0 6px 18px rgba(79,52,18,0.11)", fontSize: "clamp(17px, 1.5vw, 24px)", lineHeight: 1.22, fontWeight: 900 }}>
              नीति सरकार की, उड़ान स्टार्टअप की — सेतु बने व्यवसाय की
            </div>
            <span aria-hidden="true" style={{ width: 52, height: 2, borderRadius: 2, background: "#8f2424" }} />
          </div>
        </div>
      </div>

      <section style={{ position: "relative", overflow: "hidden", background: "rgba(255,252,246,0.94)", borderBottom: "1px solid #E9DDCA", padding: "34px 28px 38px" }} aria-labelledby="schemes-pathways-heading">
        <AshokChakraArt />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 4, borderRadius: 2, background: C.blue }} />
            <div>
              <div style={{ fontSize: 11.5, color: C.blue, fontWeight: 700, marginBottom: 3 }}>SCHEMES, PATHWAYS & PROCUREMENT ROUTES</div>
              <h2 id="schemes-pathways-heading" style={{ ...serif, fontSize: 25, color: C.ink, margin: 0 }}>Routes from public challenge to public impact</h2>
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>सरकारी चुनौतियों से नवाचार के प्रभाव तक</div>
              <p style={{ fontSize: 13, color: C.inkSoft, margin: "7px 0 0", lineHeight: 1.55, maxWidth: 760 }}>
                One place to discover department needs, follow procurement pathways, and act on the milestones that move innovation forward.
              </p>
            </div>
          </div>
          <div className="vyavsay-schemes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { title: "Notifications", hi: "सूचनाएँ", desc: "Stay on top of every challenge, evaluation and payment milestone update relevant to your department or startup.", icon: Bell, tone: C.teal },
              { title: "Central Procurement Pathways", hi: "केंद्रीय खरीद मार्ग", desc: "A consolidated view of every innovation-procurement route available to government departments under Vyavsay.", icon: ArrowUpRight, tone: C.ink },
              { title: "Know Your Department's Challenges", hi: "अपने विभाग की चुनौतियाँ जानें", desc: "Explore live and upcoming problem statements published by departments across India.", icon: Target, tone: C.brass },
            ].map(({ title, hi, desc, icon: Icon, tone }) => (
              <div key={title} style={{ minHeight: 198, padding: 20, borderRadius: 15, background: tone, color: "#fff", boxShadow: "0 14px 32px rgba(6,48,92,0.12)", display: "flex", flexDirection: "column" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={19} color="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.2, fontWeight: 800 }}>{title}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4, opacity: 0.9 }}>{hi}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 9, opacity: 0.94, maxWidth: 360 }}>{desc}</div>
                <button
                  onClick={() => onEnter("Government Official")}
                  style={{ marginTop: "auto", alignSelf: "flex-start", border: "none", background: "#fff", color: C.ink, borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(6,48,92,0.10)" }}
                >
                  Know more <ArrowRight size={13} style={{ verticalAlign: "-2px", marginLeft: 4 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 28px 64px" }}>
      <Card style={{ marginBottom: 28, background: "#FFFCF7", border: "1px solid #E9DDCA" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>The 9-stage pathway every challenge moves through</div>
        <Stepper current="Pilot Design & Contracting" stages={PUBLIC_PATHWAY_STAGES} />
      </Card>

      <div style={{ position: "relative", overflow: "hidden", marginBottom: 32, padding: "20px 20px 20px", borderRadius: 16, background: "linear-gradient(135deg, #FFF9EE 0%, #F8EFE1 58%, #FFFDF9 100%)", border: "1px solid #E9DDCA", minHeight: 430 }}>
        <div aria-hidden="true" style={{ position: "absolute", left: -1, top: 0, bottom: 0, width: 86, pointerEvents: "none", zIndex: 0 }}>
          <svg viewBox="0 0 86 430" width="100%" height="100%" preserveAspectRatio="none" fill="none">
            <path d="M0 0H20C47 40 52 76 28 115C5 153 7 185 42 218C73 248 77 286 48 321C22 352 23 389 54 430H0V0Z" fill={C.teal} opacity="0.92" />
            <path d="M0 0H27C54 41 59 79 35 118C13 154 15 184 49 216C80 246 84 286 55 322C30 354 30 390 61 430" stroke={C.teal} strokeWidth="2" opacity="0.9" />
          </svg>
        </div>
        <img src={SOLVE_RIGHT_ART} alt="" aria-hidden="true" className="vyavsay-solve-girl" style={{ position: "absolute", right: -2, top: 0, width: 210, height: "100%", objectFit: "cover", objectPosition: "right center", pointerEvents: "none", zIndex: 0 }} />
        <div className="vyavsay-solve-content" style={{ position: "relative", zIndex: 1, paddingRight: 128, paddingLeft: 48 }}>
        <div className="vyavsay-solve-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18 }}>
          {[
            {
              title: "What it solves for departments", icon: Building2, tone: C.ink, soft: C.navySoft,
              count: "7 friction points removed",
              items: govtProblems,
              icons: [FileText, Search, FlaskConical, Layers, ScrollText, Gauge, ArrowUpRight],
            },
            {
              title: "What it solves for startups", icon: Rocket, tone: C.teal, soft: C.tealSoft,
              count: "4 barriers lowered",
              items: startupProblems,
              icons: [ShieldCheck, Clock, IndianRupee, Target],
            },
          ].map(({ title, icon: HeaderIcon, tone, soft, count, items, icons: ItemIcons }) => (
            <div
              key={title}
              className="vyavsay-solve-card"
              style={{
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden",
                boxShadow: "0 10px 26px rgba(6,48,92,0.07)", transition: "transform .18s ease, box-shadow .18s ease",
              }}
            >
              <div style={{ background: tone, color: "#fff", padding: "15px 17px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <HeaderIcon size={17} color="#fff" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.2 }}>{title}</div>
                </div>
                <div style={{ flexShrink: 0, padding: "5px 9px", borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", fontSize: 9.5, fontWeight: 800, whiteSpace: "nowrap" }}>{count}</div>
              </div>

              <div style={{ padding: "7px 17px 15px" }}>
                {items.map((item, i) => {
                  const ItemIcon = ItemIcons[i];
                  return (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, color: C.inkSoft, padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                      <span style={{ width: 29, height: 29, borderRadius: "50%", background: soft, color: tone, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ItemIcon size={14} strokeWidth={2.2} />
                      </span>
                      <span style={{ lineHeight: 1.35 }}>{item}</span>
                    </div>
                  );
                })}
                {title.includes("startups") && (
                  <div style={{ marginTop: 7, padding: "9px 10px", borderRadius: 8, background: C.tealSoft, color: C.inkSoft, fontSize: 11.2, lineHeight: 1.4 }}>
                    Relaxed turnover/experience criteria apply to DPIIT-recognised startups on eligible challenges.
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "14px 16px", borderRadius: 12, background: C.ink, color: "#fff", boxShadow: "0 10px 24px rgba(6,48,92,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileCheck2 size={17} color="#fff" />
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.95 }}>
            Standard templates for problem statements, evaluation, pilot agreements, data/IP, cybersecurity, risk and procurement pathways, with authorised review before use.
          </div>
        </div>
        <Btn variant="secondary" small icon={Library} onClick={() => onEnter("Government Official", "templates")} style={{ background: "#fff", color: C.ink, borderColor: "#fff", flexShrink: 0 }}>Browse the template library →</Btn>
      </div>
      </div>
      <WarliBorder label="Warli folk-art border above the website footer" />
      <Footer />
    </div>
  );
}

function Footer() {
  const policyLinks = [
    "Website Policies", "Help", "Contact Us", "Web Information Manager",
    "Accessibility Statement", "FAQ", "Terms & Conditions", "Screen Reader Access",
  ];

  return (
    <footer style={{ marginTop: 0, color: "#fff" }}>
      <div style={{ background: C.ink }}>
        <div className="vyavsay-footer-policy-links" style={{ maxWidth: 1180, margin: "0 auto", padding: "13px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, boxSizing: "border-box", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap" }}>
          {policyLinks.map((label) => (
            <a key={label} href="#" onClick={(e) => e.preventDefault()} style={{ color: "#fff", textDecoration: "none", opacity: 0.92 }}>{label}</a>
          ))}
        </div>
      </div>

      <div style={{ background: "#151515" }}>
        <div className="vyavsay-footer-attribution" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px 26px", display: "grid", gridTemplateColumns: "145px minmax(0,1fr) 150px", gap: 24, alignItems: "center", boxSizing: "border-box" }}>
          <div style={{ alignSelf: "start", fontSize: 10, color: "#AEB6BE", letterSpacing: 1.1, fontWeight: 800, lineHeight: 1.45 }}>
            BUILT ON
            <div style={{ color: "#E2E6EA", fontSize: 16, letterSpacing: 0.5, marginTop: 3, fontWeight: 800 }}>VYAVSAY</div>
            <div style={{ fontSize: 9, color: "#7F8992", letterSpacing: 0.3, marginTop: 2 }}>Digital Public Infrastructure</div>
          </div>

          <div style={{ color: "#AEB6BE", fontSize: 10.5, lineHeight: 1.7 }}>
            <div>Website Content owned & provided by <strong style={{ color: "#DCE1E5" }}>Ministry of Electronics & Information Technology, Government of India</strong></div>
            <div>Best viewed in Chrome, Firefox and equivalent browsers. Copyright © 2026 All Rights Reserved.</div>
            <div>Designed, Developed and Hosted by <strong style={{ color: "#DCE1E5" }}>National Informatics Centre (NIC)</strong></div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <span>Last Updated: 05 Sep 2026</span>
              <span>Total Visitors: 1,131,762,703</span>
            </div>
          </div>

          <div className="vyavsay-footer-side" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "1px solid #53616C", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "#7F9BB2" }} aria-label="Generic certification placeholder">
              <svg viewBox="0 0 64 64" width="58" height="58" fill="none" aria-hidden="true">
                <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1" />
                <path d="M22 34L28 40L43 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M32 9V14M32 50V55M9 32H14M50 32H55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" title="Back to top" style={{ width: 42, height: 42, borderRadius: "50%", border: "1px solid #53616C", background: "transparent", color: "#DCE1E5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------------- */
/*  AUTH GATE — sign in, or register with role-specific legitimacy checks. */
/*  Startups: MCA-format CIN (+ optional DPIIT number for instant verify). */
/*  Government officials: official email domain allow-list.               */
/*  Expert Evaluator / Validation Agency: pre-issued invite codes are      */
/*  required because these oversight roles are not open self-signup.        */
/*  See backend/src/auth.js.                                               */
/* ---------------------------------------------------------------------- */
const INVITE_ONLY_ROLES = ["Expert Evaluator", "Validation Agency"];

function AuthGate({ initialMode = "login", initialRole = "Startup", nextView, onAuthenticated, onCancel }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Checked by default: once someone has registered, they shouldn't have to
  // register or sign back in again on this device. Unchecking opts back into
  // the shorter, more cautious 8-hour session (e.g. a shared computer).
  const [rememberMe, setRememberMe] = useState(true);

  // Lightweight client-side checks so obviously-incomplete submissions never
  // round-trip to the server — the backend still re-validates everything
  // (see backend/src/auth.js), this is purely for faster, friendlier feedback.
  function clientError() {
    const email = (fields.email || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (!fields.password) return "Enter your password.";
    if (mode === "login") return null;
    if (fields.password.length < 8 || !/[0-9]/.test(fields.password) || !/[a-zA-Z]/.test(fields.password)) {
      return "Password must be at least 8 characters and include a letter and a number.";
    }
    if (!fields.name || !fields.name.trim()) return "Full name is required.";
    if (role === "Startup") {
      if (!fields.companyName || !fields.companyName.trim()) return "Company name is required.";
      if (!/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test((fields.cin || "").toUpperCase().trim())) {
        return "Enter a valid 21-character CIN (e.g. U72900MH2019PTC123456).";
      }
    }
    if (role === "Government Official") {
      if (!fields.department || !fields.department.trim()) return "Department is required.";
      if (!fields.designation || !fields.designation.trim()) return "Designation is required.";
      if (!/\.gov\.in$|\.nic\.in$/.test(email.toLowerCase())) return "Use your official government email address.";
    }
    if (INVITE_ONLY_ROLES.includes(role) && !(fields.inviteCode || "").trim()) {
      return "A valid invitation code is required for this role.";
    }
    return null;
  }

  async function submit(e) {
    if (e) e.preventDefault();
    const localError = clientError();
    if (localError) { setError(localError); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = mode === "login"
        ? await api.login(fields.email.trim(), fields.password, rememberMe)
        : await api.register({ ...fields, role, email: fields.email.trim(), name: fields.name.trim(), rememberMe });
      onAuthenticated(res.user, nextView);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,35,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 8, width: 460, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(10,20,35,0.35)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BrandMark size={26} />
          <X size={18} color={C.inkSoft} style={{ cursor: "pointer" }} onClick={onCancel} />
        </div>
        <form style={{ padding: 22 }} onSubmit={submit}>
          <div style={{ display: "flex", gap: 4, background: C.paper, borderRadius: 6, padding: 3, marginBottom: 18 }}>
            {["login", "register"].map((m) => (
              <div key={m} onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 5, fontSize: 12.8, fontWeight: 700, cursor: "pointer",
                  background: mode === m ? "#fff" : "transparent", color: mode === m ? C.ink : C.inkSoft,
                  boxShadow: mode === m ? "0 1px 4px rgba(10,20,35,0.12)" : "none",
                }}>
                {m === "login" ? "Sign in" : "Register"}
              </div>
            ))}
          </div>

          {mode === "register" && (
            <Field label="I am registering as">
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          )}
          {mode === "register" && <Field label="Full name"><input style={inputStyle} value={fields.name} onChange={set("name")} /></Field>}
          <Field label={mode === "register" && role === "Government Official" ? "Official email" : "Email"}>
            <input type="email" style={inputStyle} value={fields.email} onChange={set("email")}
              placeholder={mode === "register" && role === "Government Official" ? "name@maharashtra.gov.in" : ""} />
          </Field>
          <Field label="Password" hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}>
            <input type="password" style={inputStyle} value={fields.password} onChange={set("password")} />
          </Field>

          {mode === "register" && role === "Startup" && (
            <>
              <Field label="Company name"><input style={inputStyle} value={fields.companyName || ""} onChange={set("companyName")} /></Field>
              <Field label="CIN (Corporate Identification Number)" hint="21-character MCA registration number — confirms this is a registered legal entity.">
                <input style={inputStyle} placeholder="U72900MH2019PTC123456" value={fields.cin || ""} onChange={set("cin")} />
              </Field>
              <Field label="DPIIT recognition number (optional)" hint="Provide this for instant verification. Without it your account is created as Pending Verification, subject to manual document review.">
                <input style={inputStyle} value={fields.dpiitNumber || ""} onChange={set("dpiitNumber")} />
              </Field>
              <Field label="Sector (optional)"><input style={inputStyle} value={fields.sector || ""} onChange={set("sector")} /></Field>
            </>
          )}

          {mode === "register" && role === "Government Official" && (
            <>
              <Field label="Department"><input style={inputStyle} value={fields.department || ""} onChange={set("department")} /></Field>
              <Field label="Designation"><input style={inputStyle} value={fields.designation || ""} onChange={set("designation")} /></Field>
              <Field label="Employee / government ID (optional)"><input style={inputStyle} value={fields.employeeId || ""} onChange={set("employeeId")} /></Field>
            </>
          )}

          {mode === "register" && INVITE_ONLY_ROLES.includes(role) && (
            <>
              <Field label="Organization / affiliation"><input style={inputStyle} value={fields.organization || ""} onChange={set("organization")} /></Field>
              <Field label="Invite code" hint="This oversight role cannot be self-registered without an invitation code.">
                <input style={inputStyle} value={fields.inviteCode || ""} onChange={set("inviteCode")} />
              </Field>
            </>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.inkSoft, marginBottom: 14, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: 14, height: 14 }} />
            Keep me signed in on this device
          </label>

          {error && <div role="alert" style={{ fontSize: 12.5, color: C.rust, background: `${C.rust}10`, padding: "9px 11px", borderRadius: 5, marginBottom: 14 }}>{error}</div>}

          <Btn type="submit" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
            {submitting ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}
          </Btn>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState("dashboard");
  const [role, setRole] = useState("Government Official");
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authGate, setAuthGate] = useState(null); // null | { mode, role, nextView }
  const [language, setLanguage] = useState(() => localStorage.getItem("vyavsay.language") || "en");

  useEffect(() => {
    localStorage.setItem("vyavsay.language", language);
    document.documentElement.lang = language;
  }, [language]);

  // Hydrate an existing session (httpOnly cookie) on load, if any.
  useEffect(() => {
    api.getMe().then((res) => setAuthUser(res.user)).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  const goDetail = (ch) => { setSelectedChallenge(ch); setView("challenge-detail"); };

  // Land the person on a view their own role can actually see. A requested
  // view that isn't on their role's allow-list (e.g. a stale link, or the
  // "browse templates" shortcut clicked by a role that landed elsewhere)
  // falls back to that role's default workspace instead of being honoured.
  const enterAtRole = (userRole, nextView) => {
    setRole(userRole);
    setEntered(true);
    setView(nextView && canAccess(userRole, nextView) ? nextView : defaultViewFor(userRole));
  };

  // Entry points from the overview page. Already-signed-in users go straight
  // in, under their OWN role — the role tied to the button they clicked is
  // only a hint for which login/register form to show a signed-out visitor.
  const requestEntry = (r, nextView) => {
    if (authUser) { enterAtRole(authUser.role, nextView); return; }
    setAuthGate({ mode: r === "Startup" ? "register" : "login", role: r, nextView: nextView || "dashboard" });
  };

  const handleAuthenticated = (user, nextView) => {
    setAuthUser(user);
    setAuthGate(null);
    enterAtRole(user.role, nextView);
  };

  const signOut = () => {
    api.logout().catch(() => {});
    setAuthUser(null);
    setEntered(false);
    setRoleMenuOpen(false);
  };

  // Safety net: if the current view ever falls outside what this role is
  // allowed to see (e.g. role changes after re-hydrating a session, or a
  // stale `view` survives a sign-in as a different role), snap back to a
  // view the role can actually access rather than rendering it anyway.
  useEffect(() => {
    if (entered && !canAccess(role, view)) setView(defaultViewFor(role));
  }, [entered, role, view]);

  if (!authChecked) return null;

  if (!entered) {
    return (
      <div style={{ background: C.paper, minHeight: "100vh", color: C.ink, fontFamily: BODY_FONT }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ position: "fixed", zIndex: 110, right: 18, top: 14 }}><LanguageSelector language={language} onChange={setLanguage} /></div>
        <Overview onEnter={requestEntry} />
        <VyavsayAssistant view="guest" avatarSrc={SAFE_GUIDE_AVATAR} role="Guest" />
        {authGate && (
          <AuthGate
            initialMode={authGate.mode} initialRole={authGate.role} nextView={authGate.nextView}
            onAuthenticated={handleAuthenticated} onCancel={() => setAuthGate(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={view === "templates" ? "templates-shell" : undefined} style={{ background: C.paper, minHeight: "100vh", color: C.ink, fontFamily: BODY_FONT, fontSize: 14, display: "flex" }}>
      <style>{FONT_IMPORT}</style>
      {/* SIDEBAR */}
      <aside style={{ width: 216, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: "#FAFDFF", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${C.line}` }}>
          <div onClick={() => setEntered(false)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} title="Back to overview">
            <BrandMark size={30} />
          </div>
        </div>
        <nav style={{ padding: "10px 10px", flex: 1, overflowY: "auto" }}>
          {NAV.filter((n) => (NAV_BY_ROLE[role] || []).includes(n.key)).map((n) => {
            const active = view === n.key || (n.key === "challenges" && view === "challenge-detail") || (n.key === "challenges" && view === "create-challenge");
            const Icon = n.icon;
            return (
              <div key={n.key} onClick={() => setView(n.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 4,
                  cursor: "pointer", marginBottom: 2, fontSize: 13, fontWeight: active ? 700 : 500,
                  background: active ? C.blueSoft : "transparent", color: active ? C.blue : C.inkSoft,
                  borderLeft: active ? `3px solid ${C.blue}` : "3px solid transparent",
                }}>
                <Icon size={15} />
                {t(language, n.label)}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 10.5, color: C.inkSoft, marginBottom: 6, fontWeight: 600 }}>PLATFORM INTEGRITY</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.teal, fontWeight: 600 }}>
            <ShieldCheck size={13} /> Audit trail active
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* TOPBAR */}
        <header style={{ height: 64, borderBottom: `1px solid ${C.line}`, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "0 22px", gap: 16, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ flex: 1, maxWidth: 420, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 10 }} color={C.inkSoft} />
            <input placeholder={t(language, "Search challenges, startups, departments…")}
              style={{ ...inputStyle, paddingLeft: 32, background: "#F4FAFF", border: `1px solid ${C.line}`, borderRadius: 999 }} />
          </div>
          <div style={{ flex: 1 }} />
          <LanguageSelector language={language} onChange={setLanguage} />
          <Bell size={17} color={C.inkSoft} style={{ cursor: "pointer" }} />
          <div style={{ position: "relative" }}>
            <div onClick={() => { if (!["validation", "scaleup", "templates"].includes(view)) setRoleMenuOpen((s) => !s); }}
              style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", border: `1px solid ${C.line}`, borderRadius: 4, padding: "6px 10px" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.brassSoft, color: C.brass, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                {["validation", "scaleup", "templates"].includes(view) ? "W" : role[0]}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{["validation", "scaleup", "templates"].includes(view) ? "Select account in workspace" : (authUser?.name || role)}</div>
              {!["validation", "scaleup", "templates"].includes(view) && <ChevronDown size={14} color={C.inkSoft} />}
            </div>
            {!["validation", "scaleup", "templates"].includes(view) && roleMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: 38, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 5, width: 236, boxShadow: "0 6px 18px rgba(20,33,61,0.1)", zIndex: 20 }}>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{authUser?.name || role}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>{authUser?.email || "Not signed in"}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{role}</div>
                  {authUser && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 10.5, fontWeight: 700, color: authUser.verificationStatus === "Verified" ? C.teal : C.brass }}>
                      {authUser.verificationStatus === "Verified" ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
                      {authUser.verificationStatus}
                    </div>
                  )}
                </div>
                  <div onClick={signOut} style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", color: C.rust, fontWeight: 600 }}>{t(language, "Sign out")}</div>
              </div>
            )}
          </div>
        </header>

        {authUser && authUser.verificationStatus !== "Verified" && (
          <div style={{ background: C.brassSoft, borderBottom: `1px solid ${C.brass}44`, padding: "9px 22px", fontSize: 12.5, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} color={C.brass} />
            {authUser.verificationNote || "Your account is pending verification."}
          </div>
        )}

        <main style={{ padding: 26, maxWidth: 1320 }}>
          {!canAccess(role, view) ? (
            <Unauthorized role={role} onBack={() => setView(defaultViewFor(role))} />
          ) : (
            <>
              {view === "dashboard" && <Dashboard role={role} name={authUser?.name} onOpenChallenge={goDetail} setView={setView} />}
              {view === "challenges" && <ChallengesList onOpen={goDetail} onCreate={() => { setEditingChallenge(null); setView("create-challenge"); }} />}
              {view === "challenge-detail" && <ChallengeDetail ch={selectedChallenge || CHALLENGES[0]} role={role} onBack={() => setView("challenges")} onChanged={(challenge) => setSelectedChallenge(challenge)} onEdit={(challenge) => { setEditingChallenge(challenge); setView("create-challenge"); }} />}
              {view === "create-challenge" && <CreateChallenge language={language} role={role} userId={authUser?.id} verifiedDepartment={authUser?.profile?.department} initialDraft={editingChallenge} onDone={(newCh) => { setEditingChallenge(null); if (newCh) { setSelectedChallenge(newCh); setView("challenge-detail"); } else { setView("challenges"); } }} />}
              {view === "marketplace" && <Marketplace role={role} />}
              {view === "evaluation" && <EvaluationWorkspace />}
              {view === "pilots" && <Pilots />}
              {view === "contracts" && <Contracts onPayments={() => setView("payments")} />}
              {view === "payments" && <PaymentsWorkspace platformRole={role} organisationName={role === "Startup" ? authUser?.profile?.companyName : role === "Government Official" ? authUser?.profile?.department : ""} />}
              {view === "validation" && <ValidationWorkspace onPayments={() => setView("payments")} />}
              {view === "scaleup" && <ScaleUpWorkspace onValidation={() => setView("validation")} />}
              {view === "templates" && <TemplatesWorkspace />}
            </>
          )}
        </main>
        <VyavsayAssistant view={view} avatarSrc={SAFE_GUIDE_AVATAR} role={role} contextRef={selectedChallenge?.id || null} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  UNAUTHORIZED FALLBACK — shown if a role somehow lands on a view it     */
/*  isn't permitted to see. Should be unreachable via normal navigation    */
/*  (the sidebar and redirect effect already prevent it) but guards        */
/*  against stale state.                                                  */
/* ---------------------------------------------------------------------- */
function Unauthorized({ role, onBack }) {
  return (
    <Card style={{ textAlign: "center", padding: "48px 24px", maxWidth: 480, margin: "40px auto" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.rustSoft, color: C.rust, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Lock size={20} />
      </div>
      <h2 style={{ ...serif, fontSize: 19, margin: "0 0 8px", color: C.ink }}>You don't have access to this</h2>
      <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 18px" }}>
        This section isn't part of the {role} workspace. If you believe this is a mistake, contact your department administrator.
      </p>
      <Btn onClick={onBack}>Back to your dashboard</Btn>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  DASHBOARD                                                              */
/* ---------------------------------------------------------------------- */
const DASHBOARD_ICONS = {
  Target, Rocket, FileText, ClipboardCheck, FlaskConical, Wallet, ShieldCheck,
  AlertTriangle, Users, Gauge, CheckCircle2, IndianRupee,
};

function Dashboard({ role, name, onOpenChallenge, setView }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real, role-scoped data from the backend (see GET /api/dashboard/summary)
  // — re-fetched on every mount, so a startup's own registration/application,
  // an evaluator's own submitted scores, or a department's own drafts show up
  // here as soon as they're saved, without any hard-coded numbers per role.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getDashboardSummary()
      .then((res) => { if (!cancelled) { setSummary(res); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role]);

  const metricTones = [C.brass, C.teal, C.violet, C.blue, C.rust, C.teal];
  const metrics = summary?.metrics || [];
  const tasks = summary?.tasks || [];
  const tasksTitle = summary?.tasksTitle || "Your tasks";

  return (
    <div>
      <Card style={{ position: "relative", overflow: "hidden", marginBottom: 22, minHeight: 138, background: `linear-gradient(110deg, #FFFFFF 0%, ${C.skySoft} 100%)` }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 620 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.blueSoft, color: C.blue, padding: "5px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, marginBottom: 12 }}>
            <ShieldCheck size={13} /> Trusted government-startup workspace
          </div>
          <h1 style={{ ...serif, fontSize: 26, margin: 0, color: C.ink }}>
            Welcome back, {name || (role === "Startup" ? "there" : role)}
          </h1>
          <p style={{ fontSize: 13.2, color: C.inkSoft, lineHeight: 1.6, maxWidth: 560, margin: "8px 0 0" }}>
            Track challenges, pilots, contracts, validation evidence and payments through one transparent Vyavsay pipeline.
          </p>
        </div>
        <div style={{ position: "absolute", right: 18, bottom: -5, width: 290, opacity: 0.56 }}>
          <svg viewBox="0 0 320 120" width="100%" height="100%" fill="none" aria-hidden="true">
            <path d="M4 105H316" stroke="#9EC4DE" strokeWidth="2" />
            <path d="M188 105V58H227V105M195 58V45H220V58M202 45V35H213V45" fill="#CFE7F8" stroke="#9EC4DE" />
            <path d="M238 105V70H268V105M279 105V48H304V105M137 105V78H174V105" fill="#E2F2FC" stroke="#B6D4EA" />
            <path d="M25 105V68H92V105M37 68V53H80V68M48 53V39H69V53" fill="#D7ECFA" stroke="#9EC4DE" />
            <path d="M20 68H98L89 58H29L20 68Z" fill="#F4C879" />
          </svg>
        </div>
      </Card>
      <SectionTitle
        eyebrow={role.toUpperCase()}
        title={role === "Startup" ? "Your pipeline, at a glance" : "Innovation procurement overview"}
        right={role === "Government Official" && <Btn icon={Plus} onClick={() => setView("create-challenge")}>New Challenge</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 24 }}>
        {loading && !summary && [0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, height: 92, opacity: 0.5 }} />
        ))}
        {!loading && error && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: C.rust, background: `${C.rust}10`, padding: "10px 12px", borderRadius: 6 }}>
            Couldn't load your dashboard data ({error}). <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setView(role)}>Retry</span>
          </div>
        )}
        {metrics.map((m, i) => (
          <Metric key={m.label} label={m.label} value={m.value} sub={m.sub} icon={DASHBOARD_ICONS[m.icon] || Target} tone={metricTones[i % metricTones.length]} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{tasksTitle}</div>
            {role !== "Startup" && <span onClick={() => setView("challenges")} style={{ fontSize: 12.5, color: C.brass, fontWeight: 600, cursor: "pointer" }}>View all →</span>}
          </div>
          {tasks.length === 0 && !loading ? (
            <p style={{ fontSize: 12.5, color: C.inkSoft, textAlign: "center", padding: "28px 0" }}>Nothing needs your attention right now.</p>
          ) : (
            <div>
              {tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.title}</div>
                    {t.meta && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>{t.meta}</div>}
                  </div>
                  <StatusChip label={t.status} small />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>Quick actions</div>
          {(NAV_BY_ROLE[role] || []).filter((v) => v !== "dashboard").map((v) => {
            const item = NAV.find((n) => n.key === v);
            if (!item) return null;
            return (
              <div key={v} onClick={() => setView(v)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <item.icon size={15} color={C.inkSoft} />
                <span style={{ fontSize: 12.8, color: C.ink, fontWeight: 600 }}>{item.label}</span>
                <ChevronRight size={14} color={C.inkSoft} style={{ marginLeft: "auto" }} />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  CHALLENGE TABLE (shared)                                               */
/* ---------------------------------------------------------------------- */
function ChallengeTable({ rows, onOpen, compact }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.8 }}>
      <thead>
        <tr style={{ textAlign: "left", color: C.inkSoft, fontSize: 11 }}>
          <th style={{ padding: "6px 8px", fontWeight: 600 }}>ID</th>
          <th style={{ padding: "6px 8px", fontWeight: 600 }}>Title</th>
          {!compact && <th style={{ padding: "6px 8px", fontWeight: 600 }}>Department</th>}
          <th style={{ padding: "6px 8px", fontWeight: 600 }}>Status</th>
          {!compact && <th style={{ padding: "6px 8px", fontWeight: 600 }}>Applications</th>}
          {!compact && <th style={{ padding: "6px 8px", fontWeight: 600 }}>Budget</th>}
          <th style={{ padding: "6px 8px", fontWeight: 600 }}>Deadline</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onOpen(r)} style={{ borderTop: `1px solid ${C.line}`, cursor: "pointer" }}
            onMouseOver={(e) => (e.currentTarget.style.background = C.paper)}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
            <td style={{ padding: "9px 8px", ...mono, fontSize: 11.5, color: C.inkSoft }}>{r.id}</td>
            <td style={{ padding: "9px 8px", fontWeight: 600 }}>{r.title}</td>
            {!compact && <td style={{ padding: "9px 8px", color: C.inkSoft }}>{r.dept}</td>}
            <td style={{ padding: "9px 8px" }}><StatusChip label={r.status} small /></td>
            {!compact && <td style={{ padding: "9px 8px" }}>{r.apps}</td>}
            {!compact && <td style={{ padding: "9px 8px" }}>{r.budget}</td>}
            <td style={{ padding: "9px 8px", color: r.deadline === "Closed" ? C.inkSoft : C.rust }}>{r.deadline}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------------------- */
/*  CHALLENGES LIST                                                        */
/* ---------------------------------------------------------------------- */
function ChallengesList({ onOpen, onCreate }) {
  const [filter, setFilter] = useState("All");
  const [challenges, setChallenges] = useState(CHALLENGES);
  const [loading, setLoading] = useState(true);
  const filters = ["All", "Applications Open", "Expert Evaluation", "Pilot Active", "Independent Validation"];

  useEffect(() => {
    let cancelled = false;
    api.getChallenges()
      .then((res) => { if (!cancelled) setChallenges(res); })
      .catch(() => { /* backend unreachable — keep the static demo list */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = filter === "All" ? challenges : challenges.filter((c) => c.status === filter);

  return (
    <div>
      <SectionTitle eyebrow="CHALLENGE PIPELINE" title="Challenges" right={<Btn icon={Plus} onClick={onCreate}>Create Challenge</Btn>} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <div key={f} onClick={() => setFilter(f)}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === f ? C.ink : C.line}`,
              background: filter === f ? C.ink : "#fff", color: filter === f ? "#fff" : C.inkSoft,
            }}>
            {f}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {loading && <span style={{ fontSize: 11.5, color: C.inkSoft, alignSelf: "center" }}>Loading live challenges…</span>}
        <Btn variant="secondary" icon={Filter} small>More filters</Btn>
      </div>
      <Card noPad>
        <div style={{ padding: 6 }}><ChallengeTable rows={rows} onOpen={onOpen} /></div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  CHALLENGE DETAIL                                                       */
/* ---------------------------------------------------------------------- */
function ChallengeDetail({ ch, onBack, role, onChanged, onEdit }) {
  const [tab, setTab] = useState("Overview");
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState(null);
  const tabs = ["Overview", ...(role === "Government Official" ? ["AI Startup Discovery"] : []), "Eligibility Screening", "Expert Evaluation", "Data / IP & Security", "Submitted Ideas (14)", "Updates"];
  async function applyAsStartup() {
    setApplying(true);
    setApplicationMessage(null);
    try {
      const { startup } = await api.getMyStartup();
      if (!startup) throw new Error("Create your Startup Discovery Profile before applying.");
      const application = await api.applyToChallenge(ch.id, startup.id);
      const passed = application.status === "Eligible";
      setApplicationMessage({ type: passed ? "success" : "warning", text: passed ? "Application submitted and eligibility screening passed. It is now available to evaluators." : `Application submitted, but screening failed: ${application.reason}. Update your profile evidence and request a rescreen.` });
    } catch (error) {
      setApplicationMessage({ type: "error", text: error.message });
    } finally {
      setApplying(false);
    }
  }
  return (
    <div>
      <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.inkSoft, cursor: "pointer", marginBottom: 12, fontWeight: 600 }}>
        <ChevronLeft size={14} /> Back to Challenges
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...mono, fontSize: 11.5, color: C.inkSoft, marginBottom: 5 }}>{ch.id} · {ch.theme}</div>
            <h1 style={{ ...serif, fontSize: 26, margin: 0, marginBottom: 6, maxWidth: 640 }}>{ch.title}</h1>
            <div style={{ fontSize: 12.5, color: C.inkSoft, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={13} /> Govt. of Maharashtra — {ch.dept}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> Deadline: {ch.deadline}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IndianRupee size={13} /> Pilot budget: {ch.budget}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <StatusChip label={ch.status} />
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <Btn variant="secondary" small>Save / Watch</Btn>
              {ch.status === "Published" || ch.status === "Applications Open" ? <Btn small onClick={applyAsStartup} disabled={role !== "Startup" || applying}>{applying ? "Submitting…" : role === "Startup" ? "Apply as Startup" : "Sign in as Startup to apply"}</Btn> : <Btn small disabled>Not visible to startups</Btn>}
            </div>
            {applicationMessage && <div style={{ maxWidth: 300, marginTop: 8, fontSize: 11.5, color: applicationMessage.type === "success" ? C.teal : applicationMessage.type === "warning" ? C.brass : C.rust }}>{applicationMessage.text}</div>}
          </div>
        </div>
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
          <Stepper current={ch.status} />
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.line}` }}>
        {tabs.map((t) => (
          <div key={t} onClick={() => setTab(t)}
            style={{
              padding: "9px 14px", fontSize: 12.8, fontWeight: 600, cursor: "pointer",
              color: tab === t ? C.ink : C.inkSoft, borderBottom: tab === t ? `2px solid ${C.ink}` : "2px solid transparent",
            }}>
            {t}
          </div>
        ))}
      </div>

      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Problem summary</div>
              {ch.requirementStatement ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: C.violet, marginBottom: 6 }}>
                    <Sparkles size={12} /> {ch.draftingEngine?.startsWith("llm:") ? `MODEL-ASSISTED REQUIREMENT · ${ch.draftingEngine.replace("llm:", "")}` : "DETERMINISTIC DRAFTING SUGGESTION"}
                  </div>
                  <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, fontWeight: 500 }}>{ch.requirementStatement}</p>
                  {ch.capabilities?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {ch.capabilities.map((c) => (
                        <span key={c} style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft, border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: "2px 9px" }}>{c}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                  Conventional procurement is designed for standardised goods and established vendors, making it hard
                  for departments to test and adopt novel startup technology. This challenge seeks a transparent,
                  milestone-based pathway from problem definition to validated, scalable deployment.
                </p>
              )}
              <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8 }}>Expected measurable outcome</div>
              <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                {ch.expectedOutcome || ch.outcome || "Reduce time from challenge publication to pilot launch to under 30 days, with at least 80% of pilots reaching an independently validated performance report within the sanctioned pilot duration."}
              </p>
              {ch.constraints && <><div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8 }}>Constraints</div><p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>{ch.constraints}</p></>}
              {ch.sourceDocument && <div style={{ marginTop: 14, padding: "9px 10px", borderRadius: 5, background: C.paper, fontSize: 12, color: C.inkSoft }}><FileText size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />Source document: <b>{ch.sourceDocument.name}</b> · {Math.ceil(ch.sourceDocument.bytes / 1024)} KB · retained in the challenge audit record.</div>}
            </Card>
            <AutomatedReviewCard report={ch.automatedReview} />
            {ch.status === "Changes Requested" && (
              <Card style={{ marginBottom: 16, border: `1px solid ${C.rust}55`, background: C.rustSoft }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Automated checks need corrections</div>
                <div style={{ fontSize: 12.5, marginBottom: 10 }}>{ch.review?.findings || "Review the record and publish the corrected version."}</div>
                {role === "Government Official" && <Btn small onClick={() => onEdit(ch)}>Open correction workspace</Btn>}
              </Card>
            )}
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Clarification questions (3)</div>
              {[
                { q: "Is co-development IP shared or startup-retained?", by: "TrackNova", a: "Startup retains core IP; department gets a perpetual usage licence." },
                { q: "Can the pilot run in a single district first?", by: "AgriSense Labs", a: "Yes — single-district sandbox permitted before multi-district scale." },
              ].map((c, i) => (
                <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
                  <div style={{ fontSize: 12.8, fontWeight: 600 }}>Q: {c.q}</div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 4 }}>— {c.by}</div>
                  <div style={{ fontSize: 12.5, color: C.teal, fontWeight: 500 }}>A: {c.a}</div>
                </div>
              ))}
            </Card>
          </div>
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Eligibility requirements</div>
              {["DPIIT-recognised startup", "Incorporated < 10 years", "Relaxed turnover criteria applies", "No pending litigation with GoM"].map((e) => (
                <div key={e} style={{ display: "flex", gap: 7, fontSize: 12.5, marginBottom: 7, color: C.inkSoft }}>
                  <CheckCircle2 size={14} color={C.teal} /> {e}
                </div>
              ))}
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Procurement pathway</div>
              <StatusChip label="Officer review required" small />
              <div style={{ fontSize: 12, marginTop: 8, color: C.inkSoft }}>No route is inferred from budget, urgency or startup status alone. A reviewed Procurement Pathway Template must match an authorised, date-bounded policy before an officer selects the route.</div>
            </Card>
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Required documents</div>
              {["DPIIT certificate", "Technical proposal", "Data handling declaration", "Cybersecurity self-attestation"].map((d) => (
                <div key={d} style={{ fontSize: 12.5, color: C.inkSoft, padding: "5px 0" }}>· {d}</div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab === "AI Startup Discovery" && <StartupDiscoveryPanel ch={ch} role={role} />}
      {tab === "Eligibility Screening" && <EligibilityPanel ch={ch} role={role} />}
      {tab === "Expert Evaluation" && <ExpertEvaluationPanel ch={ch} />}
      {tab === "Data / IP & Security" && <DataIpPanel />}
      {tab === "Submitted Ideas (14)" && <SubmittedIdeasPanel />}
      {tab === "Updates" && (
        <Card>
          {(ch.history?.length ? [...ch.history].reverse().map((event) => `${event.event.replaceAll("_", " ")} · ${new Date(event.at).toLocaleString()}`) : ["Deadline extended by 10 days (05 Sep 2026)", "Clarification round opened for shortlisted applicants", "Budget band revised to ₹18–35L"]).map((u, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "9px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
              <Info size={14} color={C.brass} style={{ marginTop: 2, flexShrink: 0 }} /> {u}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  STARTUP DISCOVERY PANEL — feature: automatic AI shortlisting           */
/*  Live data from GET /api/challenges/:id/discovery                      */
/* ---------------------------------------------------------------------- */
function StartupDiscoveryPanel({ ch, role }) {
  const [expanded, setExpanded] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [inviteState, setInviteState] = useState({}); // startupId -> "sending" | "sent" | error message

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getDiscovery(ch.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ch.id]);

  async function invite(startupId) {
    setInviteState((s) => ({ ...s, [startupId]: "sending" }));
    try {
      await api.inviteStartup(ch.id, startupId);
      setInviteState((s) => ({ ...s, [startupId]: "sent" }));
    } catch (err) {
      setInviteState((s) => ({ ...s, [startupId]: err.status === 409 ? "sent" : "error" }));
    }
  }

  async function refreshIndex() {
    setRefreshingIndex(true);
    setError(null);
    try {
      await api.refreshDiscoveryIndex(ch.id);
      window.setTimeout(() => api.getDiscovery(ch.id).then(setData).catch((err) => setError(err.message)).finally(() => setRefreshingIndex(false)), 2500);
    } catch (err) {
      setError(err.message);
      setRefreshingIndex(false);
    }
  }

  if (loading) return <Card>Running AI discovery against the startup database…</Card>;
  if (error) return <Card style={{ color: C.rust }}>Startup discovery cannot run yet: {error}</Card>;

  const matches = data.matches;

  return (
    <div>
      <Card style={{ marginBottom: 16, background: C.violetSoft, border: `1px solid ${C.violet}22` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.violet, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{data.message}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>
              {data.candidatesChecked} profiles checked · {data.excludedCount} filtered by hard eligibility · {data.semanticReadyCount}/{data.eligibleCount} semantic vectors ready.
            </div>
            {data.semanticStatus !== "ready" && (
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 7 }}>Semantic indexing is still catching up. Rule-based matching remains available until every vector is stored.</div>
            )}
          </div>
          <Btn small variant="secondary" icon={RefreshCw} onClick={refreshIndex} disabled={refreshingIndex} style={{ marginLeft: "auto", flexShrink: 0 }}>
            {refreshingIndex ? "Indexing..." : "Refresh semantic index"}
          </Btn>
        </div>
      </Card>

      <Card noPad>
        <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between" }}>
          <span>AI-matched startups</span>
          <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 500 }}>Eligibility filter · 60% meaning fit · 40% evidence fit</span>
        </div>
        {matches.map((s) => {
          const invited = inviteState[s.id];
          return (
            <div key={s.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <div
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Rocket size={15} color={C.ink} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                      {s.name}
                      {s.source === "DPIIT Startup India (real)" && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: C.teal, border: `1px solid ${C.teal}55`, borderRadius: 3, padding: "1px 5px" }}>
                          DPIIT VERIFIED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft }}>{s.sector} · {s.trl} · {s.govtExperience} past govt. pilots</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12.5, color: C.inkSoft }}>Match score</div>
                      <div style={{ fontWeight: 700, color: s.shortlisted ? C.teal : C.inkSoft }}>{s.matchScore}%</div>
                  </div>
                  {s.shortlisted ? <StatusChip label="Startup Shortlisted" small /> : <StatusChip label="Under Review" small />}
                  {expanded === s.id ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />}
                </div>
              </div>
              {expanded === s.id && (
                <div style={{ padding: "0 16px 16px 60px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    {s.sectorMatch ? <CheckCircle2 size={13} color={C.teal} /> : <AlertTriangle size={13} color={C.brass} />} Sector match
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    <Building2 size={13} color={C.teal} /> {s.govtExperience} government pilot(s) delivered
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    <Gauge size={13} color={C.teal} /> Technology readiness {s.trl}
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    <Sparkles size={13} color={C.violet} /> {s.semanticScore == null ? "Semantic match awaiting index" : `Meaning fit ${s.semanticScore}%`} · Evidence fit {s.ruleScore}%
                  </div>
                  {s.reasons?.map((reason) => (
                    <div key={reason} style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} color={C.teal} /> {reason}
                    </div>
                  ))}
                  {s.cin && (
                    <div style={{ fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                      <ShieldCheck size={13} color={C.teal} /> CIN {s.cin}
                    </div>
                  )}
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.navy, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      <Globe size={13} /> {s.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {(role === "Government Official") && <Btn
                    small
                    variant={invited === "sent" ? "secondary" : "primary"}
                    style={{ marginLeft: "auto" }}
                    disabled={invited === "sending" || invited === "sent"}
                    onClick={(e) => { e.stopPropagation(); invite(s.id); }}
                  >
                    {invited === "sending" ? "Sending…" : invited === "sent" ? "Invited ✓" : invited === "error" ? "Retry invite" : "Invite to apply"}
                  </Btn>}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  ELIGIBILITY PANEL — feature: automatic pre-evaluation screening        */
/*  Live data from GET /api/challenges/:id/applications                   */
/* ---------------------------------------------------------------------- */
function EligibilityPanel({ ch, role }) {
  const [apps, setApps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rescreening, setRescreening] = useState({});
  const loadApplications = () => api.getApplications(ch.id).then(setApps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadApplications()
      .then((res) => { if (!cancelled) setApps(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ch.id]);

  async function rescreen(applicationId) {
    setRescreening((current) => ({ ...current, [applicationId]: true }));
    try { await api.rescreenApplication(applicationId); await loadApplications(); }
    catch (requestError) { setError(requestError.message); }
    finally { setRescreening((current) => ({ ...current, [applicationId]: false })); }
  }

  if (loading) return <Card>Running auto-eligibility screening…</Card>;
  if (error) return <Card style={{ color: C.rust }}>Eligibility screening cannot load yet: {error}</Card>;

  const needsCert = apps.some((a) => a.results.some((r) => r.key === "cert"));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18 }}>
      <Card noPad>
        <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>Auto-eligibility screening</div>
        {apps.length === 0 && (
          <div style={{ padding: "16px", fontSize: 12.5, color: C.inkSoft }}>
            No applications yet — invite a startup from the AI Startup Discovery tab to see it screened here.
          </div>
        )}
        {apps.map(({ id, startup: a, results, status, reason, screenedAt, screeningHistory = [] }) => (
          <div key={id} style={{ padding: "13px 16px", borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {a.name}
                  {a.source === "DPIIT Startup India (real)" && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: C.teal, border: `1px solid ${C.teal}55`, borderRadius: 3, padding: "1px 5px" }}>
                      DPIIT VERIFIED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: status === "Auto-Rejected" ? C.rust : C.inkSoft }}>
                  {status === "Eligible" ? "Passed — all checks satisfied" : status === "Auto-Rejected"
                    ? `Eligibility check failed — ${reason.toLowerCase()}. Application auto-rejected before evaluation stage.`
                    : `Reason: ${reason}`}
                </div>
                {screenedAt && <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 3 }}>Last screened {new Date(screenedAt).toLocaleString()} · {screeningHistory.length || 1} audit record(s)</div>}
              </div>
              <StatusChip label={status === "Eligible" ? "Startup Shortlisted" : status === "Missing Documents" ? "Under Review" : "Auto-Rejected"} small />
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
              {results.map((r) => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: r.pass ? C.teal : C.rust }}>
                  {r.pass ? <CheckCircle2 size={13} /> : <X size={13} />} {r.label}
                </div>
              ))}
              {(["Government Official", "Startup"].includes(role)) && <Btn small variant="secondary" icon={RefreshCw} onClick={() => rescreen(id)} disabled={rescreening[id]} style={{ marginLeft: "auto" }}>{rescreening[id] ? "Screening…" : "Re-run screening"}</Btn>}
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Rules applied to this challenge</div>
        <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.6, marginBottom: 12 }}>
          DPIIT-recognised startups under 10 years old are exempt from the standard prior-turnover requirement.
          {needsCert && " Because this challenge is Medium/High risk, a valid ISO 27001 (or equivalent) security certification is mandatory — applicants without it are auto-rejected before reaching an evaluator."}
        </p>
        <Btn variant="secondary" small icon={Eye} style={{ width: "100%", justifyContent: "center" }}>Side-by-side comparison</Btn>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  EXPERT EVALUATION PANEL — feature: fixed scoring rubric, auto-totalled */
/*  and auto-ranked, with weightings that shift with the challenge's risk  */
/*  profile. Live data from GET /api/challenges/:id/rubric + /evaluations  */
/*  and POST /api/challenges/:id/evaluations (see /backend/src/evaluation.js) */
/* ---------------------------------------------------------------------- */
const EMPTY_RUBRIC_SCORES = { innovation: 5, feasibility: 5, cost: 5, security: 5, scalability: 5 };

function ExpertEvaluationPanel({ ch }) {
  const [data, setData] = useState(null); // { weights, message, evaluations, ranking }
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const [evaluatorName, setEvaluatorName] = useState("");
  const [startupId, setStartupId] = useState("");
  const [scores, setScores] = useState(EMPTY_RUBRIC_SCORES);
  const [submitState, setSubmitState] = useState(null); // "sending" | "error" | null
  const [submitError, setSubmitError] = useState(null);

  function load() {
    setError(null);
    return api.getEvaluations(ch.id).then((res) => setData(res));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([load(), api.getStartups().then((res) => { if (!cancelled) setStartups(res); })])
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ch.id]);

  async function submit() {
    setSubmitError(null);
    if (!startupId) { setSubmitError("Choose a startup to score"); return; }
    if (!evaluatorName.trim()) { setSubmitError("Enter your name as the evaluator"); return; }
    setSubmitState("sending");
    try {
      await api.submitEvaluation(ch.id, { startupId, evaluatorName, scores });
      await load();
      setScores(EMPTY_RUBRIC_SCORES);
      setSubmitState(null);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err.message);
    }
  }

  if (loading) return <Card>Loading the scoring rubric…</Card>;
  if (error) return <Card style={{ color: C.rust }}>Couldn't reach the evaluation service: {error}. Is the backend running on port 4000?</Card>;

  const { weights, message, evaluations, ranking } = data;
  const previewTotal = computeWeightedTotal(scores, weights);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
      <div>
        <Card style={{ marginBottom: 16, background: C.brassSoft, border: `1px solid ${C.brass}33` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.brass, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{message}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>
                Every evaluator scores against this same weighted rubric — totals and rankings are computed automatically, not by any one reviewer's personal judgement.
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Weighted scoring rubric</div>
          {RUBRIC_CATEGORIES.map((c) => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 130, fontSize: 12.8, fontWeight: 600 }}>{c.label}</div>
              <div style={{ flex: 1, height: 7, background: C.paper, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${weights[c.key]}%`, height: "100%", background: C.brass }} />
              </div>
              <div style={{ width: 36, fontSize: 12.8, fontWeight: 700, textAlign: "right" }}>{weights[c.key]}%</div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Score a startup</div>
          <Field label="Evaluator name">
            <input style={inputStyle} placeholder="e.g. Dr. A. Deshmukh" value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} />
          </Field>
          <Field label="Startup">
            <select style={inputStyle} value={startupId} onChange={(e) => setStartupId(e.target.value)}>
              <option value="">Select a startup…</option>
              {startups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          {RUBRIC_CATEGORIES.map((c) => (
            <div key={c.key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.8, marginBottom: 5 }}>
                <span style={{ fontWeight: 600 }}>{c.label} <span style={{ color: C.inkSoft, fontWeight: 500 }}>({weights[c.key]}% weight)</span></span>
                <span style={{ fontWeight: 700 }}>{scores[c.key]}/10</span>
              </div>
              <input
                type="range" min="0" max="10" value={scores[c.key]}
                onChange={(e) => setScores({ ...scores, [c.key]: +e.target.value })}
                style={{ width: "100%", accentColor: C.brass }}
              />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>
              Auto-totalled: <span style={{ fontWeight: 700, color: C.ink }}>{previewTotal}/100</span>
            </div>
            <Btn small disabled={submitState === "sending"} onClick={submit}>
              {submitState === "sending" ? "Submitting…" : "Submit score"}
            </Btn>
          </div>
          {submitError && <div style={{ fontSize: 12, color: C.rust, marginTop: 8 }}>{submitError}</div>}
        </Card>
      </div>

      <div>
        <Card noPad style={{ marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>Ranking (auto-totalled, all evaluators)</div>
          {ranking.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: C.inkSoft }}>No scores submitted yet.</div>}
          {ranking.map((r) => (
            <div key={r.startupId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: r.rank === 1 ? C.brass : C.navySoft, color: r.rank === 1 ? "#fff" : C.ink, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.rank}
                </div>
                <div>
                  <div style={{ fontSize: 12.8, fontWeight: 600 }}>{r.startupName}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>{r.evaluatorCount} evaluator{r.evaluatorCount === 1 ? "" : "s"}</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.avgTotal}</div>
            </div>
          ))}
        </Card>

        <Card noPad>
          <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>Individual scores</div>
          {evaluations.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: C.inkSoft }}>No evaluations submitted for this challenge yet.</div>}
          {evaluations.map((ev) => (
            <div key={ev.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <div onClick={() => setExpanded(expanded === ev.id ? null : ev.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 12.8, fontWeight: 600 }}>{ev.startupName}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>by {ev.evaluatorName}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.total}/100</div>
                  {expanded === ev.id ? <ChevronUp size={14} color={C.inkSoft} /> : <ChevronDown size={14} color={C.inkSoft} />}
                </div>
              </div>
              {expanded === ev.id && (
                <div style={{ padding: "0 16px 12px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {RUBRIC_CATEGORIES.map((c) => (
                    <div key={c.key} style={{ fontSize: 11, color: C.inkSoft }}>{c.label}: <b style={{ color: C.ink }}>{ev.scores[c.key]}</b></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const RUBRIC_CATEGORIES = [
  { key: "innovation", label: "Innovation" },
  { key: "feasibility", label: "Feasibility" },
  { key: "cost", label: "Cost" },
  { key: "security", label: "Security" },
  { key: "scalability", label: "Scalability" },
];

/** Client-side preview of the weighted total, mirroring backend/src/evaluation.js computeTotal(). */
function computeWeightedTotal(scores, weights) {
  const total = RUBRIC_CATEGORIES.reduce((sum, { key }) => sum + (scores[key] / 10) * weights[key], 0);
  return Math.round(total * 10) / 10;
}

function DataIpPanel() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Data & IP clauses</div>
        {[
          "Startup retains core product IP",
          "Department holds perpetual licence for pilot-customised features",
          "Raw departmental data never leaves classified environment",
          "Derived insights require written data-sharing agreement",
          "All shared data deleted or anonymised within 30 days of pilot close",
        ].map((d) => (
          <div key={d} style={{ display: "flex", gap: 7, fontSize: 12.8, marginBottom: 8, color: C.inkSoft }}>
            <FileCheck2 size={14} color={C.teal} style={{ flexShrink: 0, marginTop: 1 }} /> {d}
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Cybersecurity requirements</div>
        {[
          "Data residency within India-hosted infrastructure",
          "ISO 27001 or equivalent self-attestation",
          "Encryption at rest and in transit (AES-256 / TLS 1.2+)",
          "Incident disclosure within 24 hours",
          "Independent security review before scale-up",
        ].map((d) => (
          <div key={d} style={{ display: "flex", gap: 7, fontSize: 12.8, marginBottom: 8, color: C.inkSoft }}>
            <Lock size={14} color={C.brass} style={{ flexShrink: 0, marginTop: 1 }} /> {d}
          </div>
        ))}
      </Card>
    </div>
  );
}

function SubmittedIdeasPanel() {
  const ideas = [
    { name: "TrackNova", summary: "Fleet-agnostic GPS + ML ETA engine", trl: "TRL 7", status: "Startup Shortlisted" },
    { name: "RouteWise Tech", summary: "Crowd-sourced arrival prediction", trl: "TRL 5", status: "Expert Evaluation" },
    { name: "PathAI", summary: "Computer-vision occupancy estimation", trl: "TRL 4", status: "Under Review" },
  ];
  return (
    <Card noPad>
      {ideas.map((i, idx) => (
        <div key={i.name} style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: idx > 0 ? `1px solid ${C.line}` : "none" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{i.name}</div>
            <div style={{ fontSize: 12.3, color: C.inkSoft }}>{i.summary} · {i.trl}</div>
          </div>
          <StatusChip label={i.status} small />
        </div>
      ))}
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  CREATE CHALLENGE WIZARD                                                */
/* ---------------------------------------------------------------------- */
function CreateChallenge({ onDone, userId, role, verifiedDepartment, initialDraft = null, language = "en" }) {
  const tx = (value) => t(language, value);
  const steps = ["Plain-language problem", "Structured specification", "Pilot and budget", "Measurement plan", "Publish"].map(tx);
  const storageKey = `vyavsay.challenge-draft.v2.${userId || "anonymous"}`;
  const emptyForm = {
    title: "", department: verifiedDepartment || "", sector: "", objective: "", beneficiaries: "", rawProblemStatement: "",
    location: "", requirementStatement: "", expectedOutcome: "", constraints: "",
    budgetMin: "", budgetMax: "", currency: "INR", pilotDurationMonths: "", submissionDeadline: "",
    expectedPilotStartDate: "", primaryKpiName: "", primaryKpiBaseline: "", primaryKpiTarget: "",
    primaryKpiUnit: "", measurementMethod: "", evidenceSource: "", targetDate: "",
  };
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
  })();
  const sourceDraft = initialDraft || null;
  const initialFields = sourceDraft ? {
    ...emptyForm,
    title: sourceDraft.title || "", department: sourceDraft.dept || sourceDraft.department || "",
    sector: sourceDraft.sector || sourceDraft.theme || "", objective: sourceDraft.objective || "",
    beneficiaries: sourceDraft.beneficiaries || "", rawProblemStatement: sourceDraft.rawProblemStatement || "",
    location: sourceDraft.location || "", requirementStatement: sourceDraft.requirementStatement || "",
    expectedOutcome: sourceDraft.expectedOutcome || sourceDraft.outcome || "", constraints: sourceDraft.constraints || "",
    budgetMin: sourceDraft.budgetMin ?? "", budgetMax: sourceDraft.budgetMax ?? "", currency: sourceDraft.currency || "INR",
    pilotDurationMonths: sourceDraft.pilotDurationMonths ?? "", submissionDeadline: sourceDraft.submissionDeadline || "",
    expectedPilotStartDate: sourceDraft.expectedPilotStartDate || "", primaryKpiName: sourceDraft.primaryKpiName || "",
    primaryKpiBaseline: sourceDraft.primaryKpiBaseline ?? "", primaryKpiTarget: sourceDraft.primaryKpiTarget ?? "",
    primaryKpiUnit: sourceDraft.primaryKpiUnit || "", measurementMethod: sourceDraft.measurementMethod || "",
    evidenceSource: sourceDraft.evidenceSource || "", targetDate: sourceDraft.targetDate || "",
  } : { ...emptyForm, ...(cached?.fields || {}) };
  const [step, setStep] = useState(0);
  const [f, setF] = useState(initialFields);
  const [draftId, setDraftId] = useState(sourceDraft?.id || cached?.draftId || null);
  const [draftVersion, setDraftVersion] = useState(sourceDraft?.version || cached?.version || null);
  const [structured, setStructured] = useState(cached?.structured || (sourceDraft?.draftingEngine ? { engine: sourceDraft.draftingEngine, model: sourceDraft.draftingModel, capabilities: sourceDraft.capabilities || [] } : null));
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState(null);
  const [sourceDocument, setSourceDocument] = useState(sourceDraft?.sourceDocument || cached?.sourceDocument || null);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [saveState, setSaveState] = useState(draftId ? "Saved" : "Not saved");
  const [saveError, setSaveError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const draftIdRef = useRef(draftId);
  const versionRef = useRef(draftVersion);
  const saveQueue = useRef(Promise.resolve());

  const required = Object.keys(emptyForm);
  const completed = required.filter((key) => f[key] !== "" && f[key] !== null && f[key] !== undefined).length;
  const completeness = Math.round((completed / required.length) * 100);
  const formProblems = useMemo(() => {
    const problems = [];
    if (f.expectedOutcome && (!/\d/.test(f.expectedOutcome) || !/(day|week|month|year|quarter|within|by\s)/i.test(f.expectedOutcome))) problems.push("Expected outcome needs a number and timeframe.");
    if (f.budgetMin !== "" && f.budgetMax !== "" && Number(f.budgetMin) > Number(f.budgetMax)) problems.push("Minimum budget cannot exceed maximum budget.");
    if (f.primaryKpiBaseline !== "" && f.primaryKpiTarget !== "" && Number(f.primaryKpiBaseline) === Number(f.primaryKpiTarget)) problems.push("KPI target must differ from its baseline.");
    if (f.submissionDeadline && f.expectedPilotStartDate && f.submissionDeadline >= f.expectedPilotStartDate) problems.push("Pilot start must be after the submission deadline.");
    return problems;
  }, [f]);
  const ready = completeness === 100 && formProblems.length === 0;
  const update = (key, value) => setF((current) => ({ ...current, [key]: value }));
  const set = (key) => (event) => update(key, event.target.value);
  const payloadFor = (fields) => ({
    ...fields,
    capabilities: structured?.capabilities || sourceDraft?.capabilities || [],
    draftingEngine: structured?.engine || sourceDraft?.draftingEngine || null,
    draftingModel: structured?.model || sourceDraft?.draftingModel || null,
    sourceDocument,
  });
  const cache = (fields, nextId = draftIdRef.current, nextVersion = versionRef.current) =>
    localStorage.setItem(storageKey, JSON.stringify({ draftId: nextId, version: nextVersion, fields, structured, sourceDocument }));

  function saveDraft(force = false, fields = f) {
    const hasContent = Object.values(fields).some((value) => String(value ?? "").trim());
    if (!hasContent && !force) return Promise.resolve(null);
    const operation = async () => {
      setSaveState("Saving");
      setSaveError(null);
      try {
        const response = draftIdRef.current
          ? await api.saveChallengeDraft(draftIdRef.current, payloadFor(fields), versionRef.current)
          : await api.createChallengeDraft(payloadFor(fields));
        const challenge = response.challenge;
        draftIdRef.current = challenge.id;
        versionRef.current = challenge.version;
        setDraftId(challenge.id);
        setDraftVersion(challenge.version);
        setSaveState("Saved");
        cache(fields, challenge.id, challenge.version);
        return challenge;
      } catch (error) {
        setSaveState("Saved locally");
        setSaveError(error.message);
        cache(fields);
        if (force) throw error;
        return null;
      }
    };
    saveQueue.current = saveQueue.current.catch(() => null).then(operation);
    return saveQueue.current;
  }

  useEffect(() => {
    cache(f);
    const hasContent = Object.values(f).some((value) => String(value ?? "").trim());
    if (!hasContent) return undefined;
    const snapshot = { ...f };
    const timer = window.setTimeout(() => { saveDraft(false, snapshot); }, 900);
    return () => window.clearTimeout(timer);
  }, [f]);

  async function generateRequirement() {
    setStructuring(true);
    setStructureError(null);
    try {
      const result = await api.structureRequirement(f);
      setStructured(result);
      setF((current) => ({
        ...current,
        sector: result.theme || current.sector,
        requirementStatement: result.requirementStatement || current.requirementStatement,
        expectedOutcome: result.expectedOutcome || current.expectedOutcome,
        constraints: result.constraints || current.constraints,
      }));
      setStep(1);
    } catch (error) {
      setStructureError(error.status === 401
        ? "Your session expired. Sign in again, then retry Structure with AI."
        : error.status === 403
          ? "Structure with AI is available only to a Government Official. Switch to that browser session and try again."
        : error.message);
    } finally {
      setStructuring(false);
    }
  }

  async function importPdf(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStructureError("Choose a PDF document.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setStructureError("PDF must be 6 MB or smaller.");
      return;
    }
    setPdfImporting(true);
    setStructureError(null);
    try {
      const result = await api.structurePdfRequirement(file);
      setStructured(result);
      setSourceDocument(result.sourceDocument);
      setF((current) => ({
        ...current,
        title: result.title || current.title,
        department: result.department || current.department,
        sector: result.sector || result.theme || current.sector,
        objective: result.objective || current.objective,
        beneficiaries: result.beneficiaries || current.beneficiaries,
        location: result.location || current.location,
        rawProblemStatement: result.documentSummary || current.rawProblemStatement,
        requirementStatement: result.requirementStatement || current.requirementStatement,
        expectedOutcome: result.expectedOutcome || current.expectedOutcome,
        constraints: result.constraints || current.constraints,
      }));
      setStep(1);
    } catch (error) {
      setStructureError(error.message);
    } finally {
      setPdfImporting(false);
    }
  }

  async function submitForReview() {
    setSubmitting(true);
    setSaveError(null);
    try {
      await saveDraft(true, { ...f });
      const response = await api.publishChallengeDraft(draftIdRef.current, versionRef.current);
      if (response.challenge.status === "Published") localStorage.removeItem(storageKey);
      onDone(response.challenge);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const engineLabel = structured?.llmUsed
    ? `${structured.engine?.replace("llm:", "") || "configured model"}${structured.model ? ` · ${structured.model}` : ""}`
    : structured?.engine === "deterministic-policy-structuring-v1"
      ? "deterministic fallback"
      : structured?.engine || "not generated yet";

  return (
    <div>
      <SectionTitle eyebrow="TEMPLATE 1 · CHALLENGE IDENTIFICATION" title={sourceDraft?.status === "Changes Requested" ? "Correct and resubmit the problem statement" : "Turn a complaint into a buildable challenge"} />
      {sourceDraft?.review?.findings && <Card style={{ marginBottom: 16, border: `1px solid ${C.rust}55`, background: C.rustSoft }}><b>Automated check notes:</b> {sourceDraft.review.findings}</Card>}
      <div className="challenge-identification-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20 }}>
        <div>
          <div className="challenge-identification-steps" style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {steps.map((label, index) => <div key={label} onClick={() => setStep(index)} style={{ flex: 1, padding: "9px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, cursor: "pointer", borderRadius: 4, background: step === index ? C.ink : "#fff", color: step === index ? "#fff" : C.inkSoft, border: `1px solid ${step === index ? C.ink : C.line}` }}>{index + 1}. {label}</div>)}
          </div>
          <Card>
            {step === 0 && <>
              <div style={{ background: C.brassSoft, color: C.brass, padding: "8px 12px", borderRadius: 4, fontSize: 12, marginBottom: 16 }}><Info size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Write the operational problem in plain language or upload the source PDF. AI suggestions are always editable; the department official makes the final publication decision.</div>
              <Field label={tx("Government document (PDF, optional)")} hint="Upload the legal or departmental note. Vyavsay extracts readable text, prepares a short summary, and pre-fills an editable challenge draft.">
                <input type="file" accept="application/pdf,.pdf" style={inputStyle} onChange={importPdf} disabled={pdfImporting} />
              </Field>
              {pdfImporting && <div style={{ margin: "-6px 0 12px", color: C.teal, fontSize: 12 }}>Reading PDF and preparing an editable draft…</div>}
              {sourceDocument && <div style={{ margin: "-4px 0 14px", padding: "8px 10px", borderRadius: 5, background: C.tealSoft, color: C.inkSoft, fontSize: 12 }}><FileText size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{sourceDocument.name} imported. Its source record will be linked to this challenge.</div>}
              <Field label={tx("Department")}><input style={inputStyle} value={f.department} onChange={set("department")} disabled={role === "Government Official" && Boolean(verifiedDepartment)} /></Field>
              <Field label={tx("Challenge title")}><input style={inputStyle} value={f.title} onChange={set("title")} /></Field>
              <Field label={tx("Sector / theme")}><input style={inputStyle} value={f.sector} onChange={set("sector")} placeholder="e.g. GovTech, HealthTech" /></Field>
              <Field label={tx("Department objective")}><textarea style={{ ...inputStyle, height: 70 }} value={f.objective} onChange={set("objective")} /></Field>
              <Field label={tx("Target beneficiaries")}><input style={inputStyle} value={f.beneficiaries} onChange={set("beneficiaries")} /></Field>
              <Field label={tx("Raw problem statement")}><textarea style={{ ...inputStyle, height: 92 }} value={f.rawProblemStatement} onChange={set("rawProblemStatement")} placeholder="What is going wrong today?" /></Field>
              <Btn variant="secondary" small icon={Sparkles} onClick={generateRequirement} disabled={structuring}>{structuring ? "Structuring…" : structured ? tx("Structure again") : tx("Structure with AI")}</Btn>
              {structureError && <div style={{ marginTop: 12, fontSize: 12, color: C.rust }}>{structureError}</div>}
            </>}
            {step === 1 && <>
              <div style={{ background: C.violetSoft, padding: "10px 12px", borderRadius: 5, fontSize: 12, marginBottom: 16 }}><b>Drafting source: {engineLabel}.</b> Review and edit every generated field.</div>
              <Field label={tx("Technical requirement")}><textarea style={{ ...inputStyle, height: 78 }} value={f.requirementStatement} onChange={set("requirementStatement")} /></Field>
              <Field label={tx("Measurable expected outcome")} hint="Must include a number and timeframe."><textarea style={{ ...inputStyle, height: 78 }} value={f.expectedOutcome} onChange={set("expectedOutcome")} /></Field>
              <Field label={tx("Known constraints")}><textarea style={{ ...inputStyle, height: 78 }} value={f.constraints} onChange={set("constraints")} /></Field>
            </>}
            {step === 2 && <>
              <Field label={tx("Pilot location")}><input style={inputStyle} value={f.location} onChange={set("location")} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={tx("Minimum budget (INR)")}><input type="number" min="0" step="1" style={inputStyle} value={f.budgetMin} onChange={set("budgetMin")} /></Field>
                <Field label={tx("Maximum budget (INR)")}><input type="number" min="0" step="1" style={inputStyle} value={f.budgetMax} onChange={set("budgetMax")} /></Field>
                <Field label={tx("Pilot duration (months)")}><input type="number" min="1" step="1" style={inputStyle} value={f.pilotDurationMonths} onChange={set("pilotDurationMonths")} /></Field>
                <Field label="Currency"><input style={inputStyle} value="INR" disabled /></Field>
                <Field label={tx("Startup submission deadline")}><input type="date" style={inputStyle} value={f.submissionDeadline} onChange={set("submissionDeadline")} /></Field>
                <Field label={tx("Expected pilot start")}><input type="date" style={inputStyle} value={f.expectedPilotStartDate} onChange={set("expectedPilotStartDate")} /></Field>
              </div>
              <Card style={{ background: C.paper, border: `1px dashed ${C.lineStrong}` }}><b>Procurement pathway:</b> No route is inferred from budget alone. Complete the reviewed Procurement Pathway Template; an authorised officer makes the final selection.</Card>
            </>}
            {step === 3 && <>
              <Field label={tx("Primary KPI")}><input style={inputStyle} value={f.primaryKpiName} onChange={set("primaryKpiName")} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label={tx("Baseline")}><input type="number" step="1" style={inputStyle} value={f.primaryKpiBaseline} onChange={set("primaryKpiBaseline")} /></Field>
                <Field label={tx("Target")}><input type="number" step="1" style={inputStyle} value={f.primaryKpiTarget} onChange={set("primaryKpiTarget")} /></Field>
                <Field label={tx("Unit")}><input style={inputStyle} value={f.primaryKpiUnit} onChange={set("primaryKpiUnit")} placeholder="%, days, cases" /></Field>
              </div>
              <Field label={tx("Measurement method")}><textarea style={{ ...inputStyle, height: 70 }} value={f.measurementMethod} onChange={set("measurementMethod")} /></Field>
              <Field label={tx("Evidence source")}><textarea style={{ ...inputStyle, height: 70 }} value={f.evidenceSource} onChange={set("evidenceSource")} /></Field>
              <Field label={tx("Target date")}><input type="date" style={inputStyle} value={f.targetDate} onChange={set("targetDate")} /></Field>
              <Card style={{ background: C.paper, border: `1px dashed ${C.lineStrong}` }}><b>Risk status:</b> Provisional Medium until the versioned Risk Management Template is completed and independently reviewed.</Card>
            </>}
            {step === 4 && <>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{tx("Final department review before publishing")}</div>
              {Object.entries(f).map(([key, value]) => <div key={key} style={{ display: "flex", padding: "7px 0", borderTop: `1px solid ${C.line}`, fontSize: 12.5 }}><div style={{ width: 190, color: C.inkSoft, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</div><div style={{ fontWeight: 500, flex: 1 }}>{value === "" ? "—" : value}</div></div>)}
              {formProblems.map((problem) => <div key={problem} style={{ marginTop: 8, color: C.rust, fontSize: 12 }}>{problem}</div>)}
              {saveError && <div style={{ marginTop: 12, color: C.rust, fontSize: 12 }}>{saveError}</div>}
            </>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <Btn variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{tx("Back")}</Btn>
              {step < steps.length - 1 ? <Btn icon={ArrowRight} onClick={() => setStep(step + 1)}>{tx("Continue")}</Btn> : <Btn variant="brass" icon={CheckCircle2} onClick={submitForReview} disabled={submitting || !ready}>{submitting ? "Publishing…" : sourceDraft?.status === "Changes Requested" ? "Publish corrected challenge" : tx("Publish challenge")}</Btn>}
            </div>
          </Card>
        </div>
        <div>
          <Card style={{ marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>COMPLETENESS</div>
            <div style={{ ...serif, fontSize: 30, fontWeight: 600, color: ready ? C.teal : C.brass }}>{completeness}%</div>
            <div style={{ fontSize: 11.5, color: C.inkSoft }}>Required fields plus deterministic validation. No AI decides readiness.</div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: saveState === "Saved locally" ? C.brass : C.teal, fontWeight: 600 }}>{saveState === "Saving" ? "Saving draft…" : `${saveState} · record v${draftVersion || 1}`}</div>
          </Card>
          <Card><div style={{ fontWeight: 700, fontSize: 12.8, marginBottom: 8 }}>Connected controls</div>{["Outcome-Based Problem Statement v2", "Risk assessment required before pilot", "Procurement pathway requires officer review", "KPI flows into pilot measurement"].map((label) => <div key={label} style={{ display: "flex", gap: 6, fontSize: 12, color: C.inkSoft, padding: "5px 0" }}><ScrollText size={13} color={C.brass} /> {label}</div>)}</Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MARKETPLACE                                                            */
/* ---------------------------------------------------------------------- */
function Marketplace({ role }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [shortlisted, setShortlisted] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupByField, setGroupByField] = useState(false);

  useEffect(() => {
    api.getStartups()
      .then(setStartups)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(startups.flatMap((s) => s.tags || [])));

  const filtered = startups.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) &&
      (activeTags.length === 0 || activeTags.some((t) => s.tags.includes(t)))
  );

  // Field-wise segregation: group the filtered startups by their primary
  // sector/domain (e.g. AgriTech, HealthTech, Mobility) so government
  // officials/evaluators can browse startups organised by field rather than
  // one flat list. `field` comes from the backend (derived from `sector`);
  // fall back client-side for any older cached records that predate it.
  const grouped = filtered.reduce((acc, s) => {
    const field = s.field || (s.sector || "Other").split("·")[0].trim() || "Other";
    (acc[field] ||= []).push(s);
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  function toggleShortlist(name, e) {
    if (e) e.stopPropagation();
    setShortlisted((cur) => ({ ...cur, [name]: !cur[name] }));
  }

  function toggleTag(tag) {
    setActiveTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  return (
    <div>
      <SectionTitle
        eyebrow="DISCOVER"
        title="Startup Marketplace"
        right={
          <div style={{ display: "flex", gap: 8 }}>
          <Btn
            variant={groupByField ? "primary" : "secondary"}
            icon={Layers}
            small
            onClick={() => setGroupByField((v) => !v)}
          >
            {groupByField ? "Grouped by field" : "Group by field"}
          </Btn>
          <div style={{ position: "relative" }}>
            <Btn variant="secondary" icon={Filter} small onClick={() => setShowFilters((v) => !v)}>
              Domain · TRL · Budget · Recognition
            </Btn>
            {showFilters && (
              <div
                style={{
                  position: "absolute", right: 0, top: 38, background: "#fff",
                  border: `1px solid ${C.line}`, borderRadius: 5, padding: 12, width: 270,
                  boxShadow: "0 6px 18px rgba(20,33,61,0.1)", zIndex: 20,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 8 }}>FILTER BY DOMAIN</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        fontSize: 11.5, padding: "4px 9px", borderRadius: 20, cursor: "pointer",
                        border: `1px solid ${activeTags.includes(tag) ? C.blue : C.lineStrong}`,
                        background: activeTags.includes(tag) ? C.blueSoft : "#fff",
                        color: activeTags.includes(tag) ? C.blue : C.inkSoft, fontWeight: 600,
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {activeTags.length > 0 && (
                  <button
                    onClick={() => setActiveTags([])}
                    style={{ marginTop: 10, fontSize: 11.5, color: C.inkSoft, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
        }
      />
      {role === "Startup" && <StartupProfileEditor onSaved={(startup) => setStartups((current) => {
        const index = current.findIndex((item) => item.id === startup.id);
        return index === -1 ? [...current, startup] : current.map((item) => item.id === startup.id ? startup : item);
      })} />}
      {error && <Card style={{ color: C.rust, marginBottom: 14 }}>Could not load the startup marketplace: {error}</Card>}
      {loading && <Card style={{ marginBottom: 14 }}>Loading verified startup profiles…</Card>}
      <input style={{ ...inputStyle, marginBottom: 18, maxWidth: 380 }} placeholder="Search startups…" value={q} onChange={(e) => setQ(e.target.value)} />
      {(() => {
        const renderCard = (s) => {
          const isShortlisted = !!shortlisted[s.name];
          return (
            <Card key={s.id || s.name} onClick={() => setSelected(s)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 6, background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Rocket size={17} color={C.ink} />
                </div>
                <StatusChip label={s.badge === "Verified" ? "Scaled / Closed" : s.badge === "Eligible" ? "Startup Shortlisted" : "Under Review"} small />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>{s.sector}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: C.inkSoft, marginBottom: 10 }}>
                <span>{s.trl}</span><span>·</span><span>{s.pilots} past pilots</span><span>·</span>
                {s.rating != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={11} color={C.brass} fill={C.brass} /> {s.rating}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                <MapPin size={12} /> {s.loc} · {s.recog}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  small
                  variant={isShortlisted ? "primary" : "secondary"}
                  icon={isShortlisted ? CheckCircle2 : undefined}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={(e) => toggleShortlist(s.name, e)}
                >
                  {isShortlisted ? "Shortlisted" : "Shortlist"}
                </Btn>
                <Btn small variant="primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setSelected(s)}>View profile</Btn>
              </div>
            </Card>
          );
        };

        if (groupByField) {
          return groupedEntries.map(([field, items]) => (
            <div key={field} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>{field}</div>
                <div style={{ fontSize: 11, color: C.inkSoft, background: C.navySoft, borderRadius: 20, padding: "1px 8px" }}>{items.length}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                {items.map(renderCard)}
              </div>
            </div>
          ));
        }

        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {filtered.map(renderCard)}
          </div>
        );
      })()}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: C.inkSoft, fontSize: 13, padding: "40px 0" }}>
          No startups match "{q}"{activeTags.length ? ` in ${activeTags.join(", ")}` : ""}.
        </div>
      )}

      {selected && (
        <StartupDetailModal
          startup={selected}
          onClose={() => setSelected(null)}
          shortlisted={!!shortlisted[selected.name]}
          onToggleShortlist={() => toggleShortlist(selected.name)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  STARTUP DISCOVERY PROFILE                                               */
/* ---------------------------------------------------------------------- */
function StartupProfileEditor({ onSaved }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", sector: "", tags: "", trl: "TRL 5", location: "", website: "", pilots: 0, yearsActive: 0, certifications: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [applyingInvite, setApplyingInvite] = useState({});

  useEffect(() => {
    api.getMyStartup()
      .then(({ startup }) => {
        setProfile(startup);
        if (startup) setForm({
          name: startup.name || "", description: startup.description || "", sector: startup.sector || "",
          tags: (startup.tags || []).join(", "), trl: startup.trl || "TRL 5", location: startup.loc || "",
          website: startup.website || "", pilots: startup.pilots || 0, yearsActive: startup.yearsActive || 0,
          certifications: (startup.certifications || []).join(", "),
        });
      })
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
    api.getStartupInvitations().then(({ invitations: records }) => setInvitations(records)).catch(() => {});
  }, []);

  function update(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...form, pilots: Number(form.pilots), yearsActive: Number(form.yearsActive), tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), certifications: form.certifications.split(",").map((certification) => certification.trim()).filter(Boolean) };
      const result = profile ? await api.updateStartup(profile.id, payload) : await api.createStartup(payload);
      setProfile(result.startup);
      onSaved(result.startup);
      api.getStartupInvitations().then(({ invitations: records }) => setInvitations(records)).catch(() => {});
      setMessage({ type: "success", text: "Profile saved. Semantic matching is refreshing in the background." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function applyToInvitation(invitation) {
    if (!profile) {
      setMessage({ type: "error", text: "Save your Startup Discovery Profile before applying." });
      return;
    }
    setApplyingInvite((current) => ({ ...current, [invitation.id]: true }));
    setMessage(null);
    try {
      const application = await api.applyToChallenge(invitation.challengeId, profile.id);
      const passed = application.status === "Eligible";
      setMessage({ type: passed ? "success" : "error", text: passed ? "Application submitted and eligibility screening passed." : `Application submitted, but screening failed: ${application.reason}. Update your evidence, then request a rescreen.` });
      const { invitations: records } = await api.getStartupInvitations();
      setInvitations(records);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setApplyingInvite((current) => ({ ...current, [invitation.id]: false }));
    }
  }

  return (
    <Card style={{ marginBottom: 18, border: `1px solid ${C.violet}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: C.violet, fontWeight: 800 }}>STARTUP DISCOVERY PROFILE</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 3 }}>Describe what you build once. Vyavsay uses this profile to surface relevant published challenges.</div>
        </div>
        {profile?.semanticIndexedAt && <StatusChip label="Semantic index ready" small />}
      </div>
      {loading ? <div style={{ fontSize: 12.5, color: C.inkSoft }}>Loading your profile…</div> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Startup name"><input style={inputStyle} value={form.name} onChange={update("name")} /></Field>
          <Field label="Sector"><input style={inputStyle} value={form.sector} onChange={update("sector")} placeholder="e.g. GovTech · Workflow automation" /></Field>
          <Field label="Technology readiness"><select style={inputStyle} value={form.trl} onChange={update("trl")}>{[1,2,3,4,5,6,7,8,9].map((value) => <option key={value}>{`TRL ${value}`}</option>)}</select></Field>
          <Field label="Location"><input style={inputStyle} value={form.location} onChange={update("location")} placeholder="e.g. Pune, Maharashtra" /></Field>
          <Field label="Technology tags" hint="Separate tags with commas."><input style={inputStyle} value={form.tags} onChange={update("tags")} placeholder="AI/ML, IoT, Analytics" /></Field>
          <Field label="Past government pilots"><input style={inputStyle} type="number" min="0" value={form.pilots} onChange={update("pilots")} /></Field>
          <Field label="Years in operation"><input style={inputStyle} type="number" min="0" value={form.yearsActive} onChange={update("yearsActive")} /></Field>
        </div>
        <Field label="What does your startup build?" hint="Use plain language. This is used for meaning-based discovery."><textarea style={{ ...inputStyle, height: 82 }} value={form.description} onChange={update("description")} placeholder="Describe the problem you solve, your product, and the outcomes you deliver." /></Field>
        <Field label="Website"><input style={inputStyle} value={form.website} onChange={update("website")} placeholder="https://example.com" /></Field>
        <Field label="Certifications" hint="Separate certificate names with commas. ISO 27001 (or equivalent) is required for medium/high-risk challenges."><input style={inputStyle} value={form.certifications} onChange={update("certifications")} placeholder="ISO 27001, DPIIT Certificate" /></Field>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Btn small icon={CheckCircle2} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save discovery profile"}</Btn>
          {message && <span style={{ fontSize: 12, color: message.type === "error" ? C.rust : C.teal }}>{message.text}</span>}
        </div>
        {invitations.length > 0 && <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 800, marginBottom: 7 }}>CHALLENGE INVITATIONS</div>
          {invitations.map((invite) => <div key={invite.id} style={{ fontSize: 12.5, color: C.ink, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "5px 0" }}><span>{invite.challenge?.title || "Published challenge"}</span><div style={{ display: "flex", gap: 7, alignItems: "center" }}><StatusChip label={invite.status} small />{invite.status === "Pending" && <Btn small onClick={() => applyToInvitation(invite)} disabled={applyingInvite[invite.id]}>{applyingInvite[invite.id] ? "Submitting…" : "Apply now"}</Btn>}</div></div>)}
        </div>}
      </>}
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  STARTUP DETAIL MODAL — opened by clicking a card in the Marketplace    */
/* ---------------------------------------------------------------------- */
function StartupDetailModal({ startup: s, onClose, shortlisted, onToggleShortlist }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(6,48,92,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 8, width: "100%", maxWidth: 520,
          maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(6,48,92,0.25)",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Rocket size={20} color={C.ink} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{s.sector}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <StatusChip label={s.badge === "Verified" ? "Scaled / Closed" : s.badge === "Eligible" ? "Startup Shortlisted" : "Under Review"} small />
            {s.dpiit && <StatusChip label="Startup Shortlisted" small />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <DetailStat icon={Gauge} label="TRL" value={s.trl} />
            <DetailStat icon={Building2} label="Past govt. pilots" value={s.pilots} />
            <DetailStat icon={Star} label="Rating" value={s.rating} />
            <DetailStat icon={Layers} label="Years active" value={`${s.yearsActive} yrs`} />
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>LOCATION & RECOGNITION</div>
          <div style={{ fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <MapPin size={14} color={C.inkSoft} /> {s.loc} · {s.recog}
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>SECTOR TAGS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {s.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 20, background: C.navySoft, color: C.ink, fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>

          {s.description && <><div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>SOLUTION DESCRIPTION</div><p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, marginTop: 0 }}>{s.description}</p></>}
          {(s.certifications || []).length > 0 && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>CERTIFICATIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                {s.certifications.map((cert) => (
                  <div key={cert} style={{ fontSize: 12.5, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={13} color={C.teal} /> {cert}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.line}`, display: "flex", gap: 10 }}>
          <Btn
            variant={shortlisted ? "primary" : "secondary"}
            icon={shortlisted ? CheckCircle2 : undefined}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onToggleShortlist}
          >
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </Btn>
          <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, display: "flex", alignItems: "center" }}>Open a published challenge to invite an eligible startup.</div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{value}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  EVALUATION WORKSPACE                                                   */
/*  Picks a challenge, then reuses the same risk-weighted, auto-totalled,  */
/*  auto-ranked rubric (ExpertEvaluationPanel) that backs the "Expert      */
/*  Evaluation" tab on a challenge's own page — so every entry point into  */
/*  Expert Evaluation scores against the one shared rubric instead of a    */
/*  separate, disconnected mock that didn't match it (old: Technical /     */
/*  Innovation / Cost / Scalability / Risk / Capacity, flat /60, no        */
/*  weighting, no ranking).                                                */
/* ---------------------------------------------------------------------- */
function EvaluationWorkspace() {
  const evaluable = CHALLENGES.filter((c) => c.status !== "Under Review");
  const [challengeId, setChallengeId] = useState(evaluable[0]?.id || "");
  const ch = CHALLENGES.find((c) => c.id === challengeId);

  return (
    <div>
      <SectionTitle
        eyebrow="EXPERT REVIEW"
        title="Evaluation Workspace"
        right={
          <select style={{ ...inputStyle, width: 340 }} value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            {evaluable.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}
          </select>
        }
      />
      {ch ? <ExpertEvaluationPanel ch={ch} /> : <Card>Choose a challenge to begin scoring.</Card>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PILOTS (Sandbox design + performance)                                  */
/* ---------------------------------------------------------------------- */
function Pilots() {
  const [tab, setTab] = useState("design");
  return (
    <div>
      <SectionTitle eyebrow="SANDBOX & PERFORMANCE" title="Pilots" />
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.line}` }}>
        {["Sandbox / Pilot Design", "Live Performance"].map((t) => (
          <div key={t} onClick={() => setTab(t === "Live Performance" ? "perf" : "design")}
            style={{ padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: (tab === "perf") === (t === "Live Performance") ? `2px solid ${C.ink}` : "2px solid transparent", color: (tab === "perf") === (t === "Live Performance") ? C.ink : C.inkSoft }}>
            {t}
          </div>
        ))}
      </div>
      {tab === "design" ? <PilotDesign /> : <PilotPerformance />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SANDBOX / PILOT DESIGN                                                 */
/*  Scope and duration are locked in before any rollout, and progression   */
/*  through Sandbox -> Field Pilot -> Live Rollout is gated so nothing     */
/*  reaches live citizen data until the Sandbox phase has passed.          */
/*  See backend/src/pilotDesign.js.                                        */
/* ---------------------------------------------------------------------- */
const PHASE_DOT_COLOR = { Passed: C.teal, Active: C.brass, Locked: C.line };

function PilotDesign() {
  const pilotable = CHALLENGES.filter((c) => c.status !== "Under Review" && c.status !== "Draft Challenge");
  const [challengeId, setChallengeId] = useState(pilotable[0]?.id || "");
  const [pilot, setPilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [scopeLabel, setScopeLabel] = useState("");
  const [durationMonths, setDurationMonths] = useState(4);
  const [locking, setLocking] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  function loadPilot(id) {
    return api.getPilotDesign(id).then((res) => setPilot(res.pilotDesign));
  }

  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;
    setLoading(true);
    setPilot(null);
    setActionError(null);
    loadPilot(challengeId)
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [challengeId]);

  async function lockPilot() {
    setActionError(null);
    if (!scopeLabel.trim()) { setActionError("Enter a pilot scope, e.g. '1 district'"); return; }
    setLocking(true);
    try {
      await api.createPilotDesign(challengeId, { scopeLabel, durationMonths: Number(durationMonths) || 1 });
      await loadPilot(challengeId);
      setScopeLabel("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLocking(false);
    }
  }

  async function advance() {
    if (!pilot) return;
    setAdvancing(true);
    setActionError(null);
    try {
      const updated = await api.advancePilotPhase(pilot.id);
      setPilot(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAdvancing(false);
    }
  }

  const ch = CHALLENGES.find((c) => c.id === challengeId);
  const activePhaseIdx = pilot ? pilot.phases.findIndex((p) => p.status === "Active") : -1;

  return (
    <div>
      {pilotable.length > 0 && (
        <select style={{ ...inputStyle, width: 360, marginBottom: 16 }} value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
          {pilotable.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}
        </select>
      )}
      {loading && <Card>Loading pilot design…</Card>}
      {error && <Card style={{ color: C.rust }}>Couldn't reach the pilot design service: {error}. Is the backend running on port 4000?</Card>}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Pilot scope {ch ? `— ${ch.title}` : ""}</div>
            {pilot ? (
              <>
                <div style={{ fontSize: 12.8, marginBottom: 8 }}><b>Scope:</b> {pilot.scopeLabel}</div>
                <div style={{ fontSize: 12.8, marginBottom: 12 }}><b>Duration:</b> {pilot.durationMonths} months</div>
                <div style={{ fontSize: 12, color: C.ink, background: C.brassSoft, padding: "9px 11px", borderRadius: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Lock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  {pilot.dataPolicy}
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
                  Scope and duration are locked in before any rollout — every pilot starts in the Sandbox phase.
                </p>
                <Field label="Pilot scope"><input style={inputStyle} placeholder="e.g. 1 district" value={scopeLabel} onChange={(e) => setScopeLabel(e.target.value)} /></Field>
                <Field label="Duration (months)"><input type="number" min="1" style={inputStyle} value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} /></Field>
                <Btn small icon={Lock} disabled={locking} onClick={lockPilot}>{locking ? "Locking…" : "Lock pilot scope"}</Btn>
              </>
            )}
            {actionError && <div style={{ fontSize: 12, color: C.rust, marginTop: 10 }}>{actionError}</div>}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Phase gate</div>
            {!pilot && <div style={{ fontSize: 12.5, color: C.inkSoft }}>Lock a pilot scope to start the Sandbox → Field Pilot → Live Rollout progression.</div>}
            {pilot && pilot.phases.map((p, i) => (
              <div key={p.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: PHASE_DOT_COLOR[p.status], color: p.status === "Locked" ? C.inkSoft : "#fff" }}>
                  {p.status === "Passed" ? <CheckCircle2 size={13} /> : p.status === "Locked" ? <Lock size={11} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.8 }}>{p.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.status === "Passed" ? C.teal : p.status === "Active" ? C.brass : C.inkSoft, flexShrink: 0 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft }}>{p.description}</div>
                </div>
              </div>
            ))}
            {pilot && activePhaseIdx !== -1 && (
              <Btn small variant="brass" style={{ marginTop: 12 }} disabled={advancing} onClick={advance} icon={ArrowRight}>
                {advancing ? "Advancing…" : `Mark ${pilot.phases[activePhaseIdx].name} passed`}
              </Btn>
            )}
            {pilot && activePhaseIdx === -1 && (
              <div style={{ fontSize: 12, color: C.teal, fontWeight: 600, marginTop: 12 }}>All phases complete — cleared for full rollout.</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PERFORMANCE MEASUREMENT                                                */
/*  KPI targets (baseline + target) are locked in once, at pilot start.    */
/*  As field results come in, achievement against that locked target is   */
/*  computed automatically — pure math, no manual judgement about whether  */
/*  a pilot "worked". See backend/src/performance.js.                     */
/* ---------------------------------------------------------------------- */
const STATUS_TONE = {
  "Target met": C.teal,
  "On track": C.teal,
  "Behind target": C.brass,
  "At risk": C.rust,
  "Awaiting results": C.inkSoft,
};

function PilotPerformance() {
  const [pilot, setPilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({}); // { [kpiKey]: "12.4" } — new-result inputs
  const [savingKey, setSavingKey] = useState(null);

  function load() {
    setError(null);
    return api.getPilotForChallenge("MH-TR-0022").then((p) => setPilot(p));
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function recordResult(kpiKey) {
    const raw = drafts[kpiKey];
    const actual = parseFloat(raw);
    if (raw === undefined || raw === "" || Number.isNaN(actual)) return;
    setSavingKey(kpiKey);
    try {
      const updated = await api.recordKpiResult(pilot.id, kpiKey, actual);
      setPilot(updated);
      setDrafts({ ...drafts, [kpiKey]: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <Card>Loading KPI results…</Card>;
  if (error) return <Card style={{ color: C.rust }}>Couldn't reach the performance service: {error}. Is the backend running on port 4000?</Card>;
  if (!pilot) return <Card>No pilot found.</Card>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <Card style={{ gridColumn: "span 1", textAlign: "center" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 6 }}>OVERALL KPI SCORE</div>
          <div style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.ink }}>
            {pilot.overallScore === null ? "—" : `${pilot.overallScore}%`}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4, color: STATUS_TONE[pilot.overallStatus] }}>{pilot.overallStatus}</div>
          <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 4 }}>{pilot.kpisReported}/{pilot.kpisTotal} KPIs reporting</div>
        </Card>
        {pilot.kpis.map((k) => (
          <Metric
            key={k.key}
            label={k.label}
            value={k.actual === null ? "Pending" : `${k.actual}${k.unit === "%" ? "%" : ` ${k.unit}`}`}
            sub={`Target ${k.target}${k.unit === "%" ? "%" : ` ${k.unit}`} · baseline ${k.baseline}${k.unit === "%" ? "%" : ""}`}
            icon={Gauge}
            tone={STATUS_TONE[k.status]}
          />
        ))}
      </div>

      <Card noPad style={{ marginBottom: 18 }}>
        <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>
          KPI targets — locked in at pilot start, achievement auto-calculated
        </div>
        {pilot.kpis.map((k) => (
          <div key={k.key} style={{ padding: "14px 16px", borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
                  Baseline <b style={{ color: C.ink }}>{k.baseline}{k.unit}</b> · Target (locked) <b style={{ color: C.ink }}>{k.target}{k.unit}</b>
                  {k.actual !== null && <> · Actual <b style={{ color: C.ink }}>{k.actual}{k.unit}</b></>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: STATUS_TONE[k.status] }}>
                  {k.achievedPercent === null ? "—" : `${k.achievedPercent}%`}
                </div>
                <div style={{ fontSize: 10.5, color: C.inkSoft }}>{k.status}</div>
              </div>
            </div>
            <div style={{ height: 6, background: C.paper, borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, k.achievedPercent ?? 0))}%`, height: "100%",
                background: STATUS_TONE[k.status] || C.brass,
              }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                type="number" placeholder="Record new field result…"
                style={{ ...inputStyle, maxWidth: 220 }}
                value={drafts[k.key] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [k.key]: e.target.value })}
              />
              <Btn small variant="secondary" disabled={savingKey === k.key} onClick={() => recordResult(k.key)}>
                {savingKey === k.key ? "Saving…" : "Save result"}
              </Btn>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Card style={{ gridColumn: "span 4" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Milestone progress</div>
          <MilestoneMini />
        </Card>
        <Card style={{ gridColumn: "span 2" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Field reports</div>
          {["Week 4 site visit — Pune depot", "Week 8 driver feedback survey"].map((f) => (
            <div key={f} style={{ display: "flex", gap: 6, fontSize: 12.5, color: C.inkSoft, padding: "5px 0" }}><Upload size={13} /> {f}</div>
          ))}
        </Card>
        <Card style={{ gridColumn: "span 2" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Validator notes</div>
          <p style={{ fontSize: 12.5, color: C.inkSoft }}>
            KPI achievement above is computed automatically from the locked baseline/target and the latest recorded result — no manual scoring of "did this work".
          </p>
        </Card>
      </div>
    </div>
  );
}

function MilestoneMini() {
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {MILESTONES.map((m, i) => (
        <div key={m.n} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ height: 6, background: i < 2 ? C.teal : C.line, marginBottom: 8, borderRadius: 3, marginRight: i < 3 ? 4 : 0 }} />
          <div style={{ fontSize: 11, fontWeight: 600 }}>{m.n.split(" — ")[0]}</div>
          <div style={{ fontSize: 10.5, color: C.inkSoft }}>{m.due}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  CONTRACTS                                                              */
/*  Milestone-Based Contracting — once a startup is selected, pulls in     */
/*  the problem, score, and budget already collected on the challenge and  */
/*  splits payment into stages instead of drafting a contract by hand.     */
/*  See backend/src/contracting.js.                                        */
/* ---------------------------------------------------------------------- */
const MILESTONE_STATUSES = ["Draft", "Submitted", "Payment Approved", "Paid"];
const MILESTONE_STATUS_COLOR = { Draft: C.inkSoft, Submitted: C.brass, "Payment Approved": C.ink, Paid: C.teal };

function formatINRDisplay(amount) {
  if (amount == null) return "TBD";
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2).replace(/\.00$/, "")} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function Contracts({ onPayments }) {
  const contractable = CHALLENGES.filter((c) => c.status !== "Under Review" && c.status !== "Draft Challenge");
  const [challengeId, setChallengeId] = useState(contractable[0]?.id || "");
  const [contracts, setContracts] = useState(null);
  const [startups, setStartups] = useState([]);
  const [topRanked, setTopRanked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startupId, setStartupId] = useState("");
  const [durationMonths, setDurationMonths] = useState(4);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

  function load(id) {
    return api.getContracts(id).then((res) => setContracts(res.contracts));
  }

  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStartupId("");
    Promise.all([
      load(challengeId),
      api.getStartups().then((res) => { if (!cancelled) setStartups(res); }),
      api.getEvaluations(challengeId).then((res) => { if (!cancelled) setTopRanked(res.ranking?.[0] || null); }),
    ])
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [challengeId]);

  async function draftContract() {
    setDraftError(null);
    const chosenId = startupId || topRanked?.startupId;
    if (!chosenId) { setDraftError("Choose a startup to contract"); return; }
    setDrafting(true);
    try {
      await api.createContract(challengeId, { startupId: chosenId, durationMonths: Number(durationMonths) || 4 });
      await load(challengeId);
      setStartupId("");
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setDrafting(false);
    }
  }

  const ch = CHALLENGES.find((c) => c.id === challengeId);

  return (
    <div>
      <SectionTitle
        eyebrow="MILESTONE-BASED CONTRACTING"
        title="Contracts"
        right={contractable.length > 0 && (
          <select style={{ ...inputStyle, width: 340 }} value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            {contractable.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}
          </select>
        )}
      />
      {loading && <Card>Loading contracts…</Card>}
      {error && <Card style={{ color: C.rust }}>Couldn't reach the contracting service: {error}. Is the backend running on port 4000?</Card>}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
          <div>
            <Card noPad>
              <div style={{ padding: "13px 16px", fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>
                Milestones & deliverables {ch ? `— ${ch.title}` : ""}
              </div>
              {contracts.length === 0 && (
                <div style={{ padding: 16, fontSize: 12.5, color: C.inkSoft }}>
                  No contract drafted yet — pick a selected startup on the right to auto-draft one from the challenge budget.
                </div>
              )}
              {contracts.map((c) => (
                <div key={c.id} style={{ padding: "14px 16px", borderTop: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.startupName}</div>
                    <div style={{ fontSize: 12, color: C.inkSoft }}>{c.budgetDisplay} · {c.durationMonths} months</div>
                  </div>
                  <div style={{ height: 6, background: C.paper, borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ width: `${c.progress.paidPercentage}%`, height: "100%", background: C.teal }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 10 }}>
                    {c.progress.paidDisplay} settled in simulator of {c.progress.totalDisplay} ({c.progress.paidPercentage}%)
                  </div>
                  {c.milestones.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name} — {m.percentage}%</div>
                        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>
                          Due {new Date(m.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · Payment {formatINRDisplay(m.amount)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: MILESTONE_STATUS_COLOR[m.status] }}>{m.status}</span>
                        <Btn small variant="secondary" onClick={onPayments}>Open Payments</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          </div>
          <div>
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Draft a new contract</div>
              <p style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
                Pulls in the problem, score, and budget already collected on this challenge and splits payment into the standard milestone schedule (20% / 30% / 50%).
              </p>
              {topRanked && (
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 10, background: C.tealSoft, padding: "7px 9px", borderRadius: 4 }}>
                  Top-ranked from Expert Evaluation: <b style={{ color: C.ink }}>{topRanked.startupName}</b> ({topRanked.avgTotal}/100)
                </div>
              )}
              <Field label="Selected startup">
                <select style={inputStyle} value={startupId} onChange={(e) => setStartupId(e.target.value)}>
                  <option value="">{topRanked ? `Use top-ranked (${topRanked.startupName})` : "Select a startup…"}</option>
                  {startups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Pilot duration (months)" hint={ch ? `Challenge budget: ${ch.budget}` : ""}>
                <input type="number" min="1" style={inputStyle} value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} />
              </Field>
              <Btn small icon={FileSignature} style={{ width: "100%", justifyContent: "center" }} disabled={drafting} onClick={draftContract}>
                {drafting ? "Drafting…" : "Draft contract"}
              </Btn>
              {draftError && <div style={{ fontSize: 12, color: C.rust, marginTop: 8 }}>{draftError}</div>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PAYMENTS                                                                */
/* ---------------------------------------------------------------------- */
function Validation() {
  return (
    <div>
      <SectionTitle eyebrow="INDEPENDENT VALIDATION" title="Validation Workspace — JalMitra / MH-WT-0007" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>KPI verification</div>
            {[
              { k: "Water-quality alert accuracy", claim: "94%", verified: "91%", ok: true },
              { k: "Sensor uptime", claim: "98%", verified: "97.2%", ok: true },
              { k: "Cost per monitoring point", claim: "₹3,200/mo", verified: "₹3,850/mo", ok: false },
            ].map((r) => (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 12.8, fontWeight: 600 }}>{r.k}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft }}>Claimed {r.claim} → Verified <b style={{ color: r.ok ? C.teal : C.rust }}>{r.verified}</b></div>
              </div>
            ))}
          </Card>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Site visit / remote validation log</div>
            {["Remote log review — 12 Aug", "Site visit, Aurangabad — 20 Aug", "Fraud/mismatch check — 27 Aug: none found"].map((l) => (
              <div key={l} style={{ fontSize: 12.5, color: C.inkSoft, padding: "5px 0" }}>· {l}</div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Final validation report</div>
            <textarea style={{ ...inputStyle, height: 80 }} defaultValue="Pilot meets 2 of 3 KPIs at target; cost-per-point exceeds proposal by 20%, driven by sensor calibration frequency. Recommend scale with revised unit economics." />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn small variant="brass" icon={TrendingUp}>Recommend: Scale</Btn>
              <Btn small variant="secondary">Recommend: Revise</Btn>
              <Btn small variant="danger">Recommend: Stop</Btn>
            </div>
          </Card>
        </div>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.8, marginBottom: 8 }}>Report status</div>
            <StatusChip label="Independent Validation" />
            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8 }}>Signed by: Deccan EnviroCheck Labs (empanelled validator)</div>
          </Card>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.8, marginBottom: 8 }}>Visibility</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>Full report: Department + Admin only</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>Summary: Public on challenge page</div>
          </Card>
          <Card>
            <div style={{ display: "flex", gap: 7, fontSize: 12.5, color: C.rust, fontWeight: 600 }}>
              <ShieldAlert size={15} /> 1 fraud/mismatch flag under department review
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SCALE-UP                                                               */
/* ---------------------------------------------------------------------- */
function ScaleUp() {
  return (
    <div>
      <SectionTitle eyebrow="PROCUREMENT / LEGAL / LEADERSHIP" title="Scale-Up Decision — TrackNova" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Pilot outcome summary</div>
          <div style={{ fontSize: 12.8, color: C.inkSoft, lineHeight: 1.7 }}>
            88% ETA accuracy (vs. 61% baseline) across a 12-week, 2-route pilot serving 4,200 daily commuters.
            Independently validated by RITES Mobility Labs on 30 Aug 2026.
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Cost-benefit analysis</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.8, padding: "6px 0" }}><span>Pilot cost</span><b>₹23,00,000</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.8, padding: "6px 0" }}><span>Projected state-wide annual cost</span><b>₹3.4 Cr</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.8, padding: "6px 0" }}><span>Est. commuter-hours saved / yr</span><b style={{ color: C.teal }}>1.2M hrs</b></div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Scalability across districts</div>
          {["Pune (piloted)", "Nagpur", "Nashik", "Aurangabad"].map((d, i) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none", fontSize: 12.8 }}>
              <span>{d}</span><StatusChip label={i === 0 ? "Scaled / Closed" : "Under Review"} small />
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Required approvals</div>
          {[{ n: "Transport Dept. Secretary", done: true }, { n: "Finance concurrence", done: true }, { n: "Legal / procurement sign-off", done: false }].map((a) => (
            <div key={a.n} style={{ display: "flex", gap: 8, fontSize: 12.8, padding: "6px 0" }}>
              {a.done ? <CheckCircle2 size={15} color={C.teal} /> : <Clock size={15} color={C.brass} />} {a.n}
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Decision</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>Scale-up budget estimate: ₹3.4 Cr / year, 4-district rollout</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" small icon={Download}>Export evidence packet</Btn>
            <Btn variant="secondary" small>Extend Pilot</Btn>
            <Btn variant="danger" small>Reject</Btn>
            <Btn variant="brass" small icon={TrendingUp}>Approve Scale-Up</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  ADMIN                                                                   */
/* ---------------------------------------------------------------------- */
function Admin() {
  const [mockData, setMockData] = useState(null);
  const [mockDataError, setMockDataError] = useState(null);

  useEffect(() => {
    api.getMockData().then(setMockData).catch((error) => setMockDataError(error.message));
  }, []);

  return (
    <div>
      <SectionTitle eyebrow="PLATFORM GOVERNANCE" title="Admin Dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <Metric label="Departments" value="18" icon={Building2} />
        <Metric label="Registered Startups" value="128" icon={Rocket} />
        <Metric label="Evaluators Empanelled" value="34" icon={UserCheck} />
        <Metric label="Validation Agencies" value="7" icon={ShieldCheck} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Bottleneck detection (avg. days per stage)</div>
          {[
            { s: "Eligibility Screening", d: 6.4, target: 3 },
            { s: "Expert Evaluation", d: 4.1, target: 5 },
            { s: "Contracting", d: 8.9, target: 6 },
            { s: "Payment Processing", d: 6.1, target: 7 },
          ].map((r) => (
            <div key={r.s} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span>{r.s}</span><span style={{ fontWeight: 700, color: r.d > r.target ? C.rust : C.teal }}>{r.d}d</span>
              </div>
              <div style={{ height: 6, background: C.paper, borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (r.d / (r.target * 1.6)) * 100)}%`, height: "100%", borderRadius: 3, background: r.d > r.target ? C.rust : C.teal }} />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Audit log (latest)</div>
          {["Template 'Risk Management Framework' edited by Legal", "Evaluator conflict declared — cleared", "Payment escalation triggered — JalMitra M1", "Department 'Water Resources' onboarded"].map((a, i) => (
            <div key={i} style={{ fontSize: 12.3, color: C.inkSoft, padding: "6px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>· {a}</div>
          ))}
        </Card>
      </div>
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>Loaded mock data</div>
          {mockData && <span style={{ fontSize: 12, color: C.inkSoft }}>{mockData.startups.length} startups · {mockData.governmentOfficials.length} government officials</span>}
        </div>
        {mockDataError && <div style={{ color: C.rust, fontSize: 12.5 }}>{mockDataError}</div>}
        {!mockData && !mockDataError && <div style={{ color: C.inkSoft, fontSize: 12.5 }}>Loading mock records…</div>}
        {mockData && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, marginBottom: 6 }}>STARTUPS</div>
            {mockData.startups.slice(0, 6).map((startup) => <div key={startup.id} style={{ fontSize: 12.5, padding: "5px 0", borderTop: `1px solid ${C.line}` }}><b>{startup.name}</b><span style={{ color: C.inkSoft }}> · {startup.field} · {startup.trl}</span></div>)}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, marginBottom: 6 }}>GOVERNMENT OFFICIALS</div>
            {mockData.governmentOfficials.slice(0, 6).map((official) => <div key={official.id} style={{ fontSize: 12.5, padding: "5px 0", borderTop: `1px solid ${C.line}` }}><b>{official.name}</b><span style={{ color: C.inkSoft }}> · {official.designation}</span></div>)}
          </div>
        </div>}
      </Card>
    </div>
  );
}
