import React from "react";
import { Download } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { SectionHeader, InfoRow, formatBool, formatTimestamp } from "./PdfComponents";
import type { ReporteInvestigadorIntegral } from "../api";

export interface SingleInvestigadorReportProps {
  report: ReporteInvestigadorIntegral;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  sectionKeyPrefix?: string;
  hideExportButtons?: boolean;
  exportingIntegral?: string | null;
  onExportXLSX?: () => void;
  onExportPDF?: () => void;
}

const SingleDocenteReport: React.FC<SingleInvestigadorReportProps> = ({
  report,
  expandedSections,
  toggleSection,
  sectionKeyPrefix = "",
  hideExportButtons = false,
  exportingIntegral,
  onExportXLSX,
  onExportPDF,
}) => {
  const { perfil, proyectos, recursos, publicaciones, trazabilidad } = report;
  const k = (s: string) => sectionKeyPrefix + s;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        border: "1px solid var(--color-border, #d7e3f1)",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <div className="section-header" style={{ marginBottom: "1rem" }}>
        <h3>{perfil.nombres_apellidos}</h3>
        {!hideExportButtons && onExportXLSX && onExportPDF && (
          <div className="section-header-actions" style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-primary"
              onClick={onExportXLSX}
              disabled={exportingIntegral !== null}
            >
              <span className="button-with-icon">
                <AppIcon icon={Download} size={16} />
                <span>{exportingIntegral === "investigador-xlsx" ? "Exportando..." : "Excel"}</span>
              </span>
            </button>
            <button
              className="btn-secondary"
              onClick={onExportPDF}
              disabled={exportingIntegral !== null}
            >
              <span className="button-with-icon">
                <AppIcon icon={Download} size={16} />
                <span>{exportingIntegral === "investigador-pdf" ? "Exportando..." : "PDF"}</span>
              </span>
            </button>
          </div>
        )}
      </div>

      <details open={expandedSections[k("doc-perfil")]}>
        <SectionHeader
          label="Perfil"
          open={expandedSections[k("doc-perfil")] ?? false}
          onToggle={() => {
            toggleSection(k("doc-perfil"));
          }}
        />
        <div style={{ padding: "0.75rem" }}>
          <InfoRow label="DNI" value={perfil.dni} />
          <InfoRow label="Grado Académico" value={perfil.grado_nombre} />
          <InfoRow label="Código RENACYT" value={perfil.renacyt_codigo_registro ?? "-"} />
          <InfoRow label="ID Investigador" value={perfil.renacyt_id_investigador ?? "-"} />
          <InfoRow label="Nivel RENACYT" value={perfil.renacyt_nivel ?? "-"} />
          <InfoRow label="Grupo RENACYT" value={perfil.renacyt_grupo ?? "-"} />
          <InfoRow label="Condición" value={perfil.renacyt_condicion ?? "-"} />
          <InfoRow label="ORCID" value={perfil.renacyt_orcid ?? "-"} />
          <InfoRow label="Scopus Author ID" value={perfil.renacyt_scopus_author_id ?? "-"} />
          <InfoRow label="Grupo Investigación" value={perfil.grupo_nombre ?? "-"} />
          <InfoRow
            label="Ficha RENACYT"
            value={
              perfil.renacyt_ficha_url ? (
                <a href={perfil.renacyt_ficha_url} target="_blank" rel="noreferrer">
                  Ver ficha
                </a>
              ) : (
                "-"
              )
            }
          />
        </div>
      </details>

      <details open={expandedSections[k("doc-proyectos")]}>
        <SectionHeader
          label="Proyectos"
          count={report.total_proyectos}
          open={expandedSections[k("doc-proyectos")] ?? false}
          onToggle={() => {
            toggleSection(k("doc-proyectos"));
          }}
        />
        {proyectos.length === 0 ? (
          <div className="empty-state">Sin proyectos registrados</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Responsable</th>
                <th>Activo</th>
                <th>Campo OCDE</th>
                <th>Colegas</th>
                <th>Recursos (P|PR|E|F)</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id_proyecto}>
                  <td>{p.titulo_proyecto}</td>
                  <td>{formatBool(p.es_responsable)}</td>
                  <td>{formatBool(p.activo)}</td>
                  <td>{p.campo_ocde ?? "-"}</td>
                  <td>{p.colegas.map((c) => c.nombres_apellidos).join("; ") || "-"}</td>
                  <td>
                    P:{p.recursos_en_proyecto.patentes} PR:{p.recursos_en_proyecto.productos} E:
                    {p.recursos_en_proyecto.equipamientos} F:
                    {p.recursos_en_proyecto.financiamientos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      <details open={expandedSections[k("doc-recursos")]}>
        <SectionHeader
          label="Recursos"
          open={expandedSections[k("doc-recursos")] ?? false}
          onToggle={() => {
            toggleSection(k("doc-recursos"));
          }}
        />
        <div style={{ padding: "0.75rem" }}>
          <p>
            <strong>Patentes ({recursos.total_patentes})</strong>
          </p>
          {recursos.patentes.length === 0 ? (
            <div className="empty-state">Sin patentes</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>N° Patente</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>País</th>
                </tr>
              </thead>
              <tbody>
                {recursos.patentes.map((p) => (
                  <tr key={p.id_patente}>
                    <td>{p.titulo}</td>
                    <td>{p.numero_patente ?? "-"}</td>
                    <td>{p.tipo_nombre ?? "-"}</td>
                    <td>{p.estado_nombre ?? "-"}</td>
                    <td>{p.pais ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: "1rem" }}>
            <strong>Productos ({recursos.total_productos})</strong>
          </p>
          {recursos.productos.length === 0 ? (
            <div className="empty-state">Sin productos</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Etapa</th>
                  <th>F. Registro</th>
                </tr>
              </thead>
              <tbody>
                {recursos.productos.map((p) => (
                  <tr key={p.id_producto}>
                    <td>{p.nombre}</td>
                    <td>{p.tipo_nombre ?? "-"}</td>
                    <td>{p.etapa_nombre ?? "-"}</td>
                    <td>{formatTimestamp(p.fecha_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: "1rem" }}>
            <strong>Equipamientos ({recursos.total_equipamientos})</strong>
          </p>
          {recursos.equipamientos.length === 0 ? (
            <div className="empty-state">Sin equipamientos</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Valor Est.</th>
                  <th>Moneda</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {recursos.equipamientos.map((e) => (
                  <tr key={e.id_equipamiento}>
                    <td>{e.nombre}</td>
                    <td>
                      {e.valor_estimado != null ? e.valor_estimado.toLocaleString("es-PE") : "-"}
                    </td>
                    <td>{e.moneda_nombre ?? "-"}</td>
                    <td>{e.proveedor ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>

      <details open={expandedSections[k("doc-publicaciones")]}>
        <SectionHeader
          label="Publicaciones"
          count={report.total_publicaciones}
          open={expandedSections[k("doc-publicaciones")] ?? false}
          onToggle={() => {
            toggleSection(k("doc-publicaciones"));
          }}
        />
        {publicaciones.length === 0 ? (
          <div className="empty-state">Sin publicaciones registradas</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>DOI</th>
                <th>Año</th>
                <th>Journal</th>
                <th>ISSN</th>
              </tr>
            </thead>
            <tbody>
              {publicaciones.map((p) => (
                <tr key={p.id_publicacion}>
                  <td>{p.titulo}</td>
                  <td>{p.tipo_publicacion ?? "-"}</td>
                  <td>{p.doi ?? "-"}</td>
                  <td>{p.anio_publicacion ?? "-"}</td>
                  <td>{p.journal_titulo ?? "-"}</td>
                  <td>{p.issn ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      <details open={expandedSections[k("doc-trazabilidad")]}>
        <SectionHeader
          label="Trazabilidad"
          open={expandedSections[k("doc-trazabilidad")] ?? false}
          onToggle={() => {
            toggleSection(k("doc-trazabilidad"));
          }}
        />
        <div style={{ padding: "0.75rem" }}>
          <InfoRow label="Última actualización" value={formatTimestamp(trazabilidad.updated_at)} />
          <InfoRow
            label="Sincronización RENACYT"
            value={formatTimestamp(trazabilidad.fecha_ultima_sincronizacion_renacyt)}
          />
          <InfoRow
            label="Sincronización Pure"
            value={formatTimestamp(trazabilidad.fecha_ultima_sincronizacion_pure)}
          />
        </div>
      </details>
    </div>
  );
};

export default SingleDocenteReport;
