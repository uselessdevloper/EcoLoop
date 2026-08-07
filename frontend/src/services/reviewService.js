/**
 * Human Review service layer.
 * Connects to backend /api/triage/cases/:id/review and /api/reviews endpoints.
 */
import { api } from "./api.js";

export async function fetchCaseForReview(caseId) {
  try {
    const data = await api.get(`/triage/cases/${caseId}/review`);
    return data;
  } catch {
    // Return null on error — UI handles missing data gracefully
    return null;
  }
}

export async function updateROIRegion(caseId, region) {
  const data = await api.post(`/triage/cases/${caseId}/roi`, { region });
  return data;
}

export async function submitReviewDecision(caseId, decision, notes) {
  if (!decision) {
    throw new Error("A decision type is required");
  }
  const data = await api.post(`/reviews/${caseId}`, {
    action: decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "override",
    override_verdict: decision === "needs_more_evidence" ? "needs_more_evidence" : undefined,
    comments: notes,
  });
  return {
    caseId,
    decision,
    notes,
    decidedAt: new Date().toISOString(),
  };
}