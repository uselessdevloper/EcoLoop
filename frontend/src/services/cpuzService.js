import { apiRequest } from "./api.js";

/**
 * Service to execute CPU-Z Prototype hardware spec extraction.
 * Supports Mobile (Android) and Laptop deep diagnostic flows.
 */
export async function runCpuzHardwareDiagnostic(deviceType = "mobile", customDeviceName = "") {
  const formData = new FormData();
  formData.append("device_type", deviceType);
  if (customDeviceName) {
    formData.append("custom_device_name", customDeviceName);
  }

  return apiRequest("/cpuz/run-diagnostic", {
    method: "POST",
    body: formData,
    auth: false,
  });
}
