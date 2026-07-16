import React, { useState } from "react";
import { Save } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { StatusChip } from "@/shared/ui/StatusChip";
import { getTauriErrorMessage } from "@/services/tauri/error";
import { wizardSaveConfig } from "@/services/tauri/wizard";
import { toast } from "@/services/toast";
import type { WizardConfigRequest } from "@/services/tauri/wizard";
import type { Usuario } from "@/services/tauri/types";

interface Props {
  request: WizardConfigRequest;
  usuario: Usuario;
  onDone: (usuario: Usuario) => void;
}

export const StepSummary: React.FC<Props> = ({ request, usuario, onDone }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await wizardSaveConfig(request);
      toast.success("Configuracion guardada correctamente");
      onDone(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const masked = (val: string | undefined, show = 4) => {
    if (!val) return "(no configurado)";
    if (val.length <= show) return "***";
    return val.slice(0, show) + "***";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={Save} size={32} className="text-primary mb-2" />
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h2 className="text-xl font-bold m-0 text-text-primary">Resumen de configuracion</h2>
            <FieldHelpTooltip
              label="Informacion sobre guardado"
              content="Revise los datos antes de guardar. La configuracion se guardara en disco. Proteja el archivo con permisos de usuario."
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              Base de datos
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">MongoDB URI</span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.mongodbUri}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">Base de datos</span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.mongodbDb ?? "pjvpin"}
              </code>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              Servicios externos
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">RENIEC</span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {masked(request.reniecToken)}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">RENACYT</span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.renacytBaseUrl ?? "Por defecto"}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">Pure API Key</span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {masked(request.pureApiKey)}
              </code>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              Usuario superuser
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">Username</span>
              <strong className="text-text-primary text-right">@{usuario.username}</strong>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">DNI</span>
              <code className="text-xs text-right text-text-primary">
                {usuario.dni ?? "(no registrado)"}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">Nombre</span>
              <strong className="text-text-primary text-right">{usuario.nombre_completo}</strong>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">Rol</span>
              <StatusChip variant="total">superuser</StatusChip>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={saving}
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? "Guardando..." : "Guardar configuracion e iniciar"}
          </button>
        </div>
      </div>
    </div>
  );
};
