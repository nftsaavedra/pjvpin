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
}) => (
  <div className="form-group">
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
        placeholder="Ej: 45678912"
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
          <span>{isChecking ? "Validando..." : "Validar DNI"}</span>
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
);
