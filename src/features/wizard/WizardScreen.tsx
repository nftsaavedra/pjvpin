import React, { useState } from 'react';
import { BookOpen, Play } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import { useWizardState } from './useWizardState';
import { StepMasterPassword } from './steps/StepMasterPassword';
import { StepCredentials } from './steps/StepCredentials';
import { StepTestConnectivity } from './steps/StepTestConnectivity';
import { StepCreateAdmin } from './steps/StepCreateAdmin';
import { StepSummary } from './steps/StepSummary';
import type { Usuario } from '@/services/tauri/types';

interface Props {
  onDone: (usuario: Usuario) => void;
}

export const WizardScreen: React.FC<Props> = ({ onDone }) => {
  const { state, update, nextStep, prevStep, buildRequest } = useWizardState();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const handleAdminCreated = (u: Usuario) => {
    setUsuario(u);
    nextStep();
  };

  const steps = ['Paso 1', 'Paso 2', 'Paso 3', 'Paso 4', 'Paso 5'];

  return (
    <div className="wizard-shell">
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
        <div className="wizard-container">
          <div className="wizard-progress">
            {steps.map((label, i) => (
              <div
                key={label}
                className={`wizard-progress-step ${i + 1 <= state.step ? 'active' : ''} ${i + 1 < state.step ? 'done' : ''}`}
              >
                <span className="wizard-dot">{i + 1 < state.step ? <AppIcon icon={Play} size={10} /> : i + 1}</span>
                <span className="wizard-progress-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="wizard-card">
            {state.step === 1 && (
              <StepMasterPassword state={state} update={update} onNext={nextStep} />
            )}
            {state.step === 2 && (
              <StepCredentials
                state={state}
                update={update}
                onNext={nextStep}
                onBack={prevStep}
              />
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
              <StepCreateAdmin onNext={handleAdminCreated} onBack={prevStep} />
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
