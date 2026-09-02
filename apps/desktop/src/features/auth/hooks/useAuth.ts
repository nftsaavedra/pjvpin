import { useEffect, useState } from "react";
import { getAuthStatus, getCurrentSession, logoutUsuario, type Usuario } from "@/features/auth/api";
import { getRefreshToken, clearTokens } from "@/shared/http/tokenStore";
import { apiFetch } from "@/shared/http/client";

export interface UseAuthReturn {
  authLoading: boolean;
  currentUser: Usuario | null;
  handleAuthenticated: (usuario: Usuario) => void;
  handleLogout: () => Promise<void>;
}

async function tryRefreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await apiFetch<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      { method: "POST", body: { refreshToken }, noAuth: true },
    );
    const { setTokens } = await import("@/shared/http/tokenStore");
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export function useAuth(): UseAuthReturn {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  const cargarAuthStatus = async () => {
    try {
      const hasRefreshToken = !!getRefreshToken();
      if (hasRefreshToken) {
        const refreshed = await tryRefreshTokens();
        if (!refreshed) {
          setAuthLoading(false);
          return;
        }
      }

      const [, session] = await Promise.all([getAuthStatus(), getCurrentSession()]);
      setCurrentUser(session);
    } catch {
      clearTokens();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthenticated = (usuario: Usuario) => {
    setCurrentUser(usuario);
  };

  const handleLogout = async () => {
    try {
      await logoutUsuario();
    } catch {
      // Logout best-effort
    } finally {
      clearTokens();
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await cargarAuthStatus();
      } catch {
        // Error already handled in cargarAuthStatus
      }
    };
    void init();
  }, []);

  return { authLoading, currentUser, handleAuthenticated, handleLogout };
}
