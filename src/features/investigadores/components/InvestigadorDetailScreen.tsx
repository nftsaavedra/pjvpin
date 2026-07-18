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
import { messages } from "@/shared/feedback/messages";

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
        <strong>{value ?? messages.ui.noDisponible}</strong>
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
              aria-label={messages.investigadores.volverAInvestigadores}
            >
              <AppIcon icon={ArrowLeft} size={14} />
            </button>
            <span>{messages.investigadores.breadcrumb}</span>
            <span className="screen-breadcrumb-sep">/</span>
            <span className="screen-breadcrumb-current">{investigador.nombres_apellidos}</span>
          </div>
        </div>
        <div className="screen-header-right">
          <button type="button" className="btn-secondary" onClick={onBack}>
            <span className="button-with-icon">
              <AppIcon icon={ArrowLeft} size={16} />
              <span>{messages.investigadores.volverALista}</span>
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
              <span className="screen-kpi-value">
                {investigador.grado || messages.investigadores.fallbacks.sinGrado}
              </span>
              <span className="screen-kpi-label">{messages.investigadores.kpiLabels.grado}</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={BadgeCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {formatRenacytNivel(investigador.renacyt_nivel) ??
                  messages.investigadores.fallbacks.sinRenacyt}
              </span>
              <span className="screen-kpi-label">
                {messages.investigadores.kpiLabels.nivelRenacyt}
              </span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              {investigador.activo === 1 ? (
                <Badge variant="success">{messages.ui.statusActivo}</Badge>
              ) : (
                <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
              )}
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {investigador.activo === 1 ? messages.ui.statusActivo : messages.ui.statusInactivo}
              </span>
              <span className="screen-kpi-label">{messages.investigadores.kpiLabels.estado}</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={BadgeCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{investigador.cantidad_proyectos}</span>
              <span className="screen-kpi-label">
                {messages.investigadores.kpiLabels.proyectos}
              </span>
            </div>
          </div>
        </div>

        <div className="screen-placeholder-card">
          <p className="title-with-icon">
            <AppIcon icon={BarChart3} size={20} />
            <span>{messages.investigadores.metricasPronto}</span>
          </p>
        </div>

        <div className="screen-section">
          <div className="investigador-info">
            <div className="info-row">
              <label>{messages.investigadores.infoRowLabels.nombre}</label>
              <span>{investigador.nombres_apellidos}</span>
            </div>
            <div className="info-row">
              <label>{messages.investigadores.infoRowLabels.dni}</label>
              <span>{investigador.dni}</span>
            </div>
            <div className="info-row">
              <label>{messages.investigadores.infoRowLabels.gradoAcademico}</label>
              <span>{investigador.grado}</span>
            </div>
            <div className="info-row highlight">
              <label>{messages.investigadores.infoRowLabels.proyectosAsignados}</label>
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
                  <span>{messages.investigadores.renacytSection.estadoRenacyt}</span>
                </span>
                {tieneRenacyt ? (
                  <Badge variant="success">
                    {messages.investigadores.renacytSection.renacytVinculado}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    {messages.investigadores.renacytSection.renacytNoRegistrado}
                  </Badge>
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
                      {renderBrandLabel(messages.investigadores.renacytSection.codigo, "renacyt")}
                      <strong>
                        {investigador.renacyt_codigo_registro ?? messages.ui.noDisponible}
                      </strong>
                    </div>
                    {renderLinkedIdentifier(
                      messages.investigadores.renacytSection.idInvestigador,
                      investigador.renacyt_id_investigador,
                      investigador.renacyt_ficha_url ?? null,
                      messages.investigadores.renacytActions.abrirFichaRenacyt,
                      messages.investigadores.renacytActions.fichaRenacytError,
                      "renacyt",
                    )}
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.nivel}
                      </span>
                      <strong>
                        {formatRenacytNivel(investigador.renacyt_nivel) ?? messages.ui.noDisponible}
                      </strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.grupo}
                      </span>
                      <strong>{investigador.renacyt_grupo ?? messages.ui.noDisponible}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.condicion}
                      </span>
                      <strong>{investigador.renacyt_condicion ?? messages.ui.noDisponible}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.registro}
                      </span>
                      <strong>{formatDate(investigador.renacyt_fecha_registro)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.informe}
                      </span>
                      <strong>{formatDate(investigador.renacyt_fecha_informe_calificacion)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.ultimaRevision}
                      </span>
                      <strong>{formatDate(investigador.renacyt_fecha_ultima_revision)}</strong>
                    </div>
                    <div className="renacyt-detail-item">
                      <span className="renacyt-detail-label">
                        {messages.investigadores.renacytSection.ultimaSincronizacion}
                      </span>
                      <strong>
                        {formatDate(investigador.renacyt_fecha_ultima_sincronizacion)}
                      </strong>
                    </div>
                    {renderLinkedIdentifier(
                      messages.investigadores.renacytSection.orcid,
                      investigador.renacyt_orcid,
                      orcidUrl,
                      messages.investigadores.renacytActions.abrirOrcid,
                      messages.investigadores.renacytActions.orcidError,
                      "orcid",
                    )}
                    {renderLinkedIdentifier(
                      messages.investigadores.renacytSection.scopusAuthorId,
                      investigador.renacyt_scopus_author_id,
                      scopusUrl,
                      messages.investigadores.renacytActions.abrirScopus,
                      messages.investigadores.renacytActions.scopusError,
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
                              ? messages.investigadores.renacytActions.actualizandoFormacion
                              : formacionesAcademicas.length > 0
                                ? messages.investigadores.renacytActions.actualizarFormacion
                                : messages.investigadores.renacytActions.reintentarFormacion}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  {canRefreshRenacyt && formacionesAcademicas.length === 0 && (
                    <div className="inline-feedback inline-feedback-info renacyt-formaciones-feedback">
                      <span>{messages.investigadores.formaciones.sinFormacionSincronizada}</span>
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
                            <span>{messages.investigadores.formaciones.titulo}</span>
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
                                <strong>
                                  {formacion.titulo ??
                                    messages.investigadores.fallbacks.formacionSinTitulo}
                                </strong>
                                <Badge
                                  variant={formacion.considerado_para_cc ? "success" : "warning"}
                                >
                                  {formacion.considerado_para_cc
                                    ? messages.investigadores.formaciones.badges.consideradoCC
                                    : messages.investigadores.formaciones.badges.informativo}
                                </Badge>
                              </div>
                              <div className="renacyt-formacion-grid">
                                <span>
                                  <strong>
                                    {messages.investigadores.formaciones.fields.grado}
                                  </strong>{" "}
                                  {formacion.grado_academico ?? messages.ui.noDisponible}
                                </span>
                                <span>
                                  <strong>
                                    {messages.investigadores.formaciones.fields.centro}
                                  </strong>{" "}
                                  {formacion.centro_estudios ?? messages.ui.noDisponible}
                                </span>
                                <span>
                                  <strong>
                                    {messages.investigadores.formaciones.fields.inicio}
                                  </strong>{" "}
                                  {formatDate(formacion.fecha_inicio)}
                                </span>
                                <span>
                                  <strong>{messages.investigadores.formaciones.fields.fin}</strong>{" "}
                                  {formatDate(formacion.fecha_fin)}
                                </span>
                                <span>
                                  <strong>
                                    {messages.investigadores.formaciones.fields.puntaje}
                                  </strong>{" "}
                                  {formacion.puntaje_obtenido ?? messages.ui.noDisponible}
                                </span>
                                <span>
                                  <strong>
                                    {messages.investigadores.formaciones.fields.origen}
                                  </strong>{" "}
                                  {formacion.indicador_importado
                                    ? messages.investigadores.formaciones.origenImportado
                                    : messages.investigadores.formaciones.origenManual}
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
                  {messages.investigadores.fallbacks.sinClasificacionRenacyt}
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
              <span>{messages.investigadores.proyectosEnParticipa}</span>
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
              <span>{messages.investigadores.sinProyectosAsignados}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
