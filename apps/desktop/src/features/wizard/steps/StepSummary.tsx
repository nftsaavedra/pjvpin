import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { StatusChip } from "@/shared/ui/StatusChip";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import { wizardSaveConfig } from "@/shared/tauri/wizard";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { SummaryCard } from "../components/SummaryCard";
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
    return `${val.slice(0, show)}…`;
  };

  const dbFields = [
    { label: messages.wizard.summaryLabels.mongoUri, value: request.mongodbUri, mono: true },
    {
      label: messages.wizard.summaryLabels.baseDatos,
      value: request.mongodbDb ?? "pjvpin",
      mono: true,
    },
  ];

  const servicesFields = [
    { label: messages.wizard.summaryLabels.reniec, value: masked(request.reniecToken), mono: true },
    {
      label: messages.wizard.summaryLabels.renacyt,
      value: request.renacytBaseUrl ?? messages.wizard.porDefecto,
      mono: true,
    },
    {
      label: messages.wizard.summaryLabels.pureApiKey,
      value: masked(request.pureApiKey),
      mono: true,
    },
  ];

  const userFields = [
    { label: messages.wizard.summaryLabels.username, value: `@${usuario.username}` },
    {
      label: messages.wizard.summaryLabels.dni,
      value: usuario.dni ?? messages.wizard.noRegistrado,
      mono: true,
    },
    { label: messages.wizard.summaryLabels.nombre, value: usuario.nombre_completo },
    {
      label: messages.wizard.summaryLabels.rol,
      value: <StatusChip variant="total">superuser</StatusChip>,
    },
  ];

  return (
    <div className="flex flex-col">
      <StepHeader
        icon={CheckCircle2}
        title={messages.wizard.stepTitle.summary}
        description={messages.wizard.stepDesc.summary}
      />

      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
            <AppIcon icon={CheckCircle2} size={18} strokeWidth={2.5} />
          </span>
          <div className="flex flex-col">
            <strong className="text-sm font-bold text-emerald-900">Usuario superuser creado</strong>
            <span className="text-xs text-emerald-800">
              @{usuario.username} · {usuario.nombre_completo}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SummaryCard title={messages.wizard.summaryLabels.seccionBaseDatos} fields={dbFields} />
          <SummaryCard
            title={messages.wizard.summaryLabels.seccionServicios}
            fields={servicesFields}
          />
          <SummaryCard title={messages.wizard.summaryLabels.seccionSuperuser} fields={userFields} />
        </div>

        <StepFooter
          primaryLabel={saving ? messages.wizard.guardando : messages.wizard.guardarConfiguracion}
          primaryLoading={saving}
          primaryDisabled={saving}
          primaryType="button"
          onPrimary={() => {
            void handleSave();
          }}
          secondaryAction={{
            label: "Cancelar",
            onClick: () => {
              window.history.back();
            },
          }}
        />
      </div>
    </div>
  );
};
