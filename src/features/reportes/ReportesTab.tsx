import React, { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  getDataExportacionAgrupada,
  getReporteDocenteIntegral,
  getReporteProyectoIntegral,
  getReportesDocentesIntegral,
  getTauriErrorMessage,
  type DatosExportDocenteAgrupado,
  type ReporteDocenteIntegral,
  type ReporteProyectoIntegral,
} from "./api";
import { getAllProyectosDetalle } from "@/services/tauri/proyectos";
import { getAllDocentes } from "@/services/tauri/docentes";
import type { Docente, ProyectoDetalle } from "@/services/tauri/types";
import { toast } from "@/services/toast";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { AppIcon } from "@/shared/ui/AppIcon";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { saveDesktopFile } from "@/shared/utils/saveDesktopFile";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";
import {
  formatTimestamp,
  formatBool,
  formatArray,
  SectionHeader,
  InfoRow,
} from "./components/PdfComponents";
import SingleDocenteReport from "./components/SingleDocenteReport";
import { useExport } from "./hooks/useExport";

type TipoReporte = "agrupado_docente" | "plano";

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

interface ReportesTabProps {
  canExport?: boolean;
  refreshTrigger?: number;
}

export const ReportesTab: React.FC<ReportesTabProps> = ({
  canExport = true,
  refreshTrigger = 0,
}) => {
  const [tipo, setTipo] = useState<TipoReporte>("agrupado_docente");
  const [query, setQuery] = useState("");
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "pdf" | null>(null);

  const {
    data: preview,
    loading,
    refreshing,
    error,
    recargar: cargarPreview,
  } = useStableFetchData<DatosExportDocenteAgrupado[]>(
    () => getDataExportacionAgrupada(),
    refreshTrigger,
    "Error cargando vista previa de reportes",
    [],
  );

  useRefreshToast({
    refreshing,
    message: "Actualizando vista previa de reportes",
    toastKey: "reportes-refresh",
    cooldownMs: 120000,
  });

  // ─── Entity-centric report state ─────────────────────────────────────────

  const [proyectos, setProyectos] = useState<ProyectoDetalle[]>([]);
  const [proyectosLoading, setProyectosLoading] = useState(true);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [docentesLoading, setDocentesLoading] = useState(true);

  const [proyectoId, setProyectoId] = useState("");
  const [docenteId, setDocenteId] = useState("");

  const [proyectoReport, setProyectoReport] = useState<ReporteProyectoIntegral | null>(null);
  const [docenteReport, setDocenteReport] = useState<ReporteDocenteIntegral | null>(null);
  const [docenteReports, setDocenteReports] = useState<ReporteDocenteIntegral[]>([]);
  const [generatingProyecto, setGeneratingProyecto] = useState(false);
  const [generatingDocente, setGeneratingDocente] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const {
    exportProyectoXLSX,
    exportDocenteXLSX,
    exportProyectoPDF,
    exportDocentePDF,
    exportingIntegral,
  } = useExport({ proyectoReport, docenteReport, docenteReports });

  useEffect(() => {
    getAllProyectosDetalle()
      .then(setProyectos)
      .catch(() => {
        toast.error("Error cargando proyectos");
      })
      .finally(() => {
        setProyectosLoading(false);
      });
  }, []);

  useEffect(() => {
    getAllDocentes()
      .then(setDocentes)
      .catch(() => {
        toast.error("Error cargando docentes");
      })
      .finally(() => {
        setDocentesLoading(false);
      });
  }, []);

  // ─── Existing export ──────────────────────────────────────────────────────

  const exportar = async (format: "xlsx" | "pdf") => {
    setExportingFormat(format);

    try {
      const exportPayload =
        format === "xlsx"
          ? await import("./reportExport").then(({ buildExcelReport }) => buildExcelReport(tipo))
          : await import("./reportExportPdf").then(({ buildPdfReport }) => buildPdfReport(tipo));

      const savedFilePath = await saveDesktopFile({
        suggestedName: exportPayload.suggestedName,
        bytes: exportPayload.bytes,
        filters: [
          {
            name: format === "xlsx" ? "Archivo Excel" : "Documento PDF",
            extensions: [format],
          },
        ],
        mimeType:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      if (!savedFilePath) {
        toast.info("Exportación cancelada");
        return;
      }

      toast.success(`Reporte ${format === "xlsx" ? "Excel" : "PDF"} exportado exitosamente`);
    } catch (error) {
      toast.error("Error exportando reporte: " + getTauriErrorMessage(error));
    } finally {
      setExportingFormat(null);
    }
  };

  // ─── Entity-centric report handlers ───────────────────────────────────────

  const handleGenerateProyecto = async () => {
    if (!proyectoId) {
      toast.info("Seleccione un proyecto");
      return;
    }
    setGeneratingProyecto(true);
    setProyectoReport(null);
    try {
      const report = await getReporteProyectoIntegral(proyectoId);
      setProyectoReport(report);
      setExpandedSections({ "proy-cabecera": true });
      toast.success("Reporte de proyecto generado");
    } catch (err) {
      toast.error("Error generando reporte: " + getTauriErrorMessage(err));
    } finally {
      setGeneratingProyecto(false);
    }
  };

  const handleGenerateDocente = async () => {
    if (!docenteId) {
      toast.info("Seleccione un investigador");
      return;
    }
    setGeneratingDocente(true);
    setDocenteReport(null);
    setDocenteReports([]);
    try {
      if (docenteId === "__todos__") {
        const reports = await getReportesDocentesIntegral();
        setDocenteReports(reports);
        setExpandedSections({ "doc-perfil-0": true });
        toast.success(`${reports.length} reportes generados`);
      } else {
        const report = await getReporteDocenteIntegral(docenteId);
        setDocenteReport(report);
        setExpandedSections({ "doc-perfil": true });
        toast.success("Reporte de investigador generado");
      }
    } catch (err) {
      toast.error("Error generando reporte: " + getTauriErrorMessage(err));
    } finally {
      setGeneratingDocente(false);
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────────

  const normalizedQuery = normalizeText(query);
  const filtrados = preview.filter(
    (d) =>
      normalizeText(d.docente).includes(normalizedQuery) ||
      normalizeText(d.dni).includes(normalizedQuery) ||
      normalizeText(d.grado).includes(normalizedQuery) ||
      normalizeRenacytNivelSearch(d.renacyt_nivel).includes(normalizedQuery),
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="tab-panel module-shell reportes-module">
      {/* ── Existing report section ── */}
      <div className="module-split-layout reportes-layout">
        <div className="form-card">
          <h2>Centro de Reportes</h2>
          <div className="form" style={{ gap: "1rem" }}>
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
                <option value="agrupado_docente">Docentes con proyectos (agrupado)</option>
                <option value="plano">Detalle plano (proyecto-docente)</option>
              </select>
            </div>

            {canExport && (
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  onClick={() => void exportar("xlsx")}
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
                  onClick={() => void exportar("pdf")}
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
          <strong>{tipo === "agrupado_docente" ? "Agrupado" : "Plano"}</strong>
          <p>Ajuste el formato antes de exportar.</p>
          <div className="module-aside-meta">
            <span className="badge badge-info">
              Consulta actual: {query ? "Filtrada" : "Completa"}
            </span>
            <span className={`badge ${canExport ? "badge-success" : "badge-warning"}`}>
              {canExport ? "Exportación habilitada" : "Solo vista previa"}
            </span>
          </div>
        </aside>
      </div>

      <div className="table-container">
        <div className="section-header">
          <h2>Vista previa: Docentes y trazabilidad de proyectos</h2>
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>No se pudo refrescar la vista previa. Se mantienen los datos actuales.</span>
            <button type="button" className="btn-secondary" onClick={() => void cargarPreview()}>
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
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <input
            className="form-input"
            placeholder="Buscar por docente, DNI, grado o nivel RENACYT"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            aria-label="Buscar en la vista previa por docente, DNI, grado o nivel RENACYT"
          />
        </div>

        {loading ? (
          <SkeletonTable columns={6} rows={6} />
        ) : filtrados.length === 0 ? (
          <div className="empty-state">No hay datos para mostrar</div>
        ) : (
          <table className="table" aria-label="Tabla de vista previa de reportes">
            <thead>
              <tr>
                <th>Docente</th>
                <th>DNI</th>
                <th>Grado</th>
                <th>Nivel RENACYT</th>
                <th>Cantidad Proyectos</th>
                <th>Proyectos</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((row, idx) => (
                <tr key={`${row.dni}-${idx}`}>
                  <td>{row.docente}</td>
                  <td>{row.dni}</td>
                  <td>{row.grado}</td>
                  <td>{formatRenacytNivel(row.renacyt_nivel) ?? "No disponible"}</td>
                  <td>{row.cantidad_proyectos}</td>
                  <td>{row.proyectos || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Reporte Integral de Proyecto ── */}
      <div className="form-card" style={{ marginTop: "2rem" }}>
        <h2>Reporte Integral de Proyecto</h2>
        <div className="form" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Seleccionar proyecto</label>
            <select
              className="form-input"
              value={proyectoId}
              onChange={(e) => {
                setProyectoId(e.target.value);
              }}
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
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => void handleGenerateProyecto()}
              disabled={!proyectoId || generatingProyecto}
            >
              {generatingProyecto ? "Generando..." : "Generar Reporte"}
            </button>
          </div>
        </div>
      </div>

      {proyectoReport && (
        <div className="table-container" style={{ marginTop: "1rem" }}>
          <div className="section-header">
            <h2>Resultado: {proyectoReport.cabecera.titulo_proyecto}</h2>
            <div className="section-header-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn-primary"
                onClick={() => void exportProyectoXLSX()}
                disabled={exportingIntegral !== null}
              >
                <span className="button-with-icon">
                  <AppIcon icon={Download} size={16} />
                  <span>{exportingIntegral === "proyecto-xlsx" ? "Exportando..." : "Excel"}</span>
                </span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => void exportProyectoPDF()}
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
              onToggle={() => {
                toggleSection("proy-cabecera");
              }}
            />
            <div style={{ padding: "0.75rem" }}>
              <InfoRow label="ID Proyecto" value={proyectoReport.cabecera.id_proyecto} />
              <InfoRow label="Título" value={proyectoReport.cabecera.titulo_proyecto} />
              <InfoRow label="Activo" value={formatBool(proyectoReport.cabecera.activo)} />
              <InfoRow label="Campo OCDE" value={proyectoReport.cabecera.campo_ocde ?? "-"} />
              <InfoRow
                label="Programas"
                value={formatArray(proyectoReport.cabecera.programas_relacionados)}
              />
              <InfoRow label="Creado" value={proyectoReport.cabecera.fecha_creacion ?? "-"} />
              <InfoRow
                label="Actualizado"
                value={proyectoReport.cabecera.fecha_actualizacion ?? "-"}
              />
            </div>
          </details>

          <details open={expandedSections["proy-equipo"]}>
            <SectionHeader
              label="Equipo"
              count={proyectoReport.total_docentes}
              open={expandedSections["proy-equipo"] ?? false}
              onToggle={() => {
                toggleSection("proy-equipo");
              }}
            />
            {proyectoReport.equipo.length === 0 ? (
              <div className="empty-state">Sin miembros registrados</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Docente</th>
                    <th>DNI</th>
                    <th>Grado</th>
                    <th>RENACYT Reg.</th>
                    <th>Nivel</th>
                    <th>Grupo</th>
                    <th>Responsable</th>
                    <th>Publicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectoReport.equipo.map((m) => (
                    <tr key={m.id_docente}>
                      <td>{m.nombres_apellidos}</td>
                      <td>{m.dni}</td>
                      <td>{m.grado_nombre}</td>
                      <td>{m.renacyt_codigo_registro ?? "-"}</td>
                      <td>{m.renacyt_nivel ?? "-"}</td>
                      <td>{m.grupo_nombre ?? "-"}</td>
                      <td>{formatBool(m.es_responsable)}</td>
                      <td>{m.publicaciones_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>

          <details open={expandedSections["proy-patentes"]}>
            <SectionHeader
              label="Patentes"
              count={proyectoReport.total_patentes}
              open={expandedSections["proy-patentes"] ?? false}
              onToggle={() => {
                toggleSection("proy-patentes");
              }}
            />
            {proyectoReport.patentes.length === 0 ? (
              <div className="empty-state">Sin patentes registradas</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>N° Patente</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>País</th>
                    <th>Entidad</th>
                    <th>F. Solicitud</th>
                    <th>F. Concesión</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectoReport.patentes.map((p) => (
                    <tr key={p.id_patente}>
                      <td>{p.titulo}</td>
                      <td>{p.numero_patente ?? "-"}</td>
                      <td>{p.tipo_nombre ?? "-"}</td>
                      <td>{p.estado_nombre ?? "-"}</td>
                      <td>{p.pais ?? "-"}</td>
                      <td>{p.entidad_concedente ?? "-"}</td>
                      <td>{formatTimestamp(p.fecha_solicitud)}</td>
                      <td>{formatTimestamp(p.fecha_concesion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>

          <details open={expandedSections["proy-productos"]}>
            <SectionHeader
              label="Productos"
              count={proyectoReport.total_productos}
              open={expandedSections["proy-productos"] ?? false}
              onToggle={() => {
                toggleSection("proy-productos");
              }}
            />
            {proyectoReport.productos.length === 0 ? (
              <div className="empty-state">Sin productos registrados</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Etapa</th>
                    <th>Descripción</th>
                    <th>F. Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectoReport.productos.map((p) => (
                    <tr key={p.id_producto}>
                      <td>{p.nombre}</td>
                      <td>{p.tipo_nombre ?? "-"}</td>
                      <td>{p.etapa_nombre ?? "-"}</td>
                      <td>{p.descripcion ?? "-"}</td>
                      <td>{formatTimestamp(p.fecha_registro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>

          <details open={expandedSections["proy-equipamientos"]}>
            <SectionHeader
              label="Equipamientos"
              count={proyectoReport.total_equipamientos}
              open={expandedSections["proy-equipamientos"] ?? false}
              onToggle={() => {
                toggleSection("proy-equipamientos");
              }}
            />
            {proyectoReport.equipamientos.length === 0 ? (
              <div className="empty-state">Sin equipamientos registrados</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Valor Estimado</th>
                    <th>Moneda</th>
                    <th>Proveedor</th>
                    <th>F. Adquisición</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectoReport.equipamientos.map((e) => (
                    <tr key={e.id_equipamiento}>
                      <td>{e.nombre}</td>
                      <td>
                        {e.valor_estimado != null ? e.valor_estimado.toLocaleString("es-PE") : "-"}
                      </td>
                      <td>{e.moneda_nombre ?? "-"}</td>
                      <td>{e.proveedor ?? "-"}</td>
                      <td>{formatTimestamp(e.fecha_adquisicion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>

          <details open={expandedSections["proy-financiamiento"]}>
            <SectionHeader
              label="Financiamiento"
              count={proyectoReport.total_financiamientos}
              open={expandedSections["proy-financiamiento"] ?? false}
              onToggle={() => {
                toggleSection("proy-financiamiento");
              }}
            />
            {proyectoReport.financiamientos.length === 0 ? (
              <div className="empty-state">Sin financiamientos registrados</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Entidad</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Moneda</th>
                    <th>Estado</th>
                    <th>F. Inicio</th>
                    <th>F. Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectoReport.financiamientos.map((f) => (
                    <tr key={f.id_financiamiento}>
                      <td>{f.entidad_financiadora}</td>
                      <td>{f.tipo_nombre ?? "-"}</td>
                      <td>{f.monto != null ? f.monto.toLocaleString("es-PE") : "-"}</td>
                      <td>{f.moneda_nombre ?? "-"}</td>
                      <td>{f.estado_financiero_nombre ?? "-"}</td>
                      <td>{formatTimestamp(f.fecha_inicio)}</td>
                      <td>{formatTimestamp(f.fecha_fin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                    {proyectoReport.resumen_financiero.total_financiamientos}
                  </span>
                </p>
                <p style={{ marginTop: "0.5rem" }}>Desglose por moneda:</p>
                {proyectoReport.resumen_financiero.desglose_por_moneda.length > 0 ? (
                  <table className="table" style={{ marginTop: "0.25rem" }}>
                    <thead>
                      <tr>
                        <th>Moneda</th>
                        <th>Cantidad</th>
                        <th>Monto Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectoReport.resumen_financiero.desglose_por_moneda.map((d, i) => (
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
                {proyectoReport.resumen_financiero.desglose_por_estado.length > 0 ? (
                  <table className="table" style={{ marginTop: "0.25rem" }}>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectoReport.resumen_financiero.desglose_por_estado.map((d, i) => (
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
      )}

      {/* ── Reporte Integral de Investigador ── */}
      <div className="form-card" style={{ marginTop: "2rem" }}>
        <h2>Reporte Integral de Investigador</h2>
        <div className="form" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Seleccionar investigador</label>
            <select
              className="form-input"
              value={docenteId}
              onChange={(e) => {
                setDocenteId(e.target.value);
              }}
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
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => void handleGenerateDocente()}
              disabled={!docenteId || generatingDocente}
            >
              {generatingDocente ? "Generando..." : "Generar Reporte"}
            </button>
          </div>
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
                <div className="section-header-actions" style={{ display: "flex", gap: "0.5rem" }}>
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
    </div>
  );
};
