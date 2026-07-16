import React, { useState } from "react";
import { Download } from "lucide-react";
import type { DatosExportInvestigadorAgrupado } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { DataTable, type ColumnDef } from "@/shared/ui/DataTable";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";
import { normalizeText } from "@/shared/utils/text";

const normalizeSearch = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

type TipoReporte = "agrupado_investigador" | "plano";

interface ExportPreviewPanelProps {
  preview: DatosExportInvestigadorAgrupado[];
  loading: boolean;
  error: string | null;
  canExport: boolean;
  exportingFormat: "xlsx" | "pdf" | null;
  onExport: (format: "xlsx" | "pdf") => void;
  onRetry: () => void;
}

const columns: ColumnDef<DatosExportInvestigadorAgrupado>[] = [
  { key: "investigador", label: "Investigador", render: (r) => r.investigador },
  { key: "dni", label: "DNI", render: (r) => r.dni },
  { key: "grado", label: "Grado", render: (r) => r.grado },
  {
    key: "renacyt",
    label: "Nivel RENACYT",
    render: (r) => formatRenacytNivel(r.renacyt_nivel) ?? "No disponible",
  },
  { key: "cantidad", label: "Cantidad Proyectos", render: (r) => r.cantidad_proyectos },
  { key: "proyectos", label: "Proyectos", render: (r) => r.proyectos || "-" },
];

export const ExportPreviewPanel: React.FC<ExportPreviewPanelProps> = ({
  preview,
  loading,
  error,
  canExport,
  exportingFormat,
  onExport,
  onRetry,
}) => {
  const [tipo, setTipo] = useState<TipoReporte>("agrupado_investigador");
  const [query, setQuery] = useState("");

  const normalizedQuery = normalizeSearch(query);
  const filtrados = preview.filter(
    (d) =>
      normalizeText(d.investigador).includes(normalizedQuery) ||
      normalizeText(d.dni).includes(normalizedQuery) ||
      normalizeText(d.grado).includes(normalizedQuery) ||
      normalizeRenacytNivelSearch(d.renacyt_nivel).includes(normalizedQuery),
  );

  return (
    <>
      <div className="module-split-layout reportes-layout">
        <div className="form-card">
          <h2>Centro de Reportes</h2>
          <div className="form gap-4">
            <div className="form-group">
              <label>Tipo de reporte</label>
              <select
                className="form-input"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as TipoReporte);
                }}
                aria-label="Seleccionar tipo de reporte"
              >
                <option value="agrupado_investigador">
                  Investigadores con proyectos (agrupado)
                </option>
                <option value="plano">Detalle plano (proyecto-investigador)</option>
              </select>
            </div>

            {canExport && (
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  onClick={() => {
                    onExport("xlsx");
                  }}
                  disabled={exportingFormat !== null}
                >
                  <span className="button-with-icon">
                    <AppIcon icon={Download} size={18} />
                    <span>
                      {exportingFormat === "xlsx" ? "Exportando Excel..." : "Exportar Excel"}
                    </span>
                  </span>
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onExport("pdf");
                  }}
                  disabled={exportingFormat !== null}
                >
                  <span className="button-with-icon">
                    <AppIcon icon={Download} size={18} />
                    <span>{exportingFormat === "pdf" ? "Exportando PDF..." : "Exportar PDF"}</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="module-aside-card reportes-aside">
          <span className="module-aside-kicker">Resumen rápido</span>
          <strong>{tipo === "agrupado_investigador" ? "Agrupado" : "Plano"}</strong>
          <p>Ajuste el formato antes de exportar.</p>
          <div className="module-aside-meta">
            <Badge variant="info">Consulta actual: {query ? "Filtrada" : "Completa"}</Badge>
            <Badge variant={canExport ? "success" : "warning"}>
              {canExport ? "Exportación habilitada" : "Solo vista previa"}
            </Badge>
          </div>
        </aside>
      </div>

      <div className="table-container">
        <div className="section-header">
          <h2>Vista previa: Investigadores y trazabilidad de proyectos</h2>
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>No se pudo refrescar la vista previa. Se mantienen los datos actuales.</span>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        )}
        {!canExport && (
          <div className="inline-feedback inline-feedback-info">
            <span>
              Modo consulta: puede revisar la vista previa de reportes, pero la exportación a Excel
              está deshabilitada para su rol.
            </span>
          </div>
        )}
        <div className="form-group mb-4">
          <input
            className="form-input"
            placeholder="Buscar por investigador, DNI, grado o nivel RENACYT"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            aria-label="Buscar en la vista previa por investigador, DNI, grado o nivel RENACYT"
          />
        </div>

        {loading ? (
          <div className="empty-state">Cargando...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filtrados}
            getRowKey={(row, idx) => `${row.dni}-${idx}`}
            ariaLabel="Tabla de vista previa de reportes"
          />
        )}
      </div>
    </>
  );
};
