import React, { useId } from "react";
import { Shield } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import type { WizardState } from "../useWizardState";

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
}

const requirements = [
  { test: (p: string) => p.trim().length >= 8, label: "Al menos 8 caracteres" },
  { test: (p: string) => /[A-Z]/.test(p), label: "Al menos una mayuscula" },
  { test: (p: string) => /[a-z]/.test(p), label: "Al menos una minuscula" },
  { test: (p: string) => /\d/.test(p), label: "Al menos un digito" },
  { test: (p: string) => /[^a-zA-Z0-9]/.test(p), label: "Al menos un caracter especial" },
];

function allRequirementsMet(p: string) {
  return requirements.every((r) => r.test(p));
}

export const StepMasterPassword: React.FC<Props> = ({ state, update, onNext }) => {
  const passId = useId();
  const confirmId = useId();

  const password = state.masterPassword;
  const confirmPassword = state.confirmPassword;
  const valid = allRequirementsMet(password);
  const match = password === confirmPassword;
  const canContinue = valid && match && confirmPassword.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={Shield} size={32} className="text-primary mb-2" />
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h2 className="text-xl font-bold m-0 text-text-primary">
              Contraseña maestra de configuracion
            </h2>
            <FieldHelpTooltip
              label="Informacion sobre contraseña maestra"
              content="Clave de proteccion de credenciales. Se valida como requisito de seguridad y se usara para cifrar la configuracion en disco en una version futura."
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="form">
          <div className="form-group">
            <label htmlFor={passId}>Contraseña maestra *</label>
            <input
              id={passId}
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => {
                update("masterPassword", e.target.value);
              }}
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
              onChange={(e) => {
                update("confirmPassword", e.target.value);
              }}
              placeholder="Repita la contraseña"
              autoComplete="new-password"
              required
            />
            {!match && confirmPassword.length > 0 && (
              <span className="form-hint form-hint-error">Las contraseñas no coinciden</span>
            )}
          </div>

          <div className="rounded-xl px-4 py-3.5 bg-bg border border-border">
            <p className="text-xs font-bold m-0 mb-2 text-text-secondary">Requisitos:</p>
            <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
              {requirements.map((r) => (
                <li
                  key={r.label}
                  className={`text-sm ${
                    r.test(password) ? "text-secondary font-semibold" : "text-text-secondary"
                  }`}
                >
                  {r.test(password) ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={!canContinue}
            onClick={onNext}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
