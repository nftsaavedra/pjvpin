import React, { useId } from "react";
import { Shield } from "lucide-react";
import { messages } from "@/shared/feedback/messages";
import { inputClassName } from "@/shared/forms/inputClassName";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
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
    <div className="flex flex-col">
      <StepHeader
        icon={Shield}
        title={messages.wizard.stepTitle.password}
        description={messages.wizard.stepDesc.password}
      />

      <div className="p-6 flex flex-col gap-5">
        <div className="form">
          <div className="form-group">
            <label htmlFor={passId}>{messages.wizard.labelPasswordMaestra}</label>
            <input
              id={passId}
              type="password"
              className={inputClassName}
              value={password}
              onChange={(e) => {
                update("masterPassword", e.target.value);
              }}
              placeholder={messages.wizard.placeholderPasswordMaestra}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor={confirmId}>{messages.wizard.labelConfirmarPasswordMaestra}</label>
            <input
              id={confirmId}
              type="password"
              className={inputClassName}
              value={confirmPassword}
              onChange={(e) => {
                update("confirmPassword", e.target.value);
              }}
              placeholder={messages.wizard.placeholderConfirmarPasswordMaestra}
              autoComplete="new-password"
              required
            />
            {!match && confirmPassword.length > 0 && (
              <span className="form-hint form-hint-error">
                {messages.wizard.passwordNoCoinciden}
              </span>
            )}
          </div>

          <PasswordStrengthMeter value={password} requirements={requirements} />
        </div>

        <StepFooter
          primaryLabel={messages.wizard.continuar}
          primaryDisabled={!canContinue}
          onPrimary={onNext}
        />
      </div>
    </div>
  );
};
