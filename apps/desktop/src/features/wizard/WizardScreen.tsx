import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useWizardState } from "./useWizardState";
import { StepperHeader, type StepMeta } from "./components/StepperHeader";
import { StepMasterPassword } from "./steps/StepMasterPassword";
import { StepCredentials } from "./steps/StepCredentials";
import { StepTestConnectivity } from "./steps/StepTestConnectivity";
import { StepCreateAdmin } from "./steps/StepCreateAdmin";
import { StepSummary } from "./steps/StepSummary";
import type { Usuario } from "@/shared/tauri/types";
import { messages } from "@/shared/feedback/messages";

interface Props {
  onDone: (usuario: Usuario) => void;
}

const STEP_META: StepMeta[] = [
  { label: messages.wizard.stepMeta.seguridad },
  { label: messages.wizard.stepMeta.servicios },
  { label: messages.wizard.stepMeta.conexion },
  { label: messages.wizard.stepMeta.usuario },
  { label: messages.wizard.stepMeta.resumen },
];

export const WizardScreen: React.FC<Props> = ({ onDone }) => {
  const { state, update, nextStep, prevStep, buildRequest } = useWizardState();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const handleAdminCreated = (u: Usuario) => {
    setUsuario(u);
    nextStep();
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title title-with-icon">
              <AppIcon icon={BookOpen} size={24} />
              <span>{messages.wizard.asistente}</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="main-content flex items-start justify-center p-8 flex-1">
        <div className="w-full max-w-[640px] flex flex-col">
          <StepperHeader steps={STEP_META} currentStep={state.step} />

          <div className="rounded-xl overflow-hidden w-full bg-card border border-border shadow-xl">
            {state.step === 1 && (
              <StepMasterPassword state={state} update={update} onNext={nextStep} />
            )}
            {state.step === 2 && (
              <StepCredentials state={state} update={update} onNext={nextStep} onBack={prevStep} />
            )}
            {state.step === 3 && (
              <StepTestConnectivity
                state={state}
                update={update}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {state.step === 4 && (
              <StepCreateAdmin
                reniecToken={state.reniecToken}
                reniecDisponible={state.results.reniec && state.reniecToken.trim() !== ""}
                mongodbUri={state.mongodbUri}
                mongodbDb={state.mongodbDb || undefined}
                onNext={handleAdminCreated}
                onBack={prevStep}
              />
            )}
            {state.step === 5 && usuario && (
              <StepSummary request={buildRequest()} usuario={usuario} onDone={onDone} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
