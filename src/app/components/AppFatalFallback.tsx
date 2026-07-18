import { AlertOctagon, RotateCcw } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";

export function AppFatalFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-[520px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4 bg-gradient-to-b from-amber-50 to-white border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1.5">
            <AppIcon icon={AlertOctagon} size={22} className="text-amber-600" />
            <h2 className="text-amber-900 m-0">Error inesperado</h2>
          </div>
          <p className="text-sm text-gray-600 m-0">
            La aplicacion encontro un error al cargar la interfaz principal.
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 m-0 mb-4">
            Recarga la ventana para continuar. Si el problema persiste, contacta al administrador
            del sistema.
          </p>
          <button type="button" className="btn-primary w-full" onClick={handleReload}>
            <span className="button-with-icon">
              <AppIcon icon={RotateCcw} size={18} />
              <span>Recargar aplicacion</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
