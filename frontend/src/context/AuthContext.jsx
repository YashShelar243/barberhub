import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "barberhub_token";
const USER_KEY = "barberhub_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [authLoading, setAuthLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  // Verify the saved token and refresh the user profile
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (cancelled) return;

        const currentUser = response.data.user;

        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
        setToken(savedToken);
      } catch {
        if (cancelled) return;

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (userData, accessToken) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_KEY, accessToken);

    setUser(userData);
    setToken(accessToken);
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);

    setUser(null);
    setToken(null);
  };

  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
