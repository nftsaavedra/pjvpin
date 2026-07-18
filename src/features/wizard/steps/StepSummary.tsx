import React, { useState } from "react";
import { Save } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { StatusChip } from "@/shared/ui/StatusChip";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import { wizardSaveConfig } from "@/shared/tauri/wizard";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import type { WizardConfigRequest } from "@/shared/tauri/wizard";
import type { Usuario } from "@/shared/tauri/types";

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
      toast.success(messages.wizard.configGuardadaExito);
      onDone(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const masked = (val: string | undefined, show = 4) => {
    if (!val) return messages.wizard.noConfigurado;
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
              label={messages.wizard.help.guardado.label}
              content={messages.wizard.help.guardado.content}
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              {messages.wizard.summaryLabels.seccionBaseDatos}
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.mongoUri}
              </span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.mongodbUri}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.baseDatos}
              </span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.mongodbDb ?? "pjvpin"}
              </code>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              {messages.wizard.summaryLabels.seccionServicios}
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.reniec}
              </span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {masked(request.reniecToken)}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.renacyt}
              </span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {request.renacytBaseUrl ?? messages.wizard.porDefecto}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.pureApiKey}
              </span>
              <code className="text-xs break-all text-right max-w-[28ch] text-text-primary">
                {masked(request.pureApiKey)}
              </code>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3.5 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-[0.04em] m-0 mb-2 text-text-secondary">
              {messages.wizard.summaryLabels.seccionSuperuser}
            </h3>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.username}
              </span>
              <strong className="text-text-primary text-right">@{usuario.username}</strong>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.dni}
              </span>
              <code className="text-xs text-right text-text-primary">
                {usuario.dni ?? messages.wizard.noRegistrado}
              </code>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.nombre}
              </span>
              <strong className="text-text-primary text-right">{usuario.nombre_completo}</strong>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-secondary shrink-0">
                {messages.wizard.summaryLabels.rol}
              </span>
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
            {saving ? messages.wizard.guardando : messages.wizard.guardarConfiguracion}
          </button>
        </div>
      </div>
    </div>
  );
};
