import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import SingleDocenteReport from "./SingleDocenteReport";
import { useReporteDocente } from "../hooks/useReporteDocente";
import { useExport } from "../hooks/useExport";
import type { Docente } from "@/services/tauri/types";

interface ReporteDocentePanelProps {
  docentes: Docente[];
  docentesLoading: boolean;
}

export const ReporteDocentePanel: React.FC<ReporteDocentePanelProps> = ({
  docentes,
  docentesLoading,
}) => {
  const { docenteReport, docenteReports, generating, expandedSections, toggleSection, generate } =
    useReporteDocente();

  const { exportDocenteXLSX, exportDocentePDF, exportingIntegral } = useExport({
    proyectoReport: null,
    docenteReport,
    docenteReports,
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
              disabled={docentesLoading}
              aria-label="Seleccionar investigador para reporte integral"
            >
              <option value="">{docentesLoading ? "Cargando..." : "-- Seleccionar --"}</option>
              <option value="__todos__">— Todos los investigadores —</option>
              {docentes.map((d) => (
                <option key={d.id_docente} value={d.id_docente}>
                  {d.nombres_apellidos}
                </option>
              ))}
            </select>
          </div>
          {generating && <p>Generando reporte...</p>}
        </div>
      </div>

      {(docenteReport || docenteReports.length > 0) && (
        <div className="table-container" style={{ marginTop: "1rem" }}>
          {docenteReport ? (
            <SingleDocenteReport
              report={docenteReport}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              exportingIntegral={exportingIntegral}
              onExportXLSX={() => void exportDocenteXLSX()}
              onExportPDF={() => void exportDocentePDF()}
            />
          ) : (
            <>
              <div className="section-header">
                <h2>Resultados ({docenteReports.length} investigadores)</h2>
                <div className="section-header-actions flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => void exportDocenteXLSX()}
                    disabled={exportingIntegral !== null}
                  >
                    <span className="button-with-icon">
                      <AppIcon icon={Download} size={16} />
                      <span>
                        {exportingIntegral === "docente-xlsx" ? "Exportando..." : "Excel"}
                      </span>
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => void exportDocentePDF()}
                    disabled={exportingIntegral !== null}
                  >
                    <span className="button-with-icon">
                      <AppIcon icon={Download} size={16} />
                      <span>{exportingIntegral === "docente-pdf" ? "Exportando..." : "PDF"}</span>
                    </span>
                  </button>
                </div>
              </div>
              {docenteReports.map((rep, idx) => (
                <SingleDocenteReport
                  key={rep.perfil.id_docente}
                  report={rep}
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                  sectionKeyPrefix={`${idx}-`}
                  hideExportButtons
                />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
};
