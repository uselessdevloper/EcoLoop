import { createContext, useCallback, useEffect, useState } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  loginWithGoogle as googleLoginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../services/authService.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { user: loggedInUser } = await loginRequest(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    try {
      return await registerRequest(payload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setError(null);
    try {
      const { user: loggedInUser } = await googleLoginRequest(idToken);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, loginWithGoogle, logout, register, isAuthenticated: Boolean(user) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
