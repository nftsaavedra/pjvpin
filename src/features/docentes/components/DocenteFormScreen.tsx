import React from "react";
import { Plus } from "lucide-react";
import { useDocenteCreateForm } from "../hooks/useDocenteCreateForm";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { DniValidationSection } from "./DniValidationSection";
import { RenacytValidationSection } from "./RenacytValidationSection";

interface DocenteFormScreenProps {
  refreshTrigger?: number;
  onBack: () => void;
  onDocenteCreated: () => void;
}

export const DocenteFormScreen: React.FC<DocenteFormScreenProps> = ({
  refreshTrigger = 0,
  onBack,
  onDocenteCreated,
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
    isCheckingDni,
    isCheckingRenacyt,
    isLoading,
    nombreCompletoPreview,
    nombres,
    puedeValidarDni,
    puedeValidarRenacyt,
    renacytData,
    renacytQuery,
    renacytValidationMessage,
    renacytValidationStatus,
    setApellidoMaterno,
    setApellidoPaterno,
    setIdGrado,
    setNombres,
  } = useDocenteCreateForm(refreshTrigger, onDocenteCreated, onBack);

  return (
    <ScreenLayout
      header={
        <ScreenHeader
          parentLabel="Docentes"
          currentLabel="Registrar nuevo docente"
          onBack={onBack}
          isLoading={isLoading}
          submitLabel="Registrar"
          submitIcon={Plus}
          onSubmit={() => void handleSubmit({ preventDefault: () => {} } as React.SyntheticEvent)}
          submitDisabled={!dniFueValidado}
        />
      }
    >
      <div className="docente-form-layout">
        <div className="docente-form-grid">
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
          />

          <FormSelect
            label="Grado Académico"
            value={idGrado}
            onChange={setIdGrado}
            options={grados
              .filter((g) => g.activo !== 0)
              .map((g) => ({ value: g.id_grado, label: g.nombre }))}
            help="Seleccione el grado vigente del docente. Solo se muestran grados activos para preservar consistencia operativa."
            disabled={camposBloqueados}
            required
            containerClassName="docente-form-span-1"
          />

          <FormInput
            label="Nombres"
            value={nombres}
            onChange={setNombres}
            placeholder="Ej: Juan Carlos"
            help="Ingrese los nombres del docente. Este campo se usa junto con los apellidos para construir el nombre mostrado en la aplicación."
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="docente-form-span-1"
          />

          <FormInput
            label="Apellido paterno"
            value={apellidoPaterno}
            onChange={setApellidoPaterno}
            placeholder="Ej: Pérez"
            help="Ingrese el apellido paterno. Es obligatorio para mejorar la identificación y futuros filtros avanzados."
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="docente-form-span-1"
          />

          <FormInput
            label="Apellido materno"
            value={apellidoMaterno}
            onChange={setApellidoMaterno}
            placeholder="Ej: García"
            help="Ingrese el apellido materno si corresponde. Puede completarse automáticamente desde RENIEC cuando esté disponible."
            readOnly
            disabled={camposBloqueados}
            containerClassName="docente-form-span-2"
          />
        </div>
      </div>
    </ScreenLayout>
  );
};
