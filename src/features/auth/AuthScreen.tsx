import React, { useId, useState } from "react";
import { LogIn } from "lucide-react";
import { getTauriErrorMessage, loginUsuario, type Usuario } from "./api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { toast } from "@/shared/feedback/toast";

interface AuthScreenProps {
  onAuthenticated: (usuario: Usuario) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.warning("Ingrese usuario y contraseña");
      return;
    }

    setIsLoading(true);
    try {
      const usuario = await loginUsuario(username, password);
      toast.success(`Bienvenido ${usuario.nombre_completo}`);
      onAuthenticated(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[520px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4 bg-gradient-to-b from-blue-50 to-white border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-blue-900 m-0">Acceso al sistema</h2>
            <FieldHelpTooltip
              label="Informacion de acceso"
              content="Ingrese sus credenciales para utilizar el sistema."
            />
          </div>
        </div>

        <div className="p-6">
          <form
            className="form"
            onSubmit={(e) => {
              void handleLogin(e);
            }}
          >
            <div className="form-group">
              <label htmlFor={usernameId}>Usuario</label>
              <input
                id={usernameId}
                className="form-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                placeholder="Ej: admin"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={passwordId}>Contraseña</label>
              <input
                id={passwordId}
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder="Mínimo 8 caracteres"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? (
                "Procesando..."
              ) : (
                <span className="button-with-icon">
                  <AppIcon icon={LogIn} size={18} />
                  <span>Ingresar</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
