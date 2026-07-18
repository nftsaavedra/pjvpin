import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import SingleInvestigadorReport from "./SingleInvestigadorReport";
import { useReporteInvestigador } from "../hooks/useReporteInvestigador";
import { useExport } from "../hooks/useExport";
import { messages } from "@/shared/feedback/messages";
import { inputClassName } from "@/shared/forms/inputClassName";
import type { Investigador } from "@/shared/tauri/types";

interface ReporteInvestigadorPanelProps {
  investigadores: Investigador[];
  investigadoresLoading: boolean;
}

export const ReporteInvestigadorPanel: React.FC<ReporteInvestigadorPanelProps> = ({
  investigadores,
  investigadoresLoading,
}) => {
  const { investigadorReport, investigadorReports, expandedSections, toggleSection, generate } =
    useReporteInvestigador();

  const { exportInvestigadorXLSX, exportInvestigadorPDF, exportingIntegral } = useExport({
    proyectoReport: null,
    investigadorReport,
    investigadorReports,
  });

  return (
    <>
      <div className="form-card mt-8">
        <h2>{messages.reportes.investigadorReporteTitle}</h2>
        <div className="form gap-4">
          <div className="form-group">
            <label>{messages.reportes.seleccionarInvestigadorLabel}</label>
            <select
              className={inputClassName}
              onChange={(e) => void generate(e.target.value)}
              disabled={investigadoresLoading}
              aria-label={messages.reportes.seleccionarInvestigadorAriaLabel}
            >
              <option value="">
                {investigadoresLoading
                  ? messages.reportes.cargandoSelect
                  : messages.reportes.seleccionarPlaceholder}
              </option>
              <option value="__todos__">{messages.reportes.todosLosInvestigadores}</option>
              {investigadores.map((d) => (
                <option key={d.id_investigador} value={d.id_investigador}>
                  {d.nombres_apellidos}
                </option>
              ))}
            </select>
          </div>

          {(investigadorReport || investigadorReports.length > 0) && (
            <div className="form-actions flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!investigadorReport || Boolean(exportingIntegral)}
                onClick={() => void exportInvestigadorPDF()}
              >
                <AppIcon icon={Download} size={16} /> {messages.reportes.exportarPdf}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!investigadorReport || Boolean(exportingIntegral)}
                onClick={() => void exportInvestigadorXLSX()}
              >
                <AppIcon icon={Download} size={16} /> {messages.reportes.exportarExcel}
              </button>
            </div>
          )}
        </div>
      </div>

      {investigadorReport && (
        <SingleInvestigadorReport
          report={investigadorReport}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />
      )}

      {investigadorReports.length > 1 && !investigadorReport && (
        <div className="data-card mt-4">
          <h3>{messages.reportes.investigadoresListosParaExportar(investigadorReports.length)}</h3>
          <div className="form-actions flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(exportingIntegral)}
              onClick={() => void exportInvestigadorXLSX()}
            >
              <AppIcon icon={Download} size={16} /> {messages.reportes.exportarTodosExcel}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
