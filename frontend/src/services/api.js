import { API_BASE_URL, STORAGE_KEYS } from "../utils/constants.js";

/**
 * Thin fetch wrapper: attaches the auth token, base URL, and JSON handling
 * in one place. Every service call goes through `apiRequest` for uniform
 * auth header injection and error handling.
 */

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export async function apiRequest(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const token = auth ? getToken() : null;
  const isFormData = body instanceof FormData;

  const finalHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  if (!isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    // TODO(backend): on 401, trigger a token refresh via authService and retry once,
    // rather than failing immediately. Left simple until refresh-token flow is confirmed.
    throw new ApiError(data?.detail || data?.message || `Request failed (${response.status})`, response.status, data);
  }

  return data;
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: "DELETE" }),
};

export { ApiError };
