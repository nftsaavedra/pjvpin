import React from "react";
import { ShieldCheck } from "lucide-react";
import { DniField } from "@/shared/forms/DniField";
import { FormInput } from "@/shared/forms/FormInput";
import { useWizardCreateAdmin } from "../hooks/useWizardCreateAdmin";
import { messages } from "@/shared/feedback/messages";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
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

  return (
    <div className="flex flex-col">
      <StepHeader
        icon={ShieldCheck}
        title={messages.wizard.stepTitle.admin}
        description={messages.wizard.stepDesc.admin}
      />

      <div className="p-6 flex flex-col gap-5">
        <section
          className="rounded-xl border border-border bg-card"
          aria-labelledby="wizard-dni-section"
        >
          <header className="px-4 py-3 border-b border-border">
            <h2 id="wizard-dni-section" className="text-sm font-bold text-text-primary m-0">
              Identidad del administrador
            </h2>
            <p className="text-xs text-text-secondary m-0 mt-0.5">
              {reniecDisponible
                ? "Ingresa el DNI y valida para autocompletar."
                : "Ingresa el DNI y completa los nombres manualmente."}
            </p>
          </header>
          <div className="p-4 flex flex-col gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormInput
                label="Nombres"
                value={dni.nombres}
                onChange={dni.setNombres}
                placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "Juan Carlos"}
                required
                readOnly={nombresReadOnly}
                disabled={nombresDisabled}
              />
              <FormInput
                label="Apellido paterno"
                value={dni.apellidoPaterno}
                onChange={dni.setApellidoPaterno}
                placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "López"}
                required
                readOnly={nombresReadOnly}
                disabled={nombresDisabled}
              />
              <FormInput
                label="Apellido materno"
                value={dni.apellidoMaterno}
                onChange={dni.setApellidoMaterno}
                placeholder={reniecDisponible ? "Validar DNI para autocompletar" : "Opcional"}
                readOnly={nombresReadOnly}
                disabled={nombresDisabled}
              />
            </div>

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
          </div>
        </section>

        <section
          className="rounded-xl border border-border bg-card"
          aria-labelledby="wizard-credentials-section"
        >
          <header className="px-4 py-3 border-b border-border">
            <h2 id="wizard-credentials-section" className="text-sm font-bold text-text-primary m-0">
              Credenciales de acceso
            </h2>
            <p className="text-xs text-text-secondary m-0 mt-0.5">
              El username y contraseña que usarás para ingresar al sistema.
            </p>
          </header>
          <div className="p-4 flex flex-col gap-4">
            <FormInput
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="superuser"
              autoComplete="username"
              required
            />
            <FormInput
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres, mayúscula, dígito y especial"
              autoComplete="new-password"
              required
            />
            <FormInput
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              required
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <span className="form-hint form-hint-error -mt-3">
                {messages.wizard.passwordNoCoinciden}
              </span>
            )}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {messages.wizard.rolSuperuserInfo}
            </div>
          </div>
        </section>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <StepFooter
            onBack={onBack}
            backLabel={messages.wizard.atras}
            primaryLabel={isSubmitting ? messages.wizard.creando : messages.wizard.crearSuperuser}
            primaryDisabled={!canSubmit}
            primaryLoading={isSubmitting}
            primaryType="submit"
          />
        </form>
      </div>
    </div>
  );
};
