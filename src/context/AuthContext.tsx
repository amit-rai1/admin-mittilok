import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  clearSession,
  getStoredUser,
  getToken,
  isAdminUser,
  saveSession,
  type AuthResponse,
  type User,
} from "../lib/api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api<User>("/auth/me");
        if (!isAdminUser(profile)) {
          clearSession();
          if (!cancelled) setUser(null);
          return;
        }
        localStorage.setItem("mittilok-admin-user", JSON.stringify(profile));
        if (!cancelled) setUser(profile);
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(emailOrPhone, password) {
        const result = await api<AuthResponse>("/auth/login", {
          method: "POST",
          auth: false,
          body: { emailOrPhone, password },
        });
        if (!isAdminUser(result.user)) {
          throw new Error("This account does not have admin access.");
        }
        saveSession(result);
        setUser(result.user);
      },
      logout() {
        clearSession();
        setUser(null);
      },
      async refreshProfile() {
        const profile = await api<User>("/auth/me");
        localStorage.setItem("mittilok-admin-user", JSON.stringify(profile));
        setUser(profile);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
