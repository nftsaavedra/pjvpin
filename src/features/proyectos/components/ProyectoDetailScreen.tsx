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
    { id: "patentes", label: "Patentes", icon: Beaker, items: patentes },
    { id: "productos", label: "Productos I+D+i", icon: Lightbulb, items: productos },
    { id: "equipamiento", label: "Equipamiento", icon: Package, items: equipamientos },
    { id: "financiamiento", label: "Financiamiento", icon: DollarSign, items: financiamientos },
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
              aria-label="Volver a proyectos"
            >
              <AppIcon icon={ArrowLeft} size={14} />
            </button>
            <span>Proyectos</span>
            <span className="screen-breadcrumb-sep">/</span>
            <span className="screen-breadcrumb-current">{proyecto.titulo_proyecto}</span>
          </div>
        </div>
        <div className="screen-header-right">
          <button type="button" className="btn-secondary" onClick={onBack}>
            <span className="button-with-icon">
              <AppIcon icon={ArrowLeft} size={16} />
              <span>Volver a la lista</span>
            </span>
          </button>
          {canManage && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <span className="button-with-icon">
                <AppIcon icon={Pencil} size={16} />
                <span>Editar proyecto</span>
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
              <span className="screen-kpi-label">Investigadores</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={UserCheck} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{responsable?.nombre ?? "Sin responsable"}</span>
              <span className="screen-kpi-label">Responsable</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              {proyecto.activo ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="warning">Inactivo</Badge>
              )}
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{proyecto.activo ? "Activo" : "Inactivo"}</span>
              <span className="screen-kpi-label">Estado</span>
            </div>
          </div>
          <div className="screen-kpi-card">
            <div className="screen-kpi-icon">
              <AppIcon icon={Package} size={18} />
            </div>
            <div className="screen-kpi-copy">
              <span className="screen-kpi-value">{recursosTotal}</span>
              <span className="screen-kpi-label">Recursos totales</span>
            </div>
          </div>
        </div>

        <div className="screen-placeholder-card">
          <p className="title-with-icon">
            <AppIcon icon={BarChart3} size={20} />
            <span>Métricas y gráficos de recursos — próximamente</span>
          </p>
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">
              <AppIcon icon={Users} size={18} />
              <span>Investigadores participantes</span>
            </span>
          </div>
          {participantes.length === 0 ? (
            <p className="screen-placeholder-card">
              No hay investigadores vinculados a este proyecto.
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
                    {participante.es_responsable && <Badge variant="info">Responsable</Badge>}
                    <Badge variant="info">
                      {formatRenacytNivel(participante.renacyt_nivel) ?? "Sin RENACYT"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">Recursos asociados</span>
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
              Sin {resourceItems.find((r) => r.id === activeResourceTab)?.label.toLowerCase()}{" "}
              registrados.
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
