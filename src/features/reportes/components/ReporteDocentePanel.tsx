import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import SingleDocenteReport from "./SingleDocenteReport";
import { useReporteInvestigador } from "../hooks/useReporteInvestigador";
import { useExport } from "../hooks/useExport";
import type { Investigador } from "@/services/tauri/types";

interface ReporteDocentePanelProps {
  docentes: Investigador[];
  docentesLoading: boolean;
}

export const ReporteDocentePanel: React.FC<ReporteDocentePanelProps> = ({
  docentes,
  docentesLoading,
}) => {
  const {
    investigadorReport,
    investigadorReports,
    generating,
    expandedSections,
    toggleSection,
    generate,
  } = useReporteInvestigador();

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

      {(investigadorReport || investigadorReports.length > 0) && (
        <div className="table-container" style={{ marginTop: "1rem" }}>
          {investigadorReport ? (
            <SingleDocenteReport
              report={investigadorReport}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              exportingIntegral={exportingIntegral}
              onExportXLSX={() => void exportInvestigadorXLSX()}
              onExportPDF={() => void exportInvestigadorPDF()}
            />
          ) : (
            <>
              <div className="section-header">
                <h2>Resultados ({investigadorReports.length} investigadores)</h2>
                <div className="section-header-actions flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => void exportInvestigadorXLSX()}
                    disabled={exportingIntegral !== null}
                  >
                    <span className="button-with-icon">
                      <AppIcon icon={Download} size={16} />
                      <span>
                        {exportingIntegral === "investigador-xlsx" ? "Exportando..." : "Excel"}
                      </span>
                    </span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => void exportInvestigadorPDF()}
                    disabled={exportingIntegral !== null}
                  >
                    <span className="button-with-icon">
                      <AppIcon icon={Download} size={16} />
                      <span>
                        {exportingIntegral === "investigador-pdf" ? "Exportando..." : "PDF"}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
              {investigadorReports.map((rep, idx) => (
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
