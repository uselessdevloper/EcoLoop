import { API_BASE_URL, STORAGE_KEYS } from "../utils/constants.js";
import { api } from "./api.js";

/**
 * Auth service. Connects to the backend /api/auth endpoints.
 */

export async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Login failed");
  }

  const data = await response.json();

  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
      name: data.name,
      email,
      role: data.role,
    }));
  } catch {
    // localStorage unavailable
  }

  return {
    user: {
      name: data.name,
      email,
      role: data.role,
    },
    token: data.access_token,
    refreshToken: data.access_token,
  };
}

export async function register({ name, email, password, role = "user" }) {
  const data = await api.post("/auth/register", { name, email, password, role }, { auth: false });
  return {
    id: String(data.id),
    name: data.name,
    email: data.email,
    role: data.role,
  };
}

export async function loginWithGoogle(idToken) {
  const data = await api.post("/auth/google", { id_token: idToken }, { auth: false });

  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
      name: data.name,
      email: "google-user",
      role: data.role,
    }));
  } catch {
    // localStorage unavailable
  }

  return {
    user: {
      name: data.name,
      email: "google-user",
      role: data.role,
    },
    token: data.access_token,
    refreshToken: data.access_token,
  };
}

export async function logout() {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } catch {
    /* no-op */
  }
}

export async function getCurrentUser() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return null;

    const data = await api.get("/auth/me");
    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch {
    // Token might be expired, try to restore from localStorage
    let stored = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }
    return stored;
  }
}

export function isAuthenticated() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));
  } catch {
    return false;
  }
}
