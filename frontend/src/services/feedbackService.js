/**
 * Feedback Panel (Pipeline Tuning) service layer.
 * Connects to backend /api/triage/pipeline endpoints.
 */
import { api } from "./api.js";

export async function fetchPipelineConfig() {
  return await api.get("/triage/pipeline/config");
}

export async function savePipelineConfig(config) {
  if (!config) {
    throw new Error("No config provided");
  }
  const data = await api.put("/triage/pipeline/config", config);
  return data;
}

export async function fetchAdjustmentHistory() {
  return await api.get("/triage/pipeline/history");
}