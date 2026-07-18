import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { DataTable, type ColumnDef } from "@/shared/ui/DataTable";
import { SectionHeader, InfoRow } from "./PdfComponents";
import { formatBool, formatTimestamp, formatArray } from "./pdfFormatters";
import { useReporteProyecto } from "../hooks/useReporteProyecto";
import { useExport } from "../hooks/useExport";
import { messages } from "@/shared/feedback/messages";
import { inputClassName } from "@/shared/forms/inputClassName";
import type { ReporteProyectoIntegral } from "../api";
import type {
  MiembroProyectoReporte,
  PatenteConEtiquetas,
  ProductoConEtiquetas,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
} from "@/shared/tauri/types";

interface ReporteProyectoPanelProps {
  proyectos: Array<{ id_proyecto: string; titulo_proyecto: string }>;
  proyectosLoading: boolean;
}

const equipoColumns: ColumnDef<MiembroProyectoReporte>[] = [
  {
    key: "investigador",
    label: messages.reportes.proyectoColumns.equipo.investigador,
    render: (m) => m.nombres_apellidos,
  },
  { key: "dni", label: messages.reportes.proyectoColumns.equipo.dni, render: (m) => m.dni },
  {
    key: "grado",
    label: messages.reportes.proyectoColumns.equipo.grado,
    render: (m) => m.grado_nombre,
  },
  {
    key: "renacyt",
    label: messages.reportes.proyectoColumns.equipo.renacytReg,
    render: (m) => m.renacyt_codigo_registro ?? "-",
  },
  {
    key: "nivel",
    label: messages.reportes.proyectoColumns.equipo.nivel,
    render: (m) => m.renacyt_nivel ?? "-",
  },
  {
    key: "grupo",
    label: messages.reportes.proyectoColumns.equipo.grupo,
    render: (m) => m.grupo_nombre ?? "-",
  },
  {
    key: "resp",
    label: messages.reportes.proyectoColumns.equipo.responsable,
    render: (m) => formatBool(m.es_responsable),
  },
  {
    key: "pubs",
    label: messages.reportes.proyectoColumns.equipo.publicaciones,
    render: (m) => m.publicaciones_count,
  },
];

const patenteColumns: ColumnDef<PatenteConEtiquetas>[] = [
  {
    key: "titulo",
    label: messages.reportes.proyectoColumns.patente.titulo,
    render: (p) => p.titulo,
  },
  {
    key: "numero",
    label: messages.reportes.proyectoColumns.patente.numeroPatente,
    render: (p) => p.numero_patente ?? "-",
  },
  {
    key: "tipo",
    label: messages.reportes.proyectoColumns.patente.tipo,
    render: (p) => p.tipo_nombre ?? "-",
  },
  {
    key: "estado",
    label: messages.reportes.proyectoColumns.patente.estado,
    render: (p) => p.estado_nombre ?? "-",
  },
  {
    key: "pais",
    label: messages.reportes.proyectoColumns.patente.pais,
    render: (p) => p.pais ?? "-",
  },
  {
    key: "entidad",
    label: messages.reportes.proyectoColumns.patente.entidad,
    render: (p) => p.entidad_concedente ?? "-",
  },
  {
    key: "solicitud",
    label: messages.reportes.proyectoColumns.patente.fechaSolicitud,
    render: (p) => formatTimestamp(p.fecha_solicitud),
  },
  {
    key: "concesion",
    label: messages.reportes.proyectoColumns.patente.fechaConcesion,
    render: (p) => formatTimestamp(p.fecha_concesion),
  },
];

const productoColumns: ColumnDef<ProductoConEtiquetas>[] = [
  {
    key: "nombre",
    label: messages.reportes.proyectoColumns.producto.nombre,
    render: (p) => p.nombre,
  },
  {
    key: "tipo",
    label: messages.reportes.proyectoColumns.producto.tipo,
    render: (p) => p.tipo_nombre ?? "-",
  },
  {
    key: "etapa",
    label: messages.reportes.proyectoColumns.producto.etapa,
    render: (p) => p.etapa_nombre ?? "-",
  },
  {
    key: "desc",
    label: messages.reportes.proyectoColumns.producto.descripcion,
    render: (p) => p.descripcion ?? "-",
  },
  {
    key: "fecha",
    label: messages.reportes.proyectoColumns.producto.fechaRegistro,
    render: (p) => formatTimestamp(p.fecha_registro),
  },
];

const equipColumns: ColumnDef<EquipamientoConEtiquetas>[] = [
  {
    key: "nombre",
    label: messages.reportes.proyectoColumns.equipamiento.nombre,
    render: (e) => e.nombre,
  },
  {
    key: "valor",
    label: messages.reportes.proyectoColumns.equipamiento.valorEstimado,
    render: (e) => (e.valor_estimado != null ? e.valor_estimado.toLocaleString("es-PE") : "-"),
  },
  {
    key: "moneda",
    label: messages.reportes.proyectoColumns.equipamiento.moneda,
    render: (e) => e.moneda_nombre ?? "-",
  },
  {
    key: "proveedor",
    label: messages.reportes.proyectoColumns.equipamiento.proveedor,
    render: (e) => e.proveedor ?? "-",
  },
  {
    key: "fecha",
    label: messages.reportes.proyectoColumns.equipamiento.fechaAdquisicion,
    render: (e) => formatTimestamp(e.fecha_adquisicion),
  },
];

const financColumns: ColumnDef<FinanciamientoConEtiquetas>[] = [
  {
    key: "entidad",
    label: messages.reportes.proyectoColumns.financiamiento.entidad,
    render: (f) => f.entidad_financiadora,
  },
  {
    key: "tipo",
    label: messages.reportes.proyectoColumns.financiamiento.tipo,
    render: (f) => f.tipo_nombre ?? "-",
  },
  {
    key: "monto",
    label: messages.reportes.proyectoColumns.financiamiento.monto,
    render: (f) => (f.monto != null ? f.monto.toLocaleString("es-PE") : "-"),
  },
  {
    key: "moneda",
    label: messages.reportes.proyectoColumns.financiamiento.moneda,
    render: (f) => f.moneda_nombre ?? "-",
  },
  {
    key: "estado",
    label: messages.reportes.proyectoColumns.financiamiento.estado,
    render: (f) => f.estado_financiero_nombre ?? "-",
  },
  {
    key: "inicio",
    label: messages.reportes.proyectoColumns.financiamiento.fechaInicio,
    render: (f) => formatTimestamp(f.fecha_inicio),
  },
  {
    key: "fin",
    label: messages.reportes.proyectoColumns.financiamiento.fechaFin,
    render: (f) => formatTimestamp(f.fecha_fin),
  },
];

export const ReporteProyectoPanel: React.FC<ReporteProyectoPanelProps> = ({
  proyectos,
  proyectosLoading,
}) => {
  const { proyectoReport, generating, expandedSections, toggleSection, generate } =
    useReporteProyecto();

  const { exportProyectoXLSX, exportProyectoPDF, exportingIntegral } = useExport({
    proyectoReport,
    investigadorReport: null,
    investigadorReports: [],
  });

  return (
    <>
      <div className="form-card mt-8">
        <h2>{messages.reportes.proyectoReporteTitle}</h2>
        <div className="form gap-4">
          <div className="form-group">
            <label>{messages.reportes.seleccionarProyectoLabel}</label>
            <select
              className={inputClassName}
              onChange={(e) => void generate(e.target.value)}
              disabled={proyectosLoading}
              aria-label={messages.reportes.seleccionarProyectoAriaLabel}
            >
              <option value="">
                {proyectosLoading
                  ? messages.reportes.cargandoSelect
                  : messages.reportes.seleccionarPlaceholder}
              </option>
              {proyectos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.titulo_proyecto}
                </option>
              ))}
            </select>
          </div>
          {generating && <p>{messages.reportes.generando}</p>}
        </div>
      </div>

      {proyectoReport && (
        <ProyectoReportView
          report={proyectoReport}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          exportingIntegral={exportingIntegral}
          onExportXLSX={() => void exportProyectoXLSX()}
          onExportPDF={() => void exportProyectoPDF()}
        />
      )}
    </>
  );
};

interface ProyectoReportViewProps {
  report: ReporteProyectoIntegral;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  exportingIntegral: string | null;
  onExportXLSX: () => void;
  onExportPDF: () => void;
}

const ProyectoReportView: React.FC<ProyectoReportViewProps> = ({
  report,
  expandedSections,
  toggleSection,
  exportingIntegral,
  onExportXLSX,
  onExportPDF,
}) => (
  <div className="table-container mt-4">
    <div className="section-header">
      <h2>
        {messages.reportes.resultPrefix} {report.cabecera.titulo_proyecto}
      </h2>
      <div className="section-header-actions flex gap-2">
        <button
          className="btn-primary"
          onClick={onExportXLSX}
          disabled={exportingIntegral !== null}
        >
          <span className="button-with-icon">
            <AppIcon icon={Download} size={16} />
            <span>
              {exportingIntegral === "proyecto-xlsx"
                ? messages.reportes.exportando
                : messages.reportes.exportButtons.excel}
            </span>
          </span>
        </button>
        <button
          className="btn-secondary"
          onClick={onExportPDF}
          disabled={exportingIntegral !== null}
        >
          <span className="button-with-icon">
            <AppIcon icon={Download} size={16} />
            <span>
              {exportingIntegral === "proyecto-pdf"
                ? messages.reportes.exportando
                : messages.reportes.exportButtons.pdf}
            </span>
          </span>
        </button>
      </div>
    </div>

    <details open={expandedSections["proy-cabecera"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.cabecera}
        open={expandedSections["proy-cabecera"] ?? false}
        onToggle={() => {
          toggleSection("proy-cabecera");
        }}
      />
      <div className="p-3">
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.idProyecto}
          value={report.cabecera.id_proyecto}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.titulo}
          value={report.cabecera.titulo_proyecto}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.activo}
          value={formatBool(report.cabecera.activo)}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.campoOcde}
          value={report.cabecera.campo_ocde ?? "-"}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.programas}
          value={formatArray(report.cabecera.programas_relacionados)}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.creado}
          value={report.cabecera.fecha_creacion ?? "-"}
        />
        <InfoRow
          label={messages.reportes.proyectoInfoRowLabels.actualizado}
          value={report.cabecera.fecha_actualizacion ?? "-"}
        />
      </div>
    </details>

    <details open={expandedSections["proy-equipo"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.equipo}
        count={report.total_investigadores}
        open={expandedSections["proy-equipo"] ?? false}
        onToggle={() => {
          toggleSection("proy-equipo");
        }}
      />
      <DataTable
        columns={equipoColumns}
        data={report.equipo}
        getRowKey={(m) => m.id_investigador}
        emptyMessage={messages.reportes.proyectoEmptyMessages.miembros}
      />
    </details>

    <details open={expandedSections["proy-patentes"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.patentes}
        count={report.total_patentes}
        open={expandedSections["proy-patentes"] ?? false}
        onToggle={() => {
          toggleSection("proy-patentes");
        }}
      />
      <DataTable
        columns={patenteColumns}
        data={report.patentes}
        getRowKey={(p) => p.id_patente}
        emptyMessage={messages.reportes.proyectoEmptyMessages.patentes}
      />
    </details>

    <details open={expandedSections["proy-productos"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.productos}
        count={report.total_productos}
        open={expandedSections["proy-productos"] ?? false}
        onToggle={() => {
          toggleSection("proy-productos");
        }}
      />
      <DataTable
        columns={productoColumns}
        data={report.productos}
        getRowKey={(p) => p.id_producto}
        emptyMessage={messages.reportes.proyectoEmptyMessages.productos}
      />
    </details>

    <details open={expandedSections["proy-equipamientos"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.equipamientos}
        count={report.total_equipamientos}
        open={expandedSections["proy-equipamientos"] ?? false}
        onToggle={() => {
          toggleSection("proy-equipamientos");
        }}
      />
      <DataTable
        columns={equipColumns}
        data={report.equipamientos}
        getRowKey={(e) => e.id_equipamiento}
        emptyMessage={messages.reportes.proyectoEmptyMessages.equipamientos}
      />
    </details>

    <details open={expandedSections["proy-financiamiento"]}>
      <SectionHeader
        label={messages.reportes.proyectoSections.financiamiento}
        count={report.total_financiamientos}
        open={expandedSections["proy-financiamiento"] ?? false}
        onToggle={() => {
          toggleSection("proy-financiamiento");
        }}
      />
      <DataTable
        columns={financColumns}
        data={report.financiamientos}
        getRowKey={(f) => f.id_financiamiento}
        emptyMessage={messages.reportes.proyectoEmptyMessages.financiamientos}
      />
      <div
        className="p-3 rounded-md mt-2"
        style={{ backgroundColor: "var(--color-surface-alt, #f4f8fb)" }}
      >
        <strong>{messages.reportes.proyectoSections.resumenFinanciero}</strong>
        <div className="mt-2">
          <p>
            {messages.reportes.resumenFinanciero.totalFinanciamientos}{" "}
            <Badge variant="info">{report.resumen_financiero.total_financiamientos}</Badge>
          </p>
          <p className="mt-2">{messages.reportes.resumenFinanciero.porMoneda}</p>
          {report.resumen_financiero.desglose_por_moneda.length > 0 ? (
            <table className="table mt-1">
              <thead>
                <tr>
                  <th>{messages.reportes.resumenFinanciero.thMoneda}</th>
                  <th>{messages.reportes.resumenFinanciero.thCantidad}</th>
                  <th>{messages.reportes.resumenFinanciero.thMontoTotal}</th>
                </tr>
              </thead>
              <tbody>
                {report.resumen_financiero.desglose_por_moneda.map((d, i) => (
                  <tr key={i}>
                    <td>{d.moneda_nombre}</td>
                    <td>{d.cantidad}</td>
                    <td>{d.monto_total.toLocaleString("es-PE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>-</p>
          )}
          <p className="mt-2">{messages.reportes.resumenFinanciero.porEstado}</p>
          {report.resumen_financiero.desglose_por_estado.length > 0 ? (
            <table className="table mt-1">
              <thead>
                <tr>
                  <th>{messages.reportes.resumenFinanciero.thEstado}</th>
                  <th>{messages.reportes.resumenFinanciero.thCantidad}</th>
                </tr>
              </thead>
              <tbody>
                {report.resumen_financiero.desglose_por_estado.map((d, i) => (
                  <tr key={i}>
                    <td>{d.estado_nombre}</td>
                    <td>{d.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>-</p>
          )}
        </div>
      </div>
    </details>
  </div>
);
