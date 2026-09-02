import { useEffect, useState } from "react";
import { getAuthStatus, getCurrentSession, logoutUsuario, type Usuario } from "@/features/auth/api";
import { getRefreshToken, clearTokens } from "@/shared/http/tokenStore";
import { refreshSession } from "@/shared/http/client";

export interface UseAuthReturn {
  authLoading: boolean;
  currentUser: Usuario | null;
  handleAuthenticated: (usuario: Usuario) => void;
  handleLogout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  const cargarAuthStatus = async () => {
    try {
      const hasRefreshToken = !!getRefreshToken();
      if (hasRefreshToken) {
        const refreshed = await refreshSession();
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
