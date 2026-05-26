import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { DataTable, type ColumnDef } from "@/shared/ui/DataTable";
import { SectionHeader, InfoRow, formatBool, formatTimestamp, formatArray } from "./PdfComponents";
import { useReporteProyecto } from "../hooks/useReporteProyecto";
import { useExport } from "../hooks/useExport";
import type { ReporteProyectoIntegral } from "../api";
import type {
  MiembroProyectoReporte,
  PatenteConEtiquetas,
  ProductoConEtiquetas,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
} from "@/services/tauri/types";

interface ReporteProyectoPanelProps {
  proyectos: Array<{ id_proyecto: string; titulo_proyecto: string }>;
  proyectosLoading: boolean;
}

const equipoColumns: ColumnDef<MiembroProyectoReporte>[] = [
  { key: "docente", label: "Docente", render: (m) => m.nombres_apellidos },
  { key: "dni", label: "DNI", render: (m) => m.dni },
  { key: "grado", label: "Grado", render: (m) => m.grado_nombre },
  { key: "renacyt", label: "RENACYT Reg.", render: (m) => m.renacyt_codigo_registro ?? "-" },
  { key: "nivel", label: "Nivel", render: (m) => m.renacyt_nivel ?? "-" },
  { key: "grupo", label: "Grupo", render: (m) => m.grupo_nombre ?? "-" },
  { key: "resp", label: "Responsable", render: (m) => formatBool(m.es_responsable) },
  { key: "pubs", label: "Publicaciones", render: (m) => m.publicaciones_count },
];

const patenteColumns: ColumnDef<PatenteConEtiquetas>[] = [
  { key: "titulo", label: "Título", render: (p) => p.titulo },
  { key: "numero", label: "N° Patente", render: (p) => p.numero_patente ?? "-" },
  { key: "tipo", label: "Tipo", render: (p) => p.tipo_nombre ?? "-" },
  { key: "estado", label: "Estado", render: (p) => p.estado_nombre ?? "-" },
  { key: "pais", label: "País", render: (p) => p.pais ?? "-" },
  { key: "entidad", label: "Entidad", render: (p) => p.entidad_concedente ?? "-" },
  { key: "solicitud", label: "F. Solicitud", render: (p) => formatTimestamp(p.fecha_solicitud) },
  { key: "concesion", label: "F. Concesión", render: (p) => formatTimestamp(p.fecha_concesion) },
];

const productoColumns: ColumnDef<ProductoConEtiquetas>[] = [
  { key: "nombre", label: "Nombre", render: (p) => p.nombre },
  { key: "tipo", label: "Tipo", render: (p) => p.tipo_nombre ?? "-" },
  { key: "etapa", label: "Etapa", render: (p) => p.etapa_nombre ?? "-" },
  { key: "desc", label: "Descripción", render: (p) => p.descripcion ?? "-" },
  { key: "fecha", label: "F. Registro", render: (p) => formatTimestamp(p.fecha_registro) },
];

const equipColumns: ColumnDef<EquipamientoConEtiquetas>[] = [
  { key: "nombre", label: "Nombre", render: (e) => e.nombre },
  {
    key: "valor",
    label: "Valor Estimado",
    render: (e) => (e.valor_estimado != null ? e.valor_estimado.toLocaleString("es-PE") : "-"),
  },
  { key: "moneda", label: "Moneda", render: (e) => e.moneda_nombre ?? "-" },
  { key: "proveedor", label: "Proveedor", render: (e) => e.proveedor ?? "-" },
  { key: "fecha", label: "F. Adquisición", render: (e) => formatTimestamp(e.fecha_adquisicion) },
];

const financColumns: ColumnDef<FinanciamientoConEtiquetas>[] = [
  { key: "entidad", label: "Entidad", render: (f) => f.entidad_financiadora },
  { key: "tipo", label: "Tipo", render: (f) => f.tipo_nombre ?? "-" },
  {
    key: "monto",
    label: "Monto",
    render: (f) => (f.monto != null ? f.monto.toLocaleString("es-PE") : "-"),
  },
  { key: "moneda", label: "Moneda", render: (f) => f.moneda_nombre ?? "-" },
  { key: "estado", label: "Estado", render: (f) => f.estado_financiero_nombre ?? "-" },
  { key: "inicio", label: "F. Inicio", render: (f) => formatTimestamp(f.fecha_inicio) },
  { key: "fin", label: "F. Fin", render: (f) => formatTimestamp(f.fecha_fin) },
];

export const ReporteProyectoPanel: React.FC<ReporteProyectoPanelProps> = ({
  proyectos,
  proyectosLoading,
}) => {
  const { proyectoReport, generating, expandedSections, toggleSection, generate } =
    useReporteProyecto();

  const { exportProyectoXLSX, exportProyectoPDF, exportingIntegral } = useExport({
    proyectoReport,
    docenteReport: null,
    docenteReports: [],
  });

  return (
    <>
      <div className="form-card" style={{ marginTop: "2rem" }}>
        <h2>Reporte Integral de Proyecto</h2>
        <div className="form" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Seleccionar proyecto</label>
            <select
              className="form-input"
              onChange={(e) => void generate(e.target.value)}
              disabled={proyectosLoading}
              aria-label="Seleccionar proyecto para reporte integral"
            >
              <option value="">{proyectosLoading ? "Cargando..." : "-- Seleccionar --"}</option>
              {proyectos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.titulo_proyecto}
                </option>
              ))}
            </select>
          </div>
          {generating && <p>Generando reporte...</p>}
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
  <div className="table-container" style={{ marginTop: "1rem" }}>
    <div className="section-header">
      <h2>Resultado: {report.cabecera.titulo_proyecto}</h2>
      <div className="section-header-actions flex gap-2">
        <button
          className="btn-primary"
          onClick={onExportXLSX}
          disabled={exportingIntegral !== null}
        >
          <span className="button-with-icon">
            <AppIcon icon={Download} size={16} />
            <span>{exportingIntegral === "proyecto-xlsx" ? "Exportando..." : "Excel"}</span>
          </span>
        </button>
        <button
          className="btn-secondary"
          onClick={onExportPDF}
          disabled={exportingIntegral !== null}
        >
          <span className="button-with-icon">
            <AppIcon icon={Download} size={16} />
            <span>{exportingIntegral === "proyecto-pdf" ? "Exportando..." : "PDF"}</span>
          </span>
        </button>
      </div>
    </div>

    <details open={expandedSections["proy-cabecera"]}>
      <SectionHeader
        label="Cabecera"
        open={expandedSections["proy-cabecera"] ?? false}
        onToggle={() => { toggleSection("proy-cabecera"); }}
      />
      <div style={{ padding: "0.75rem" }}>
        <InfoRow label="ID Proyecto" value={report.cabecera.id_proyecto} />
        <InfoRow label="Título" value={report.cabecera.titulo_proyecto} />
        <InfoRow label="Activo" value={formatBool(report.cabecera.activo)} />
        <InfoRow label="Campo OCDE" value={report.cabecera.campo_ocde ?? "-"} />
        <InfoRow label="Programas" value={formatArray(report.cabecera.programas_relacionados)} />
        <InfoRow label="Creado" value={report.cabecera.fecha_creacion ?? "-"} />
        <InfoRow label="Actualizado" value={report.cabecera.fecha_actualizacion ?? "-"} />
      </div>
    </details>

    <details open={expandedSections["proy-equipo"]}>
      <SectionHeader
        label="Equipo"
        count={report.total_docentes}
        open={expandedSections["proy-equipo"] ?? false}
        onToggle={() => { toggleSection("proy-equipo"); }}
      />
      <DataTable
        columns={equipoColumns}
        data={report.equipo}
        getRowKey={(m) => m.id_docente}
        emptyMessage="Sin miembros registrados"
      />
    </details>

    <details open={expandedSections["proy-patentes"]}>
      <SectionHeader
        label="Patentes"
        count={report.total_patentes}
        open={expandedSections["proy-patentes"] ?? false}
        onToggle={() => { toggleSection("proy-patentes"); }}
      />
      <DataTable
        columns={patenteColumns}
        data={report.patentes}
        getRowKey={(p) => p.id_patente}
        emptyMessage="Sin patentes registradas"
      />
    </details>

    <details open={expandedSections["proy-productos"]}>
      <SectionHeader
        label="Productos"
        count={report.total_productos}
        open={expandedSections["proy-productos"] ?? false}
        onToggle={() => { toggleSection("proy-productos"); }}
      />
      <DataTable
        columns={productoColumns}
        data={report.productos}
        getRowKey={(p) => p.id_producto}
        emptyMessage="Sin productos registrados"
      />
    </details>

    <details open={expandedSections["proy-equipamientos"]}>
      <SectionHeader
        label="Equipamientos"
        count={report.total_equipamientos}
        open={expandedSections["proy-equipamientos"] ?? false}
        onToggle={() => { toggleSection("proy-equipamientos"); }}
      />
      <DataTable
        columns={equipColumns}
        data={report.equipamientos}
        getRowKey={(e) => e.id_equipamiento}
        emptyMessage="Sin equipamientos registrados"
      />
    </details>

    <details open={expandedSections["proy-financiamiento"]}>
      <SectionHeader
        label="Financiamiento"
        count={report.total_financiamientos}
        open={expandedSections["proy-financiamiento"] ?? false}
        onToggle={() => { toggleSection("proy-financiamiento"); }}
      />
      <DataTable
        columns={financColumns}
        data={report.financiamientos}
        getRowKey={(f) => f.id_financiamiento}
        emptyMessage="Sin financiamientos registrados"
      />
      <div
        style={{
          padding: "0.75rem",
          backgroundColor: "var(--color-surface-alt, #f4f8fb)",
          borderRadius: "6px",
          marginTop: "0.5rem",
        }}
      >
        <strong>Resumen Financiero</strong>
        <div style={{ marginTop: "0.5rem" }}>
          <p>
            Total financiamientos:{" "}
            <span className="badge badge-info">
              {report.resumen_financiero.total_financiamientos}
            </span>
          </p>
          <p style={{ marginTop: "0.5rem" }}>Desglose por moneda:</p>
          {report.resumen_financiero.desglose_por_moneda.length > 0 ? (
            <table className="table" style={{ marginTop: "0.25rem" }}>
              <thead>
                <tr>
                  <th>Moneda</th>
                  <th>Cantidad</th>
                  <th>Monto Total</th>
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
          <p style={{ marginTop: "0.5rem" }}>Desglose por estado:</p>
          {report.resumen_financiero.desglose_por_estado.length > 0 ? (
            <table className="table" style={{ marginTop: "0.25rem" }}>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cantidad</th>
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
