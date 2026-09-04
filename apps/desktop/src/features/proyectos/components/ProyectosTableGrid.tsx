import React, { useState } from "react";
import { Eye, Pencil, RotateCcw, Trash2, Users, X } from "lucide-react";
import type { ProyectoDetalle, ProyectoParticipanteResumen } from "../api";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import { messages } from "@/shared/feedback/messages";

interface ProyectosTableGridProps {
  canManage: boolean;
  hasActiveFilters: boolean;
  loading: boolean;
  onClearFilters: () => void;
  onCreateClick: () => void;
  proyectos: ProyectoDetalle[];
  onDeactivate: (proyecto: ProyectoDetalle) => void;
  onEdit: (proyecto: ProyectoDetalle) => void;
  onReactivate: (id: string) => void;
  onOpenDetail?: (proyecto: ProyectoDetalle) => void;
}

export const ProyectosTableGrid: React.FC<ProyectosTableGridProps> = ({
  canManage,
  hasActiveFilters,
  loading,
  onClearFilters,
  onCreateClick,
  proyectos,
  onDeactivate,
  onEdit,
  onReactivate,
  onOpenDetail,
}) => {
  const [selectedProyecto, setSelectedProyecto] = useState<{
    titulo: string;
    participantes: ProyectoParticipanteResumen[];
  } | null>(null);

  if (loading) {
    return <SkeletonTable columns={5} rows={6} />;
  }

  if (proyectos.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          variant="filtered"
          message={messages.ui.filteredEmpty("proyectos")}
          actionLabel={messages.ui.emptyStateCtas.limpiarFiltros}
          onAction={onClearFilters}
          data-testid="proyectos-empty-filtered"
        />
      );
    }
    return (
      <EmptyState
        variant="empty"
        message={messages.ui.emptyState("proyectos")}
        actionLabel={canManage ? messages.ui.emptyStateCtas.crearPrimero("proyecto") : undefined}
        onAction={canManage ? onCreateClick : undefined}
        data-testid="proyectos-empty-initial"
      />
    );
  }

  return (
    <>
      <table className="table" aria-label={messages.proyectos.table.ariaLabel}>
        <thead>
          <tr>
            <th scope="col">{messages.proyectos.table.columns.titulo}</th>
            <th scope="col">{messages.proyectos.table.columns.responsable}</th>
            <th scope="col">{messages.proyectos.table.columns.investigadores}</th>
            <th scope="col">{messages.proyectos.table.columns.estado}</th>
            <th scope="col">{messages.proyectos.table.columns.acciones}</th>
          </tr>
        </thead>
        <tbody>
          {proyectos.map((proyecto) => {
            const participantes = parseParticipantesProyecto(proyecto.participantes_json);
            const responsable = getResponsableProyecto(participantes);

            return (
              <tr key={proyecto.id_proyecto}>
                <td>{proyecto.titulo_proyecto}</td>
                <td>
                  {responsable ? (
                    <div className="project-responsable-cell">
                      <strong>{responsable.nombre}</strong>
                    </div>
                  ) : (
                    <span className="project-responsable-empty">
                      {messages.proyectos.table.sinResponsable}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="project-investigadores-trigger"
                    onClick={() => {
                      setSelectedProyecto({ titulo: proyecto.titulo_proyecto, participantes });
                    }}
                    disabled={participantes.length === 0}
                  >
                    <span className="button-with-icon">
                      <AppIcon icon={Users} size={15} />
                      <span>
                        {proyecto.cantidad_investigadores}{" "}
                        {proyecto.cantidad_investigadores === 1
                          ? messages.proyectos.table.contadorInvestigador
                          : messages.proyectos.table.contadoresInvestigadores}
                      </span>
                    </span>
                  </button>
                </td>
                <td>
                  {proyecto.activo ? (
                    <Badge variant="success">{messages.ui.statusActivo}</Badge>
                  ) : (
                    <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
                  )}
                </td>
                <td className="table-actions">
                  {onOpenDetail && (
                    <TableActionButton
                      className="btn-secondary"
                      icon={Eye}
                      label={messages.proyectos.table.actions.verDetalle}
                      onClick={() => {
                        onOpenDetail(proyecto);
                      }}
                    />
                  )}
                  {canManage ? (
                    <>
                      {proyecto.activo && (
                        <TableActionButton
                          className="btn-secondary"
                          icon={Pencil}
                          label={messages.proyectos.table.actions.editar}
                          onClick={() => {
                            onEdit(proyecto);
                          }}
                        />
                      )}
                      {!proyecto.activo && (
                        <TableActionButton
                          className="btn-primary"
                          icon={RotateCcw}
                          label={messages.proyectos.table.actions.reactivar}
                          onClick={() => {
                            onReactivate(proyecto.id_proyecto);
                          }}
                        />
                      )}
                      <TableActionButton
                        className="btn-delete"
                        icon={Trash2}
                        label={
                          proyecto.activo
                            ? messages.proyectos.table.actions.desactivar
                            : messages.proyectos.table.actions.mantenerInactivo
                        }
                        onClick={() => {
                          onDeactivate(proyecto);
                        }}
                      />
                    </>
                  ) : (
                    <span className="table-actions-empty">
                      {messages.proyectos.table.soloLectura}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedProyecto && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedProyecto(null);
          }}
        >
          <div
            className="modal-content project-participants-modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="modal-header">
              <h2 className="title-with-icon">
                <AppIcon icon={Users} size={20} />
                <span>{messages.proyectos.table.modal.participantesTitle}</span>
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setSelectedProyecto(null);
                }}
                aria-label={messages.proyectos.table.modal.cerrarParticipantes}
              >
                <AppIcon icon={X} size={18} />
              </button>
            </div>

            <div className="modal-body project-participants-modal-body">
              <div className="project-participants-modal-intro">
                <strong>{selectedProyecto.titulo}</strong>
                <span>
                  {messages.proyectos.table.modal.investigadoresRelacionados(
                    selectedProyecto.participantes.length,
                  )}
                </span>
              </div>
              <div className="project-participants-list">
                {selectedProyecto.participantes.map((participante, index) => (
                  <article
                    key={`${selectedProyecto.titulo}-${participante.nombre}-${index}`}
                    className="project-participant-card"
                  >
                    <div className="project-participant-card-head">
                      <strong>{participante.nombre}</strong>
                      {participante.es_responsable && (
                        <Badge variant="info">{messages.proyectos.detail.responsableBadge}</Badge>
                      )}
                    </div>
                    <span>{participante.grado}</span>
                    <span>
                      {formatRenacytNivel(participante.renacyt_nivel) ??
                        messages.investigadores.fallbacks.sinNivelRenacyt}
                    </span>
                  </article>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedProyecto(null);
                }}
              >
                {messages.proyectos.table.modal.cerrar}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
