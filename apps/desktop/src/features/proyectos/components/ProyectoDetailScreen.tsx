import React, { useState } from "react";
import {
  ArrowLeft,
  Beaker,
  BarChart3,
  DollarSign,
  FolderOpen,
  Lightbulb,
  Package,
  Pencil,
  UserCheck,
  Users,
} from "lucide-react";
import type { ProyectoDetalle } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { messages } from "@/shared/feedback/messages";
import type { RelatedEntity } from "./relatedEntity";

type ResourceTab = "patentes" | "productos" | "equipamiento" | "financiamiento";

interface ProyectoDetailScreenProps {
  proyecto: ProyectoDetalle;
  patentes: RelatedEntity[];
  productos: RelatedEntity[];
  equipamientos: RelatedEntity[];
  financiamientos: RelatedEntity[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export const ProyectoDetailScreen: React.FC<ProyectoDetailScreenProps> = ({
  proyecto,
  patentes,
  productos,
  equipamientos,
  financiamientos,
  canManage,
  onBack,
  onEdit,
}) => {
  const participantes = React.useMemo(
    () => parseParticipantesProyecto(proyecto.participantes_json),
    [proyecto.participantes_json],
  );
  const responsable = React.useMemo(() => getResponsableProyecto(participantes), [participantes]);
  const [activeResourceTab, setActiveResourceTab] = useState<ResourceTab>("patentes");

  const recursosTotal =
    patentes.length + productos.length + equipamientos.length + financiamientos.length;

  const resourceItems: {
    id: ResourceTab;
    label: string;
    icon: typeof FolderOpen;
    items: RelatedEntity[];
  }[] = [
    {
      id: "patentes",
      label: messages.proyectos.resourceTabs.patentes,
      icon: Beaker,
      items: patentes,
    },
    {
      id: "productos",
      label: messages.proyectos.resourceTabs.productos,
      icon: Lightbulb,
      items: productos,
    },
    {
      id: "equipamiento",
      label: messages.proyectos.resourceTabs.equipamiento,
      icon: Package,
      items: equipamientos,
    },
    {
      id: "financiamiento",
      label: messages.proyectos.resourceTabs.financiamiento,
      icon: DollarSign,
      items: financiamientos,
    },
  ];

  const activeItems = resourceItems.find((r) => r.id === activeResourceTab)?.items ?? [];

  return (
    <div className="screen-layout">
      <div className="screen-header">
        <div className="screen-header-left">
          <div className="screen-breadcrumb">
            <button
              type="button"
              className="screen-breadcrumb-back"
              onClick={onBack}
              aria-label={messages.proyectos.detail.volverAProyectos}
            >
              <AppIcon icon={ArrowLeft} size={14} />
            </button>
            <span>{messages.proyectos.breadcrumb}</span>
            <span className="screen-breadcrumb-sep">/</span>
            <span className="screen-breadcrumb-current">{proyecto.titulo_proyecto}</span>
          </div>
        </div>
        <div className="screen-header-right">
          <button type="button" className="btn-secondary" onClick={onBack}>
            <span className="button-with-icon">
              <AppIcon icon={ArrowLeft} size={16} />
              <span>{messages.proyectos.detail.volverALista}</span>
            </span>
          </button>
          {canManage && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <span className="button-with-icon">
                <AppIcon icon={Pencil} size={16} />
                <span>{messages.proyectos.detail.editarProyecto}</span>
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="screen-body">
        <div className="screen-kpis">
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={Users} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{participantes.length}</span>
              <span className="screen-kpi-label">
                {messages.proyectos.detail.kpiLabels.investigadores}
              </span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={UserCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {responsable?.nombre ?? messages.proyectos.detail.fallbacks.sinResponsable}
              </span>
              <span className="screen-kpi-label">
                {messages.proyectos.detail.kpiLabels.responsable}
              </span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              {proyecto.activo ? (
                <Badge variant="success">{messages.ui.statusActivo}</Badge>
              ) : (
                <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
              )}
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">
                {proyecto.activo ? messages.ui.statusActivo : messages.ui.statusInactivo}
              </span>
              <span className="screen-kpi-label">{messages.proyectos.detail.kpiLabels.estado}</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={Package} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{recursosTotal}</span>
              <span className="screen-kpi-label">
                {messages.proyectos.detail.kpiLabels.recursosTotales}
              </span>
            </div>
          </div>
        </div>

        <div className="screen-placeholder-card">
          <p className="title-with-icon">
            <AppIcon icon={BarChart3} size={20} />
            <span>{messages.proyectos.detail.metricasPronto}</span>
          </p>
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">
              <AppIcon icon={Users} size={18} />
              <span>{messages.proyectos.detail.investigadoresParticipantes}</span>
            </span>
          </div>
          {participantes.length === 0 ? (
            <p className="screen-placeholder-card">
              {messages.proyectos.detail.sinInvestigadoresVinculados}
            </p>
          ) : (
            <div className="screen-readonly-list">
              {participantes.map((participante) => (
                <div key={participante.id_investigador} className="screen-readonly-item">
                  <span>
                    <strong>{participante.nombre}</strong>
                    {participante.grado && <span> &mdash; {participante.grado}</span>}
                  </span>
                  <div className="screen-readonly-item-meta">
                    {participante.es_responsable && (
                      <Badge variant="info">{messages.proyectos.detail.responsableBadge}</Badge>
                    )}
                    <Badge variant="info">
                      {formatRenacytNivel(participante.renacyt_nivel) ??
                        messages.proyectos.detail.fallbacks.sinRenacyt}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">
              {messages.proyectos.sectionTitles.recursos}
            </span>
          </div>

          <div className="screen-tabs">
            {resourceItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`screen-tab-button ${activeResourceTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveResourceTab(tab.id);
                }}
              >
                <AppIcon icon={tab.icon} size={16} />
                <span>{tab.label}</span>
                {tab.items.length > 0 && <Badge variant="info">{tab.items.length}</Badge>}
              </button>
            ))}
          </div>

          {activeItems.length === 0 ? (
            <p className="screen-placeholder-card">
              {messages.proyectos.detail.sinRecursos(
                resourceItems.find((r) => r.id === activeResourceTab)?.label.toLowerCase() ?? "",
              )}
            </p>
          ) : (
            <div className="screen-readonly-list">
              {activeItems.map((item) => (
                <div key={item.id} className="screen-readonly-item">
                  <span>
                    {Array.from(Object.entries(item))
                      .filter(([k]) => k !== "id")
                      .map(([k, v]) => (
                        <span key={k} style={{ marginRight: "1.25rem" }}>
                          {k.replace(/_/g, " ")}:{" "}
                          <strong>{typeof v === "string" ? v : JSON.stringify(v)}</strong>
                        </span>
                      ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
