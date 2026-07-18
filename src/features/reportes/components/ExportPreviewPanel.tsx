import React, { useState } from "react";
import { Download } from "lucide-react";
import type { DatosExportInvestigadorAgrupado } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { DataTable, type ColumnDef } from "@/shared/ui/DataTable";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";
import { normalizeText } from "@/shared/utils/text";
import { messages } from "@/shared/feedback/messages";

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
  {
    key: "investigador",
    label: messages.reportes.previewColumns.investigador,
    render: (r) => r.investigador,
  },
  { key: "dni", label: messages.reportes.previewColumns.dni, render: (r) => r.dni },
  { key: "grado", label: messages.reportes.previewColumns.grado, render: (r) => r.grado },
  {
    key: "renacyt",
    label: messages.reportes.previewColumns.nivelRenacyt,
    render: (r) => formatRenacytNivel(r.renacyt_nivel) ?? messages.ui.noDisponible,
  },
  {
    key: "cantidad",
    label: messages.reportes.previewColumns.cantidadProyectos,
    render: (r) => r.cantidad_proyectos,
  },
  {
    key: "proyectos",
    label: messages.reportes.previewColumns.proyectos,
    render: (r) => r.proyectos || "-",
  },
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
          <h2>{messages.reportes.centroReportes}</h2>
          <div className="form gap-4">
            <div className="form-group">
              <label>{messages.reportes.tipoReporteLabel}</label>
              <select
                className="form-input"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as TipoReporte);
                }}
                aria-label={messages.reportes.tipoReporteAriaLabel}
              >
                <option value="agrupado_investigador">
                  {messages.reportes.tipoReporteOpciones.agrupado}
                </option>
                <option value="plano">{messages.reportes.tipoReporteOpciones.plano}</option>
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
                      {exportingFormat === "xlsx"
                        ? messages.reportes.exportandoExcel
                        : messages.reportes.exportarExcel}
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
                    <span>
                      {exportingFormat === "pdf"
                        ? messages.reportes.exportandoPdf
                        : messages.reportes.exportarPdf}
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="module-aside-card reportes-aside">
          <span className="module-aside-kicker">{messages.reportes.aside.kicker}</span>
          <strong>
            {tipo === "agrupado_investigador"
              ? messages.reportes.aside.tipoAgrupado
              : messages.reportes.aside.tipoPlano}
          </strong>
          <div className="module-aside-meta">
            <Badge variant="info">
              Consulta actual:{" "}
              {query
                ? messages.reportes.aside.consultaFiltrada
                : messages.reportes.aside.consultaCompleta}
            </Badge>
            <Badge variant={canExport ? "success" : "warning"}>
              {canExport
                ? messages.reportes.aside.exportHabilitada
                : messages.reportes.aside.soloVistaPrevia}
            </Badge>
          </div>
        </aside>
      </div>

      <div className="table-container">
        <div className="section-header">
          <h2>{messages.reportes.vistaPrevia}</h2>
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>{messages.ui.sinDatos}</span>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              {messages.ui.reintentar}
            </button>
          </div>
        )}
        {!canExport && (
          <div className="inline-feedback inline-feedback-info">
            <span>{messages.reportes.exportDisabledInline}</span>
          </div>
        )}
        <div className="form-group mb-4">
          <input
            className="form-input"
            placeholder={messages.reportes.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            aria-label={messages.reportes.searchAriaLabel}
          />
        </div>

        {loading ? (
          <div className="empty-state">{messages.reportes.loadingVacio}</div>
        ) : (
          <DataTable
            columns={columns}
            data={filtrados}
            getRowKey={(row, idx) => `${row.dni}-${idx}`}
            ariaLabel={messages.reportes.vistaPreviaAriaLabel}
          />
        )}
      </div>
    </>
  );
};
