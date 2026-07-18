import React from "react";
import { Plus } from "lucide-react";
import { useInvestigadorCreateForm } from "../hooks/useInvestigadorCreateForm";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { DniValidationSection } from "./DniValidationSection";
import { RenacytValidationSection } from "./RenacytValidationSection";

interface InvestigadorFormScreenProps {
  refreshTrigger?: number;
  onBack: () => void;
  onInvestigadorCreated: () => void;
}

export const InvestigadorFormScreen: React.FC<InvestigadorFormScreenProps> = ({
  refreshTrigger = 0,
  onBack,
  onInvestigadorCreated,
}) => {
  const {
    apellidoMaterno,
    apellidoPaterno,
    camposBloqueados,
    dni,
    dniFueValidado,
    dniValidationMessage,
    dniValidationStatus,
    grados,
    handleDniChange,
    handleRenacytChange,
    handleSubmit,
    handleValidarDni,
    handleValidarRenacyt,
    idGrado,
    isAutoCheckingRenacyt,
    isAutoNotFoundRenacyt,
    isCheckingDni,
    isCheckingRenacyt,
    isLoading,
    nombreCompletoPreview,
    nombres,
    perfil,
    perfiles,
    puedeValidarDni,
    puedeValidarRenacyt,
    renacytData,
    renacytQuery,
    renacytSource,
    renacytValidationMessage,
    renacytValidationStatus,
    setApellidoMaterno,
    setApellidoPaterno,
    setIdGrado,
    setNombres,
    setPerfil,
  } = useInvestigadorCreateForm(refreshTrigger, onInvestigadorCreated, onBack);

  return (
    <ScreenLayout
      header={
        <ScreenHeader
          parentLabel="Investigadores"
          currentLabel="Registrar nuevo investigador"
          onBack={onBack}
          isLoading={isLoading}
          submitLabel="Registrar"
          submitIcon={Plus}
          onSubmit={() => void handleSubmit({ preventDefault: () => {} } as React.SyntheticEvent)}
          submitDisabled={!dniFueValidado}
        />
      }
    >
      <div className="investigador-form-layout">
        <div className="investigador-form-grid">
          <DniValidationSection
            dni={dni}
            onDniChange={handleDniChange}
            onValidate={() => void handleValidarDni()}
            isChecking={isCheckingDni}
            canValidate={puedeValidarDni}
            validationStatus={dniValidationStatus}
            validationMessage={dniValidationMessage}
            isLoading={isLoading}
            nombreCompletoPreview={nombreCompletoPreview}
          />

          <RenacytValidationSection
            renacytQuery={renacytQuery}
            onRenacytChange={handleRenacytChange}
            onValidate={() => void handleValidarRenacyt()}
            isChecking={isCheckingRenacyt}
            canValidate={puedeValidarRenacyt}
            validationStatus={renacytValidationStatus}
            validationMessage={renacytValidationMessage}
            isLoading={isLoading}
            dniFueValidado={dniFueValidado}
            renacytData={renacytData}
            isAutoChecking={isAutoCheckingRenacyt}
            isAutoNotFound={isAutoNotFoundRenacyt}
            renacytSource={renacytSource}
          />

          <FormSelect
            label="Grado Académico"
            value={idGrado}
            onChange={setIdGrado}
            options={grados
              .filter((g) => g.activo !== 0)
              .map((g) => ({ value: g.id_grado, label: g.nombre }))}
            help="Solo se muestran grados activos."
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormSelect
            label="Perfil del investigador"
            value={perfil}
            onChange={(value) => {
              setPerfil(value as typeof perfil);
            }}
            options={perfiles}
            help="Docente es el perfil por defecto; tesista y alumno egresado se usan para investigadores en formación."
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label="Nombres"
            value={nombres}
            onChange={setNombres}
            placeholder="Ej: Juan Carlos"
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label="Apellido paterno"
            value={apellidoPaterno}
            onChange={setApellidoPaterno}
            placeholder="Ej: Pérez"
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label="Apellido materno"
            value={apellidoMaterno}
            onChange={setApellidoMaterno}
            placeholder="Ej: García"
            help="Se completa automáticamente desde RENIEC cuando está disponible."
            readOnly
            disabled={camposBloqueados}
            containerClassName="investigador-form-span-2"
          />
        </div>
      </div>
    </ScreenLayout>
  );
};
