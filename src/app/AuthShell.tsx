import { BookOpen } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { type Usuario } from "@/features/auth/api";

interface AuthShellProps {
  onAuthenticated: (usuario: Usuario) => void;
}

export function AuthShell({ onAuthenticated }: AuthShellProps) {
  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title title-with-icon">
              <AppIcon icon={BookOpen} size={24} />
              <span>UPI Research</span>
            </h1>
            <p className="app-subtitle">Gestión de Proyectos e Investigadores</p>
          </div>
        </div>
      </header>
      <main className="main-content flex items-center justify-center p-8">
        <AuthScreen onAuthenticated={onAuthenticated} />
      </main>
    </>
  );
}
