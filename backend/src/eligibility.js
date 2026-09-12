/* ---------------------------------------------------------------------- */
/*  AUTO-ELIGIBILITY SCREENING — rule-based pass/fail run before an        */
/*  application ever reaches an evaluator.                                */
/* ---------------------------------------------------------------------- */

/**
 * Which rules apply to a given challenge. Medium/High risk challenges (i.e.
 * ones that involve real citizen or government data) additionally require a
 * valid security certification.
 */
export function eligibilityRequirementsFor(challenge) {
  const needsSecurityCert = !challenge || challenge.risk !== "Low";
  return [
    { key: "registered", label: "Business registration verified", critical: true, check: (a) => !!a.registered },
    {
      key: "experience",
      label: "DPIIT recognition confirmed — experience and turnover relaxation applied",
      critical: true,
      check: (a) => !!a.dpiit || Number(a.yearsActive) >= 3,
      failureLabel: "At least 3 years of operating experience is required unless DPIIT recognition is verified",
    },
    ...(needsSecurityCert
      ? [{
        key: "cert",
        label: "Required security certification: ISO 27001 or equivalent",
        critical: true,
        check: (a) => (a.certifications || []).some((certification) => /iso\s*(\/\s*iec\s*)?27001/i.test(certification)),
      }]
      : []),
  ];
}

/**
 * Run every requirement against a startup and derive an overall verdict.
 * A failed critical requirement (e.g. a missing mandatory certification)
 * auto-rejects the application before it reaches the evaluation stage.
 */
export function runEligibilityCheck(startup, challenge, screenedAt = new Date().toISOString()) {
  const requirements = eligibilityRequirementsFor(challenge);
  const results = requirements.map((r) => ({ key: r.key, label: r.label, failureLabel: r.failureLabel || r.label, critical: r.critical, pass: r.check(startup) }));
  const failedCritical = results.find((r) => !r.pass && r.critical);
  const failedAny = results.find((r) => !r.pass);

  let status;
  if (failedCritical) status = "Auto-Rejected";
  else if (failedAny) status = "Missing Documents";
  else status = "Eligible";

  return {
    status,
    reason: failedAny ? failedAny.failureLabel : null,
    autoRejected: !!failedCritical,
    results,
    screenedAt,
    engine: "eligibility-rules-v1",
  };
}
