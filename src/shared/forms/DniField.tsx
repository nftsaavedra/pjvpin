import React from "react";
import { Search } from "lucide-react";
import { FieldHelpTooltip } from "./FieldHelpTooltip";
import { AppIcon } from "@/shared/ui/AppIcon";
import { inputClassName } from "./inputClassName";

export type DniValidationStatus = "idle" | "checking" | "duplicate" | "validated" | "error";

interface DniFieldProps {
  dni: string;
  onDniChange: (value: string) => void;
  onValidate: () => void;
  isChecking: boolean;
  canValidate: boolean;
  validationStatus: DniValidationStatus | null;
  validationMessage: string;
  isLoading?: boolean;
  helpText?: string;
  inputId?: string;
  layout?: "span-1" | "span-2";
  containerClassName?: string;
  placeholder?: string;
  buttonIdleLabel?: string;
  buttonBusyLabel?: string;
  showPreview?: boolean;
  nombreCompletoPreview?: string;
  previewLabel?: string;
  previewPlaceholder?: string;
}

export const DniField: React.FC<DniFieldProps> = ({
  dni,
  onDniChange,
  onValidate,
  isChecking,
  canValidate,
  validationStatus,
  validationMessage,
  isLoading = false,
  helpText,
  inputId = "dni",
  layout = "span-1",
  containerClassName,
  placeholder = "Ej: 45678912",
  buttonIdleLabel = "Validar DNI",
  buttonBusyLabel = "Validando...",
  showPreview = false,
  nombreCompletoPreview = "",
  previewLabel = "Nombre a registrar",
  previewPlaceholder = "Complete nombres y apellidos para ver la vista previa.",
}) => {
  const wrapperClass = [
    "form-group",
    layout === "span-2" ? "investigador-form-span-2 investigador-dni-group" : null,
    containerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={wrapperClass}>
        <div className="form-label-row">
          <label htmlFor={inputId} className="form-label-text">
            DNI *
          </label>
          {helpText && <FieldHelpTooltip label="Ayuda para DNI" content={helpText} />}
        </div>
        <div className="form-input-action-group">
          <input
            id={inputId}
            type="text"
            value={dni}
            onChange={(event) => {
              onDniChange(event.target.value);
            }}
            placeholder={placeholder}
            maxLength={8}
            required
            className={inputClassName}
            inputMode="numeric"
            autoComplete="off"
            disabled={isLoading || isChecking}
          />
          <button
            type="button"
            className="btn-secondary form-input-action-button"
            onClick={() => {
              onValidate();
            }}
            disabled={!canValidate}
          >
            <span className="button-with-icon">
              <AppIcon icon={Search} size={16} />
              <span>{isChecking ? buttonBusyLabel : buttonIdleLabel}</span>
            </span>
          </button>
        </div>
        <div
          className={`form-inline-status form-inline-status-${validationStatus ?? "idle"}`}
          aria-live="polite"
        >
          {validationMessage}
        </div>
      </div>
      {showPreview && (
        <div className="form-inline-preview investigador-form-preview-card" aria-live="polite">
          <strong>{previewLabel}</strong>
          <span>{nombreCompletoPreview || previewPlaceholder}</span>
        </div>
      )}
    </>
  );
};
