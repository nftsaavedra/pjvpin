import React from "react";
import { Plus } from "lucide-react";
import { useInvestigadorCreateForm } from "../hooks/useInvestigadorCreateForm";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { DniField } from "@/shared/forms/DniField";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { messages } from "@/shared/feedback/messages";
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
          <DniField
            dni={dni}
            onDniChange={handleDniChange}
            onValidate={() => void handleValidarDni()}
            isChecking={isCheckingDni}
            canValidate={puedeValidarDni}
            validationStatus={dniValidationStatus}
            validationMessage={dniValidationMessage}
            isLoading={isLoading}
            layout="span-2"
            inputId="investigador-dni"
            placeholder={messages.investigadores.form.dniPlaceholder}
            helpText={messages.investigadores.form.dniHelp}
            buttonIdleLabel={messages.investigadores.form.dniButtonIdle}
            buttonBusyLabel={messages.investigadores.form.dniButtonBusy}
            showPreview
            nombreCompletoPreview={nombreCompletoPreview}
            previewLabel={messages.investigadores.form.dniPreviewLabel}
            previewPlaceholder={messages.investigadores.form.dniPreviewPlaceholder}
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
            label={messages.investigadores.form.gradoLabel}
            value={idGrado}
            onChange={setIdGrado}
            options={grados
              .filter((g) => g.activo !== 0)
              .map((g) => ({ value: g.id_grado, label: g.nombre }))}
            help={messages.investigadores.form.gradoHelp}
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormSelect
            label={messages.investigadores.form.perfilLabel}
            value={perfil}
            onChange={(value) => {
              setPerfil(value as typeof perfil);
            }}
            options={perfiles}
            help={messages.investigadores.form.perfilHelp}
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label={messages.investigadores.form.nombresLabel}
            value={nombres}
            onChange={setNombres}
            placeholder={messages.investigadores.form.nombresPlaceholder}
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label={messages.investigadores.form.apellidoPaternoLabel}
            value={apellidoPaterno}
            onChange={setApellidoPaterno}
            placeholder={messages.investigadores.form.apellidoPaternoPlaceholder}
            readOnly
            disabled={camposBloqueados}
            required
            containerClassName="investigador-form-span-1"
          />

          <FormInput
            label={messages.investigadores.form.apellidoMaternoLabel}
            value={apellidoMaterno}
            onChange={setApellidoMaterno}
            placeholder={messages.investigadores.form.apellidoMaternoPlaceholder}
            help={messages.investigadores.form.apellidoMaternoHelp}
            readOnly
            disabled={camposBloqueados}
            containerClassName="investigador-form-span-2"
          />
        </div>
      </div>
    </ScreenLayout>
  );
};
