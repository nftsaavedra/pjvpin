import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import SingleInvestigadorReport from "./SingleInvestigadorReport";
import { useReporteInvestigador } from "../hooks/useReporteInvestigador";
import { useExport } from "../hooks/useExport";
import type { Investigador } from "@/services/tauri/types";

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
      <div className="form-card" style={{ marginTop: "2rem" }}>
        <h2>Reporte Integral de Investigador</h2>
        <div className="form" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Seleccionar investigador</label>
            <select
              className="form-input"
              onChange={(e) => void generate(e.target.value)}
              disabled={investigadoresLoading}
              aria-label="Seleccionar investigador para reporte integral"
            >
              <option value="">
                {investigadoresLoading ? "Cargando..." : "-- Seleccionar --"}
              </option>
              <option value="__todos__">— Todos los investigadores —</option>
              {investigadores.map((d) => (
                <option key={d.id_investigador} value={d.id_investigador}>
                  {d.nombres_apellidos}
                </option>
              ))}
            </select>
          </div>

          {(investigadorReport || investigadorReports.length > 0) && (
            <div className="form-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!investigadorReport || Boolean(exportingIntegral)}
                onClick={() => void exportInvestigadorPDF()}
              >
                <AppIcon icon={Download} size={16} /> Exportar PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!investigadorReport || Boolean(exportingIntegral)}
                onClick={() => void exportInvestigadorXLSX()}
              >
                <AppIcon icon={Download} size={16} /> Exportar Excel
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
        <div className="data-card" style={{ marginTop: "1rem" }}>
          <h3>{investigadorReports.length} investigadores listos para exportar</h3>
          <p>Selecciona un investigador específico para ver su detalle.</p>
          <div className="form-actions" style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(exportingIntegral)}
              onClick={() => void exportInvestigadorXLSX()}
            >
              <AppIcon icon={Download} size={16} /> Exportar todos a Excel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
