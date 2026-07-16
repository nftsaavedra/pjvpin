import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { InvestigadorDetalle } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { InlineIconButton } from "@/shared/ui/InlineIconButton";
import { toast } from "@/shared/feedback/toast";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { formatDate, parseFormacionesAcademicas } from "@/shared/utils/investigadorUtils";
import { InvestigadorPublicacionesSection } from "./InvestigadorPublicacionesSection";

interface InvestigadorDetailScreenProps {
  investigador: InvestigadorDetalle;
  canRefreshRenacyt: boolean;
  canSyncPure: boolean;
  onBack: () => void;
  onRefreshRenacytFormaciones: (id: string) => void;
  isRefreshingRenacyt: boolean;
}

type ExternalBrand = "renacyt" | "orcid" | "scopus";

export const InvestigadorDetailScreen: React.FC<InvestigadorDetailScreenProps> = ({
  investigador,
  canRefreshRenacyt,
  canSyncPure,
  onBack,
  onRefreshRenacytFormaciones,
  isRefreshingRenacyt,
}) => {
  const proyectos = investigador.proyectos ? investigador.proyectos.split(" | ") : [];
  const tieneRenacyt = Boolean(
    investigador.renacyt_codigo_registro || investigador.renacyt_id_investigador,
  );
  const [renacytExpanded, setRenacytExpanded] = useState(true);
  const [formacionesExpanded, setFormacionesExpanded] = useState(false);
  const formacionesAcademicas = parseFormacionesAcademicas(
    investigador.renacyt_formaciones_academicas_json,
  );

  const scopusUrl = investigador.renacyt_scopus_author_id
    ? `https://www.scopus.com/authid/detail.uri?authorId=${encodeURIComponent(investigador.renacyt_scopus_author_id)}`
    : null;
  const orcidUrl = investigador.renacyt_orcid
    ? `https://orcid.org/${encodeURIComponent(investigador.renacyt_orcid)}`
    : null;

  const handleOpenExternalUrl = async (url: string, errorMessage: string): Promise<void> => {
    try {
      await openUrl(url);
    } catch {
      toast.error(errorMessage);
    }
  };

  const renderBrandLabel = (
    label: string,
    brand?: ExternalBrand,
    action?: { tooltip: string; onClick: () => void },
  ) => (
    <span className="renacyt-detail-label-row">
      <span className="renacyt-detail-label-main">
        {brand && (
          <span className={`brand-mark brand-mark-${brand}`} aria-hidden="true">
            {brand === "renacyt" ? "R" : brand === "orcid" ? "O" : "S"}
          </span>
        )}
        <span className="renacyt-detail-label">{label}</span>
      </span>
      {action && (
        <InlineIconButton icon={ExternalLink} label={action.tooltip} onClick={action.onClick} />
      )}
    </span>
  );

  const renderLinkedIdentifier = (
    label: string,
    value: string | null | undefined,
    url: string | null,
    actionLabel: string,
    errorMessage: string,
    brand?: ExternalBrand,
  ) => (
    <div className="renacyt-detail-item renacyt-detail-item-linked">
      {renderBrandLabel(
        label,
        brand,
        url
          ? {
              tooltip: actionLabel,
              onClick: () => void handleOpenExternalUrl(url, errorMessage),
            }
          : undefined,
      )}
      <div className="renacyt-detail-item-content">
        <strong>{value ?? "No disponible"}</strong>
      </div>
    </div>
  );

  return (
    <div className="screen-layout">
      <div className="screen-header">
        <div className="screen-header-left">
          <div className="screen-breadcrumb">
            <button
              type="button"
              className="screen-breadcrumb-back"
              onClick={onBack}
              aria-label="Volver a investigadores"
            >
              <AppIcon icon={ArrowLeft} size={14} />
            </button>
            <span>Investigadores</span>
            <span className="screen-breadcrumb-sep">/</span>
            <span className="screen-breadcrumb-current">{investigador.nombres_apellidos}</span>
          </div>
        </div>
        <div className="screen-header-right">
          <button type="button" className="btn-secondary" onClick={onBack}>
            <span className="button-with-icon">
              <AppIcon icon={ArrowLeft} size={16} />
              <span>Volver a la lista</span>
            </span>
          </button>
        </div>
      </div>

      <div className="screen-body">
        <div className="screen-kpis">
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={GraduationCap} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{investigador.grado || "Sin grado"}</span>
              <span className="screen-kpi-label">Grado Académico</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={BadgeCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {formatRenacytNivel(investigador.renacyt_nivel) ?? "Sin RENACYT"}
              </span>
              <span className="screen-kpi-label">Nivel RENACYT</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              {investigador.activo === 1 ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="warning">Inactivo</Badge>
              )}
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {investigador.activo === 1 ? "Activo" : "Inactivo"}
              </span>
              <span className="screen-kpi-label">Estado</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={BadgeCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{investigador.cantidad_proyectos}</span>
              <span className="screen-kpi-label">Proyectos</span>
            </div>
          </div>
        </div>

        <div className="screen-placeholder-card">
          <p className="title-with-icon">
            <AppIcon icon={BarChart3} size={20} />
            <span>Métricas de participación en proyectos — próximamente</span>
          </p>
          <span>
            Aquí se mostrarán indicadores como distribución de proyectos por tipo y líneas de
            investigación.
          </span>
        </div>

        <div className="screen-section">
          <div className="investigador-info">
            <div className="info-row">
              <label>Nombre:</label>
              <span>{investigador.nombres_apellidos}</span>
            </div>
            <div className="info-row">
              <label>DNI:</label>
              <span>{investigador.dni}</span>
            </div>
            <div className="info-row">
              <label>Grado Académico:</label>
              <span>{investigador.grado}</span>
            </div>
            <div className="info-row highlight">
              <label>Proyectos Asignados:</label>
              <Badge>{investigador.cantidad_proyectos}</Badge>
            </div>
          </div>
        </div>

        <div className="screen-section">
          <div className="renacyt-detail-card">
            <button
              type="button"
              className="renacyt-detail-toggle"
              onClick={() => {
                setRenacytExpanded((current) => !current);
              }}
              aria-expanded={renacytExpanded}
            >
              <span className="renacyt-detail-toggle-copy">
                <span className="title-with-icon renacyt-detail-title">
                  <AppIcon icon={BadgeCheck} size={18} />
                  <span>Estado RENACYT</span>
                </span>
                {tieneRenacyt ? (
                  <Badge variant="success">Vinculado</Badge>
                ) : (
                  <Badge variant="warning">No registrado</Badge>
                )}
              </span>
              <span className="renacyt-detail-toggle-icon" aria-hidden="true">
                <AppIcon icon={renacytExpanded ? ChevronUp : ChevronDown} size={18} />
              </span>
            </button>

            {renacytExpanded &&
              (tieneRenacyt ? (
                <>
                  <div className="renacyt-detail-grid">
                    <div className="renacyt-detail-item">
                      {renderBrandLabel("Código", "renacyt")}
                      <strong>{investigador.renacyt_codigo_registro ?? "No disponible"}</strong>
                    </div>
                    {renderLinkedIdentifier(
                      "ID investigador",
                      investigador.renacyt_id_investigador,
                      investigador.renacyt_ficha_url ?? null,
                      "Abrir ficha RENACYT",
                      "No se pudo abrir la ficha pública RENACYT.",
                      "renacyt",
                    )}
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Nivel</span>
                      <strong>
                        {formatRenacytNivel(investigador.renacyt_nivel) ?? "No disponible"}
                      </strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Grupo</span>
                      <strong>{investigador.renacyt_grupo ?? "No disponible"}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Condición</span>
                      <strong>{investigador.renacyt_condicion ?? "No disponible"}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Registro</span>
                      <strong>{formatDate(investigador.renacyt_fecha_registro)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Informe</span>
                      <strong>{formatDate(investigador.renacyt_fecha_informe_calificacion)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Última revisión</span>
                      <strong>{formatDate(investigador.renacyt_fecha_ultima_revision)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">Última sincronización</span>
                      <strong>
                        {formatDate(investigador.renacyt_fecha_ultima_sincronizacion)}
                      </strong>
                    </div>
                    {renderLinkedIdentifier(
                      "ORCID",
                      investigador.renacyt_orcid,
                      orcidUrl,
                      "Abrir ORCID",
                      "No se pudo abrir el perfil de ORCID.",
                      "orcid",
                    )}
                    {renderLinkedIdentifier(
                      "Scopus Author ID",
                      investigador.renacyt_scopus_author_id,
                      scopusUrl,
                      "Abrir Scopus",
                      "No se pudo abrir el perfil de Scopus.",
                      "scopus",
                    )}
                  </div>

                  {canRefreshRenacyt && (
                    <div className="renacyt-detail-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          onRefreshRenacytFormaciones(investigador.id_investigador);
                        }}
                        disabled={isRefreshingRenacyt}
                      >
                        <span className="button-with-icon">
                          <AppIcon icon={RefreshCw} size={16} />
                          <span>
                            {isRefreshingRenacyt
                              ? "Actualizando formación..."
                              : formacionesAcademicas.length > 0
                                ? "Actualizar formación académica"
                                : "Reintentar formación académica"}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  {canRefreshRenacyt && formacionesAcademicas.length === 0 && (
                    <div className="inline-feedback inline-feedback-info renacyt-formaciones-feedback">
                      <span>
                        No hay formación académica RENACYT sincronizada para este investigador.
                        Puede reintentar la consulta.
                      </span>
                    </div>
                  )}

                  {formacionesAcademicas.length > 0 && (
                    <div className="renacyt-subsection">
                      <button
                        type="button"
                        className="renacyt-subsection-toggle"
                        onClick={() => {
                          setFormacionesExpanded((current) => !current);
                        }}
                        aria-expanded={formacionesExpanded}
                      >
                        <span className="renacyt-subsection-toggle-copy">
                          <span className="title-with-icon renacyt-subsection-title">
                            <span className="brand-mark brand-mark-renacyt" aria-hidden="true">
                              F
                            </span>
                            <span>Formación académica</span>
                          </span>
                          <Badge variant="info">{formacionesAcademicas.length}</Badge>
                        </span>
                        <span className="renacyt-detail-toggle-icon" aria-hidden="true">
                          <AppIcon icon={formacionesExpanded ? ChevronUp : ChevronDown} size={18} />
                        </span>
                      </button>

                      {formacionesExpanded && (
                        <div className="renacyt-formaciones-list">
                          {formacionesAcademicas.map((formacion) => (
                            <article key={formacion.id} className="renacyt-formacion-card">
                              <div className="renacyt-formacion-head">
                                <strong>{formacion.titulo ?? "Formación sin título"}</strong>
                                <Badge
                                  variant={formacion.considerado_para_cc ? "success" : "warning"}
                                >
                                  {formacion.considerado_para_cc ? "Considerado CC" : "Informativo"}
                                </Badge>
                              </div>
                              <div className="renacyt-formacion-grid">
                                <span>
                                  <strong>Grado:</strong>{" "}
                                  {formacion.grado_academico ?? "No disponible"}
                                </span>
                                <span>
                                  <strong>Centro:</strong>{" "}
                                  {formacion.centro_estudios ?? "No disponible"}
                                </span>
                                <span>
                                  <strong>Inicio:</strong> {formatDate(formacion.fecha_inicio)}
                                </span>
                                <span>
                                  <strong>Fin:</strong> {formatDate(formacion.fecha_fin)}
                                </span>
                                <span>
                                  <strong>Puntaje:</strong>{" "}
                                  {formacion.puntaje_obtenido ?? "No disponible"}
                                </span>
                                <span>
                                  <strong>Origen:</strong>{" "}
                                  {formacion.indicador_importado ? "Importado" : "Manual"}
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="renacyt-detail-empty">
                  Este investigador no tiene una clasificación RENACYT vinculada en su registro
                  actual.
                </p>
              ))}
          </div>
        </div>

        <InvestigadorPublicacionesSection
          investigadorId={investigador.id_investigador}
          scopusAuthorId={investigador.renacyt_scopus_author_id}
          canSyncPure={canSyncPure}
        />

        {investigador.cantidad_proyectos > 0 ? (
          <div className="screen-section">
            <h3 className="screen-section-title">
              <AppIcon icon={GraduationCap} size={18} />
              <span>Proyectos en los que Participa</span>
            </h3>
            <div className="screen-readonly-list">
              {proyectos.map((proyecto, idx) => (
                <div key={idx} className="screen-readonly-item">
                  <span className="proyecto-number">{idx + 1}</span>
                  <span className="proyecto-title">{proyecto}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="screen-placeholder-card">
            <p className="title-with-icon">
              <AppIcon icon={TriangleAlert} size={18} />
              <span>Este investigador no tiene proyectos asignados</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
