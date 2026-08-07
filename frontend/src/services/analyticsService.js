/**
 * Analytics service — connects to backend /api/analytics/* endpoints.
 */
import { api } from "./api.js";

export async function getVendorAnalytics() {
  return await api.get("/analytics/vendors");
}

export async function getVendorDetail(vendorName) {
  return await api.get(`/analytics/vendors/${encodeURIComponent(vendorName)}`);
}

export async function getSiteAnalytics() {
  return await api.get("/analytics/sites");
}

export async function getRepeatOffenders() {
  return await api.get("/analytics/repeat-offenders");
}

export async function getMonthlyTrend() {
  return await api.get("/analytics/monthly-trend");
}

export async function getMonthlyBreakdown() {
  return await api.get("/analytics/monthly-breakdown");
}
