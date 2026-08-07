/**
 * Triage service — backs the Daily Triage dashboard.
 * Connects to backend /api/triage endpoints.
 */
import { api } from "./api.js";

export async function getTriageQueue({ page = 1, pageSize = 20, filters = {} } = {}) {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (filters.status && filters.status !== "ALL") params.append("status_filter", filters.status);
  if (filters.search) params.append("search", filters.search);

  const items = await api.get(`/triage/queue?${params.toString()}`);
  return { items, page, pageSize, total: (items || []).length, filters };
}

export async function getTriageStats() {
  return await api.get("/triage/stats");
}

export async function getPipelineStatus() {
  return await api.get("/triage/pipeline-status");
}