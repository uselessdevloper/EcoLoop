import { CONFIDENCE_THRESHOLDS } from "./constants.js";

/** "42%" */
export function formatPercent(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** Confidence badge text, matching the wording used in the Human Review design. */
export function formatConfidenceLabel(confidencePct) {
  if (confidencePct >= CONFIDENCE_THRESHOLDS.AUTO_DECIDE_MIN) {
    return `Confidence: ${confidencePct}% — auto-decide eligible`;
  }
  if (confidencePct >= CONFIDENCE_THRESHOLDS.REVIEW_MIN) {
    return `Confidence: ${confidencePct}% — review recommended`;
  }
  return `Confidence: ${confidencePct}% — below auto-decide threshold`;
}

/** "0.85" style score used for SSIM etc. — fixed decimal, no trailing zero trimming. */
export function formatScore(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

/** Fraud score is 0-100; routing rules key off thresholds like ">= 75". */
export function formatFraudScore(score) {
  if (score === null || score === undefined) return "—";
  return `${Math.round(score)}`;
}
