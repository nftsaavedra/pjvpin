import { useEffect, useState } from "react";
import { getAuthStatus, getCurrentSession, logoutUsuario, type Usuario } from "@/features/auth/api";
import { toast } from "@/shared/feedback/toast";
import { getTauriErrorMessage } from "@/shared/tauri/error";

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
      const [, session] = await Promise.all([getAuthStatus(), getCurrentSession()]);
      setCurrentUser(session);
    } catch (error) {
      toast.error("Error verificando autenticación: " + getTauriErrorMessage(error));
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
      setCurrentUser(null);
    } catch (error) {
      toast.error("Error al cerrar sesión: " + getTauriErrorMessage(error));
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await cargarAuthStatus();
      } catch (error) {
        console.error("useAuth: init failed", error);
      }
    };
    void init();
  }, []);

  return { authLoading, currentUser, handleAuthenticated, handleLogout };
}
