import React, { useState } from "react";
import { BookOpen, Check, ChevronRight } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useWizardState } from "./useWizardState";
import { StepMasterPassword } from "./steps/StepMasterPassword";
import { StepCredentials } from "./steps/StepCredentials";
import { StepTestConnectivity } from "./steps/StepTestConnectivity";
import { StepCreateAdmin } from "./steps/StepCreateAdmin";
import { StepSummary } from "./steps/StepSummary";
import type { Usuario } from "@/services/tauri/types";

interface Props {
  onDone: (usuario: Usuario) => void;
}

const STEP_META = [
  { label: "Seguridad", short: "1" },
  { label: "Servicios", short: "2" },
  { label: "Conexion", short: "3" },
  { label: "Usuario", short: "4" },
  { label: "Resumen", short: "5" },
];

export const WizardScreen: React.FC<Props> = ({ onDone }) => {
  const { state, update, nextStep, prevStep, buildRequest } = useWizardState();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const handleAdminCreated = (u: Usuario) => {
    setUsuario(u);
    nextStep();
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title title-with-icon">
              <AppIcon icon={BookOpen} size={24} />
              <span>UPI Research</span>
            </h1>
            <p className="app-subtitle">Asistente de configuracion inicial</p>
          </div>
        </div>
      </header>

      <main className="main-content auth-main">
        <div className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 py-8 pb-12">
          <div className="flex items-center justify-center mb-8 w-full">
            {STEP_META.map((meta, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === state.step;
              const isDone = stepNum < state.step;
              return (
                <div
                  key={meta.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs ${
                    isActive
                      ? "text-primary font-semibold"
                      : isDone
                        ? "text-secondary"
                        : "text-text-secondary"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${
                      isActive
                        ? "bg-primary text-white"
                        : isDone
                          ? "bg-secondary text-white"
                          : "bg-border text-text-secondary"
                    }`}
                  >
                    {isDone ? <AppIcon icon={Check} size={10} /> : meta.short}
                  </span>
                  <span className="hidden sm:inline">{meta.label}</span>
                  {i < STEP_META.length - 1 && (
                    <AppIcon icon={ChevronRight} size={12} className="shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

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
