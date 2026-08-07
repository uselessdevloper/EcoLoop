import { apiRequest } from "./api.js";

/**
 * Service to trigger device evaluation & intelligence report generation.
 */
export async function evaluateDeviceScan({ file, presetCategory = "auto", hardwareDiagnostics = {}, apiKey, workspaceName, workflowId }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preset_category", presetCategory);
  
  if (hardwareDiagnostics) {
    formData.append("hardware_diagnostics_json", JSON.stringify(hardwareDiagnostics));
  }
  if (apiKey) formData.append("api_key", apiKey);
  if (workspaceName) formData.append("workspace_name", workspaceName);
  if (workflowId) formData.append("workflow_id", workflowId);

  return apiRequest("/evaluation/scan", {
    method: "POST",
    body: formData,
    auth: false, // Mobile evaluation scanner can run without forcing login
  });
}
