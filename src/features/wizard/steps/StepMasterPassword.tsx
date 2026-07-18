import React, { useId } from "react";
import { Shield } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { messages } from "@/shared/feedback/messages";
import { inputClassName } from "@/shared/forms/inputClassName";
import type { WizardState } from "../useWizardState";

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
}

const requirements = [
  { test: (p: string) => p.trim().length >= 8, label: messages.wizard.passwordRequisitos.longitud },
  { test: (p: string) => /[A-Z]/.test(p), label: messages.wizard.passwordRequisitos.mayuscula },
  { test: (p: string) => /[a-z]/.test(p), label: messages.wizard.passwordRequisitos.minuscula },
  { test: (p: string) => /\d/.test(p), label: messages.wizard.passwordRequisitos.digito },
  {
    test: (p: string) => /[^a-zA-Z0-9]/.test(p),
    label: messages.wizard.passwordRequisitos.especial,
  },
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
              label={messages.wizard.help.password.label}
              content={messages.wizard.help.password.content}
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
              className={inputClassName}
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
              className={inputClassName}
              value={confirmPassword}
              onChange={(e) => {
                update("confirmPassword", e.target.value);
              }}
              placeholder="Repita la contraseña"
              autoComplete="new-password"
              required
            />
            {!match && confirmPassword.length > 0 && (
              <span className="form-hint form-hint-error">
                {messages.wizard.passwordNoCoinciden}
              </span>
            )}
          </div>

          <div className="rounded-xl px-4 py-3.5 bg-bg border border-border">
            <p className="text-xs font-bold m-0 mb-2 text-text-secondary">
              {messages.wizard.passwordRequisitosTitle}
            </p>
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
            {messages.wizard.continuar}
          </button>
        </div>
      </div>
    </div>
  );
};
