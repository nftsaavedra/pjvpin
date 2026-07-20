import React from "react";
import { BadgeCheck } from "lucide-react";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { formatDate, parseFormacionesAcademicas } from "@/shared/utils/investigadorUtils";
import { inputClassName } from "@/shared/forms/inputClassName";
import { messages } from "@/shared/feedback/messages";

interface RenacytData {
  codigoRegistro: string;
  nivel?: string | null;
  condicion?: string | null;
  orcid?: string | null;
  scopusAuthorId?: string | null;
  fechaInformeCalificacion?: number | null;
  fechaUltimaRevision?: number | null;
  formacionesAcademicasJson?: string | null;
}

interface RenacytSummaryCardProps {
  data: RenacytData;
  sourceLabel: string;
}

const RenacytSummaryCard: React.FC<RenacytSummaryCardProps> = ({ data, sourceLabel }) => (
  <div className="renacyt-summary-card" aria-live="polite">
    <div className="renacyt-summary-header">
      <strong>{sourceLabel}</strong>
      <Badge variant="info">{data.codigoRegistro}</Badge>
    </div>
    <div className="renacyt-summary-grid">
      <span>
        <strong>Nivel:</strong> {formatRenacytNivel(data.nivel) ?? messages.ui.noDisponible}
      </span>
      <span>
        <strong>Condición:</strong> {data.condicion ?? messages.ui.noDisponible}
      </span>
      <span>
        <strong>ORCID:</strong> {data.orcid ?? messages.ui.noDisponible}
      </span>
      <span>
        <strong>Scopus:</strong> {data.scopusAuthorId ?? messages.ui.noDisponible}
      </span>
      <span>
        <strong>Informe:</strong> {formatDate(data.fechaInformeCalificacion)}
      </span>
      <span>
        <strong>Última revisión:</strong> {formatDate(data.fechaUltimaRevision)}
      </span>
      <span>
        <strong>Formaciones:</strong>{" "}
        {parseFormacionesAcademicas(data.formacionesAcademicasJson).length}
      </span>
    </div>
  </div>
);

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
  <div className="form-group investigador-form-span-2 investigador-renacyt-card">
    <div className="form-label-row">
      <label htmlFor="investigador-renacyt" className="form-label-text">
        {messages.investigadores.renacyt.label}
      </label>
      <FieldHelpTooltip label="Ayuda para RENACYT" content={messages.investigadores.renacyt.help} />
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
        <div className="form-input-action-group investigador-dni-input-row">
          <input
            id="investigador-renacyt"
            type="text"
            value={renacytQuery}
            onChange={(event) => {
              onRenacytChange(event.target.value);
            }}
            placeholder={messages.investigadores.renacyt.inputPlaceholder}
            className={inputClassName}
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
              <span>
                {isChecking
                  ? messages.investigadores.renacyt.buttonBusy
                  : messages.investigadores.renacyt.buttonIdle}
              </span>
            </span>
          </button>
        </div>
        <div
          className={`form-inline-status form-inline-status-${validationStatus}`}
          aria-live="polite"
          role="status"
        >
          {validationMessage}
        </div>
      </>
    )}

    {renacytData && validationStatus === "validated" && renacytSource === "auto" && (
      <RenacytSummaryCard
        data={renacytData}
        sourceLabel={messages.investigadores.renacyt.autoHeader}
      />
    )}

    {renacytData && validationStatus === "validated" && renacytSource === "manual" && (
      <RenacytSummaryCard
        data={renacytData}
        sourceLabel={messages.investigadores.renacyt.manualHeader}
      />
    )}

    {isAutoNotFound && dniFueValidado && (
      <div
        className="form-inline-status form-inline-status-auto-not-found"
        aria-live="polite"
        role="status"
      >
        <em>{messages.investigadores.renacyt.autoNotFound}</em>
      </div>
    )}
  </div>
);
