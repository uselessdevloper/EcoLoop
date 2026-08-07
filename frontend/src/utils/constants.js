/** Central place for magic values so services/components don't hardcode them. */

// During development the Vite proxy forwards /api/* → http://localhost:8000/api/*
// so a relative path is sufficient. Override with VITE_API_BASE_URL for staging/prod.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "fraudshield_auth_token",
  REFRESH_TOKEN: "fraudshield_refresh_token",
  CURRENT_USER: "fraudshield_current_user",
};

export const CASE_STATUS = {
  NEEDS_EVIDENCE: "needs_evidence",
  RETAKE_REQUESTED: "retake_requested",
  RESUBMITTED: "resubmitted",
  FINAL_DECISION: "final_decision",
};

export const REVIEW_DECISION = {
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_MORE_EVIDENCE: "needs_more_evidence",
};

export const CONFIDENCE_THRESHOLDS = {
  AUTO_DECIDE_MIN: 75, // at/above this, AI can auto-decide
  REVIEW_MIN: 50, // between REVIEW_MIN and AUTO_DECIDE_MIN, flagged but not urgent
  // below REVIEW_MIN => below auto-decide threshold, needs manual review
};

export const ROUTES = {
  LANDING: "/",
  LOGIN: "/login",
  TRIAGE: "/triage",
  CASE_DETAIL: "/case",
  HUMAN_REVIEW: "/review",
  CATALOG: "/catalog",
  ANALYTICS: "/analytics",
  FEEDBACK: "/feedback",
};
