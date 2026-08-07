/**
 * Case service — connects to backend /api/triage/cases endpoints.
 */
import { api } from "./api.js";

export async function getCases() {
  return await api.get("/triage/cases");
}

export async function getCaseById(caseId) {
  const data = await api.get(`/triage/cases/${caseId}/detail`);
  return {
    id: data.metadata.id,
    partCode: data.metadata.partCode,
    commodity: data.metadata.commodity,
    confidencePct: data.metadata.confidencePct,
    fraudScore: data.metadata.fraudScore,
    category: data.metadata.category,
    status: data.metadata.status,
    updatedAt: data.metadata.updatedAt,
    imageHash: data.metadata.imageHash,
    neuralModel: data.metadata.neuralModel,
    heatmapUrl: data.metadata.heatmapUrl,
    goldenImageUrl: data.metadata.goldenImageUrl,
    uploadedImageUrl: data.metadata.uploadedImageUrl,
    captureAngle: data.metadata.captureAngle,
    multiAngleViews: data.metadata.multiAngleViews || [],
    pipelineComplete: data.metadata.pipelineComplete,
    title: `Case detail for ${data.metadata.partCode}`,
    pipelineVerdict: data.pipelineVerdict,
    pipelineCategory: data.pipelineCategory,
    pipelineAction: data.pipelineAction,
    ocrResults: data.ocrResults,
    metrics: data.metrics,
    timeline: data.timeline,
    recommendation: data.recommendation,
    evidence: data.evidence,
  };
}

export async function updateCaseStatus(caseId, status) {
  const data = await api.post(`/triage/cases/${caseId}/status`, { status });
  return data;
}

export async function getProducts() {
  return await api.get("/products");
}

export async function createInspection(formData) {
  return await api.post("/inspections", formData);
}

export async function getCatalog() {
  return await api.get("/inspections/catalog");
}

export async function deleteCase(caseId) {
  return await api.delete(`/inspections/${caseId}`);
}

export async function getMultiAngleFusion(caseIds) {
  return await api.post("/inspections/multi-angle-fusion", { case_ids: caseIds });
}

export async function autoMatchGolden(file) {
  const formData = new FormData();
  formData.append("file", file);
  return await api.post("/inspections/auto-match-golden", formData);
}