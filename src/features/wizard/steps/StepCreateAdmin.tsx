import React from "react";
import { ShieldCheck } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { DniField } from "@/shared/forms/DniField";
import { FormInput } from "@/shared/forms/FormInput";
import { useWizardCreateAdmin } from "../hooks/useWizardCreateAdmin";
import type { Usuario } from "@/services/tauri/types";

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
    ? "Datos autocompletados desde RENIEC. Para modificar, reingrese el DNI."
    : "RENIEC no esta disponible. Ingrese los nombres manualmente; el DNI garantiza trazabilidad.";

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={ShieldCheck} size={32} className="text-primary mb-2" />
          <h2 className="text-xl font-bold m-0 mb-1.5 text-text-primary">
            Crear usuario superuser
          </h2>
          <p className="text-sm leading-6 max-w-[44ch] mx-auto text-text-secondary">
            Este es el primer usuario del sistema con maximo nivel de acceso. Podra gestionar
            usuarios, configurar servicios externos y administrar el sistema completo.
          </p>
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
                ? "Ingrese el DNI del superuser. Se validara contra RENIEC para autocompletar nombres y apellidos."
                : "Ingrese el DNI del superuser. RENIEC no esta configurado: el nombre se ingresara manualmente."
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
              RENIEC no esta configurado. El DNI queda registrado para trazabilidad, pero el nombre
              sera el que se ingrese manualmente. Configure el token RENIEC despues desde
              Configuracion si requiere verificar identidades automaticamente.
            </div>
          )}

          {!isManualMode && !dni.isValidated && dni.dniLimpio.length === 8 && (
            <div className="inline-feedback inline-feedback-info">
              RENIEC esta disponible. Valide el DNI para autocompletar los datos y poder continuar.
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
                ? "Las contraseñas no coinciden"
                : undefined
            }
          />

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <span className="form-hint form-hint-error">Las contraseñas no coinciden</span>
          )}

          <div className="auth-note">
            Usuario con rol <strong>superuser</strong>. Unico en el sistema. No se puede eliminar
            desde la interfaz. La identidad se registra con DNI para trazabilidad.
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" className="btn-secondary shrink-0" onClick={onBack}>
              Atras
            </button>
            <button type="submit" className="btn-primary ml-auto" disabled={!canSubmit}>
              {isSubmitting ? "Creando..." : "Crear superuser"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
