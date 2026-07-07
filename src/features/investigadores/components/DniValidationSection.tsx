import React from "react";
import { Search } from "lucide-react";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { AppIcon } from "@/shared/ui/AppIcon";

interface DniValidationSectionProps {
  dni: string;
  onDniChange: (value: string) => void;
  onValidate: () => void;
  isChecking: boolean;
  canValidate: boolean;
  validationStatus: string | null;
  validationMessage: string;
  isLoading: boolean;
  nombreCompletoPreview: string;
}

export const DniValidationSection: React.FC<DniValidationSectionProps> = ({
  dni,
  onDniChange,
  onValidate,
  isChecking,
  canValidate,
  validationStatus,
  validationMessage,
  isLoading,
  nombreCompletoPreview,
}) => (
  <>
    <div className="form-group docente-form-span-2 docente-dni-group">
      <div className="form-label-row">
        <label htmlFor="docente-dni" className="form-label-text">
          DNI *
        </label>
        <FieldHelpTooltip
          label="Ayuda para DNI"
          content="Primero se valida si el DNI ya existe en la base principal. Solo si no existe, se consulta RENIEC para autocompletar los datos y habilitar el registro."
        />
      </div>
      <div className="form-input-action-group docente-dni-input-row">
        <input
          id="docente-dni"
          type="text"
          value={dni}
          onChange={(event) => { onDniChange(event.target.value); }}
          placeholder="Ej: 45678912"
          maxLength={8}
          required
          className="form-input"
          inputMode="numeric"
          autoComplete="off"
          disabled={isLoading || isChecking}
        />
        <button
          type="button"
          className="btn-secondary form-input-action-button"
          onClick={() => { onValidate(); }}
          disabled={!canValidate}
        >
          <span className="button-with-icon">
            <AppIcon icon={Search} size={16} />
            <span>{isChecking ? "Validando..." : "Validar DNI"}</span>
          </span>
        </button>
      </div>
      <div
        className={`form-inline-status form-inline-status-${validationStatus}`}
        aria-live="polite"
      >
        {validationMessage}
      </div>
    </div>

    <div className="form-inline-preview docente-form-preview-card" aria-live="polite">
      <strong>Nombre a registrar</strong>
      <span>
        {nombreCompletoPreview || "Complete nombres y apellidos para ver la vista previa."}
      </span>
    </div>
  </>
);
