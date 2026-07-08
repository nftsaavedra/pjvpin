import React from "react";
import { BadgeCheck } from "lucide-react";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { AppIcon } from "@/shared/ui/AppIcon";
import { formatRenacytNivel } from "@/shared/utils/renacyt";

const formatDate = (value?: number | null) => {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
};

const countFormacionesAcademicas = (value?: string | null) => {
  if (!value) return 0;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

interface RenacytData {
  codigo_registro: string;
  nivel?: string | null;
  condicion?: string | null;
  orcid?: string | null;
  scopus_author_id?: string | null;
  fecha_informe_calificacion?: number | null;
  fecha_ultima_revision?: number | null;
  formaciones_academicas_json?: string | null;
}

interface RenacytValidationSectionProps {
  renacytQuery: string;
  onRenacytChange: (value: string) => void;
  onValidate: () => void;
  isChecking: boolean;
  canValidate: boolean;
  validationStatus: string | null;
  validationMessage: string;
  isLoading: boolean;
  dniFueValidado: boolean;
  renacytData: RenacytData | null;
  isAutoChecking: boolean;
  isAutoNotFound: boolean;
  renacytSource: "auto" | "manual" | null;
}

export const RenacytValidationSection: React.FC<RenacytValidationSectionProps> = ({
  renacytQuery,
  onRenacytChange,
  onValidate,
  isChecking,
  canValidate,
  validationStatus,
  validationMessage,
  isLoading,
  dniFueValidado,
  renacytData,
  isAutoChecking,
  isAutoNotFound,
  renacytSource,
}) => (
  <div className="form-group docente-form-span-2 docente-renacyt-card">
    <div className="form-label-row">
      <label htmlFor="docente-renacyt" className="form-label-text">
        Validación RENACYT
      </label>
      <FieldHelpTooltip
        label="Ayuda para RENACYT"
        content="RENACYT se consulta automáticamente al validar el DNI. Si el investigador no aparece, puede ingresar manualmente el código de registro o el ID para sobrescribir el resultado automático."
      />
    </div>
    {isAutoChecking && (
      <div className="form-inline-status form-inline-status-checking" aria-live="polite">
        <span className="button-with-icon">
          <AppIcon icon={BadgeCheck} size={14} />
          <span>{validationMessage}</span>
        </span>
      </div>
    )}
    {!isAutoChecking && (
      <>
        <div className="form-input-action-group docente-dni-input-row">
          <input
            id="docente-renacyt"
            type="text"
            value={renacytQuery}
            onChange={(event) => {
              onRenacytChange(event.target.value);
            }}
            placeholder="Ej: P0013866 o 13866 (opcional)"
            className="form-input"
            autoComplete="off"
            disabled={isLoading || isChecking || !dniFueValidado}
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
              <AppIcon icon={BadgeCheck} size={16} />
              <span>{isChecking ? "Validando..." : "Buscar manualmente"}</span>
            </span>
          </button>
        </div>
        <div
          className={`form-inline-status form-inline-status-${validationStatus}`}
          aria-live="polite"
        >
          {validationMessage}
        </div>
      </>
    )}

    {renacytData && validationStatus === "validated" && renacytSource === "auto" && (
      <div className="renacyt-summary-card" aria-live="polite">
        <div className="renacyt-summary-header">
          <strong>RENACYT (identificación automática)</strong>
          <span className="badge badge-info">{renacytData.codigo_registro}</span>
        </div>
        <div className="renacyt-summary-grid">
          <span>
            <strong>Nivel:</strong> {formatRenacytNivel(renacytData.nivel) ?? "No disponible"}
          </span>
          <span>
            <strong>Condición:</strong> {renacytData.condicion ?? "No disponible"}
          </span>
          <span>
            <strong>ORCID:</strong> {renacytData.orcid ?? "No disponible"}
          </span>
          <span>
            <strong>Scopus:</strong> {renacytData.scopus_author_id ?? "No disponible"}
          </span>
          <span>
            <strong>Informe:</strong> {formatDate(renacytData.fecha_informe_calificacion)}
          </span>
          <span>
            <strong>Última revisión:</strong> {formatDate(renacytData.fecha_ultima_revision)}
          </span>
          <span>
            <strong>Formaciones:</strong>{" "}
            {countFormacionesAcademicas(renacytData.formaciones_academicas_json)}
          </span>
        </div>
      </div>
    )}

    {renacytData && validationStatus === "validated" && renacytSource === "manual" && (
      <div className="renacyt-summary-card" aria-live="polite">
        <div className="renacyt-summary-header">
          <strong>RENACYT (validación manual)</strong>
          <span className="badge badge-info">{renacytData.codigo_registro}</span>
        </div>
        <div className="renacyt-summary-grid">
          <span>
            <strong>Nivel:</strong> {formatRenacytNivel(renacytData.nivel) ?? "No disponible"}
          </span>
          <span>
            <strong>Condición:</strong> {renacytData.condicion ?? "No disponible"}
          </span>
          <span>
            <strong>ORCID:</strong> {renacytData.orcid ?? "No disponible"}
          </span>
          <span>
            <strong>Scopus:</strong> {renacytData.scopus_author_id ?? "No disponible"}
          </span>
          <span>
            <strong>Informe:</strong> {formatDate(renacytData.fecha_informe_calificacion)}
          </span>
          <span>
            <strong>Última revisión:</strong> {formatDate(renacytData.fecha_ultima_revision)}
          </span>
          <span>
            <strong>Formaciones:</strong>{" "}
            {countFormacionesAcademicas(renacytData.formaciones_academicas_json)}
          </span>
        </div>
      </div>
    )}

    {isAutoNotFound && dniFueValidado && (
      <div className="form-inline-status form-inline-status-auto-not-found" aria-live="polite">
        <em>
          El DNI no figura en RENACYT. Puede registrar al investigador sin código o ingresarlo
          manualmente arriba.
        </em>
      </div>
    )}
  </div>
);
