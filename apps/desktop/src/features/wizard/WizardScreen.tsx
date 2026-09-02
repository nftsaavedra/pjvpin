import React from "react";
import { BookOpen } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useWizardState } from "./useWizardState";
import { StepperHeader, type StepMeta } from "./components/StepperHeader";
import { StepApiUrl } from "./steps/StepApiUrl";
import { StepCreateAdmin } from "./steps/StepCreateAdmin";
import type { Usuario } from "@/shared/api/types";
import { messages } from "@/shared/feedback/messages";

interface Props {
  onDone: (usuario: Usuario) => void;
}

const STEP_META: StepMeta[] = [
  { label: "Servidor" },
  { label: "Superuser" },
];

export const WizardScreen: React.FC<Props> = ({ onDone }) => {
  const { state, setHealth, prevStep } = useWizardState();

  const handleAdminCreated = (u: Usuario) => {
    onDone(u);
  };

  const reniecDisponible = state.health?.ok ?? false;

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
            {state.step === 1 && <StepApiUrl onNext={setHealth} />}
            {state.step === 2 && (
              <StepCreateAdmin
                reniecDisponible={reniecDisponible}
                onNext={handleAdminCreated}
                onBack={prevStep}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
