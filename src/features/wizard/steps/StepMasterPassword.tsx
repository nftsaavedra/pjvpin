import React, { useId, useState } from 'react';
import { Shield } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import type { WizardState } from '../useWizardState';

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
}

const requirements = [
  { test: (p: string) => p.trim().length >= 12, label: 'Al menos 12 caracteres' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Al menos una mayuscula' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Al menos una minuscula' },
  { test: (p: string) => /\d/.test(p), label: 'Al menos un digito' },
  { test: (p: string) => /[^a-zA-Z0-9]/.test(p), label: 'Al menos un caracter especial' },
];

function allRequirementsMet(p: string) {
  return requirements.every((r) => r.test(p));
}

export const StepMasterPassword: React.FC<Props> = ({ state, update, onNext }) => {
  const passId = useId();
  const confirmId = useId();
  const [confirmPassword, setConfirmPassword] = useState('');

  const password = state.masterPassword;
  const valid = allRequirementsMet(password);
  const match = password === confirmPassword;
  const canContinue = valid && match && confirmPassword.length > 0;

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <AppIcon icon={Shield} size={32} />
        <h2>Contraseña maestra de configuracion</h2>
        <p>
          Esta contraseña protege las credenciales del sistema. Solo la necesitara para modificar
          la configuracion de servicios externos. No se le pedira al iniciar la app diariamente.
        </p>
      </div>

      <div className="form">
        <div className="form-group">
          <label htmlFor={passId}>Contraseña maestra *</label>
          <input
            id={passId}
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => { update('masterPassword', e.target.value); }}
            placeholder="Defina su contraseña maestra"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={confirmId}>Confirmar contraseña *</label>
          <input
            id={confirmId}
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); }}
            placeholder="Repita la contraseña"
            autoComplete="new-password"
            required
          />
          {!match && confirmPassword.length > 0 && (
            <span className="form-hint form-hint-error">Las contraseñas no coinciden</span>
          )}
        </div>

        <div className="wizard-requirements">
          <p className="wizard-requirements-title">Requisitos:</p>
          <ul className="wizard-requirements-list">
            {requirements.map((r) => (
              <li
                key={r.label}
                className={`wizard-req-item ${r.test(password) ? 'wizard-req-met' : ''}`}
              >
                {r.test(password) ? '✓' : '○'} {r.label}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="btn-primary wizard-next"
          disabled={!canContinue}
          onClick={onNext}
        >
          Continuar
        </button>
      </div>
    </div>
  );
};
