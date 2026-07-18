import React from "react";
import { ShieldCheck } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { DniField } from "@/shared/forms/DniField";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { FormInput } from "@/shared/forms/FormInput";
import { useWizardCreateAdmin } from "../hooks/useWizardCreateAdmin";
import { messages } from "@/shared/feedback/messages";
import type { Usuario } from "@/shared/tauri/types";

interface Props {
  reniecToken: string;
  reniecDisponible: boolean;
  mongodbUri: string;
  mongodbDb?: string;
  onNext: (usuario: Usuario) => void;
  onBack: () => void;
}

export const StepCreateAdmin: React.FC<Props> = ({
  reniecToken,
  reniecDisponible,
  mongodbUri,
  mongodbDb,
  onNext,
  onBack,
}) => {
  const {
    dni,
    isManualMode,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    canSubmit,
    handleSubmit,
  } = useWizardCreateAdmin({
    reniecToken,
    reniecDisponible,
    mongodbUri,
    mongodbDb,
    onCreated: onNext,
  });

  const nombresReadOnly = !isManualMode && dni.isValidated;
  const nombresDisabled = !isManualMode && !dni.isValidated;
  const helpIdentidad = reniecDisponible
    ? messages.wizard.helpIdentidad.reniec
    : messages.wizard.helpIdentidad.sinReniec;

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={ShieldCheck} size={32} className="text-primary mb-2" />
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h2 className="text-xl font-bold m-0 text-text-primary">Crear usuario superuser</h2>
            <FieldHelpTooltip
              label={messages.wizard.help.superuser.label}
              content={messages.wizard.help.superuser.content}
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <form
          className="form"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <DniField
            dni={dni.dni}
            onDniChange={dni.setDni}
            onValidate={() => {
              void dni.handleValidar();
            }}
            isChecking={dni.isChecking}
            canValidate={dni.puedeValidar}
            validationStatus={dni.status}
            validationMessage={dni.message}
            isLoading={isSubmitting}
            inputId="wizard-admin-dni"
            helpText={
              reniecDisponible
                ? messages.wizard.helpDniField.reniecDisponible
                : messages.wizard.helpDniField.sinReniec
            }
          />

          <FormInput
            label="Nombres"
            value={dni.nombres}
            onChange={dni.setNombres}
            placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "Ej: Juan Carlos"}
            required
            readOnly={nombresReadOnly}
            disabled={nombresDisabled}
            help={helpIdentidad}
          />

          <FormInput
            label="Apellido paterno"
            value={dni.apellidoPaterno}
            onChange={dni.setApellidoPaterno}
            placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "Ej: Lopez"}
            required
            readOnly={nombresReadOnly}
            disabled={nombresDisabled}
          />

          <FormInput
            label="Apellido materno"
            value={dni.apellidoMaterno}
            onChange={dni.setApellidoMaterno}
            placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "(opcional)"}
            readOnly={nombresReadOnly}
            disabled={nombresDisabled}
          />

          {isManualMode && (
            <div className="inline-feedback inline-feedback-warning">
              {messages.wizard.reniecNoConfiguradoInfo}
            </div>
          )}

          {!isManualMode && !dni.isValidated && dni.dniLimpio.length === 8 && (
            <div className="inline-feedback inline-feedback-info">
              {messages.wizard.validarDniInfo}
            </div>
          )}

          <FormInput
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="Ej: superuser"
            autoComplete="username"
            required
          />

          <FormInput
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Minimo 8 caracteres, mayuscula, digito y especial"
            autoComplete="new-password"
            required
          />

          <FormInput
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repita la contraseña"
            autoComplete="new-password"
            required
            help={
              confirmPassword.length > 0 && password !== confirmPassword
                ? messages.wizard.passwordNoCoinciden
                : undefined
            }
          />

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <span className="form-hint form-hint-error">{messages.wizard.passwordNoCoinciden}</span>
          )}

          <div className="px-4 py-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-sm">
            {messages.wizard.rolSuperuserInfo}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" className="btn-secondary shrink-0" onClick={onBack}>
              {messages.wizard.atras}
            </button>
            <button type="submit" className="btn-primary ml-auto" disabled={!canSubmit}>
              {isSubmitting ? messages.wizard.creando : messages.wizard.crearSuperuser}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
