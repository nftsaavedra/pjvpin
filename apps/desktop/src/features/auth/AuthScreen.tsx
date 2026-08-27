import React, { useId, useState } from "react";
import { LogIn } from "lucide-react";
import { getTauriErrorMessage, loginUsuario, type Usuario } from "./api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { inputClassName } from "@/shared/forms/inputClassName";

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
      toast.warning(messages.auth.ingreseCredenciales);
      return;
    }

    setIsLoading(true);
    try {
      const usuario = await loginUsuario(username, password);
      toast.success(
        messages.auth.bienvenido(usuario.nombre_completo ?? messages.auth.fallbackUsuario),
      );
      onAuthenticated(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[520px] bg-card rounded-xl shadow-xl border border-border overflow-hidden">
        <header className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-light text-primary shrink-0">
            <AppIcon icon={LogIn} size={20} strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h1 className="text-xl font-bold text-text-primary leading-tight m-0">
              Acceso al sistema
            </h1>
            <p className="text-sm text-text-secondary leading-snug m-0 mt-0.5">
              Ingresa tus credenciales para utilizar el sistema.
            </p>
          </div>
          <div className="shrink-0 self-start pt-1">
            <FieldHelpTooltip
              label={messages.wizard.help.acceso.label}
              content={messages.wizard.help.acceso.content}
            />
          </div>
        </header>

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
                className={inputClassName}
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
                className={inputClassName}
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
                "Procesando…"
              ) : (
                <span className="button-with-icon">
                  <AppIcon icon={LogIn} size={18} />
                  <span>{messages.auth.ingresar}</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
