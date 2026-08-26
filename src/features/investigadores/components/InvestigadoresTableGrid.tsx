import React from "react";
import { Eye, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { tieneCambiosSinRevisar } from "@/shared/utils/investigadorUtils";
import { messages } from "@/shared/feedback/messages";

interface InvestigadoresTableGridProps {
  canManage: boolean;
  hasActiveFilters: boolean;
  investigadores: InvestigadorDetalle[];
  loading: boolean;
  onClearFilters: () => void;
  onCreateClick: () => void;
  onView: (investigador: InvestigadorDetalle) => void;
  onRefreshRenacyt: (id: string) => void;
  onReactivate: (id: string) => void;
  onDeactivate: (investigador: InvestigadorDetalle) => void;
  refreshingRenacytInvestigadorId: string | null;
}

export const InvestigadoresTableGrid: React.FC<InvestigadoresTableGridProps> = ({
  canManage,
  hasActiveFilters,
  investigadores,
  loading,
  onClearFilters,
  onCreateClick,
  onView,
  onRefreshRenacyt,
  onReactivate,
  onDeactivate,
  refreshingRenacytInvestigadorId,
}) => {
  if (loading) {
    return <SkeletonTable columns={6} rows={6} />;
  }

  if (investigadores.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          variant="filtered"
          message={messages.ui.filteredEmpty("investigadores")}
          actionLabel={messages.ui.emptyStateCtas.limpiarFiltros}
          onAction={onClearFilters}
          data-testid="investigadores-empty-filtered"
        />
      );
    }
    return (
      <EmptyState
        variant="empty"
        message={messages.ui.emptyState("investigadores")}
        actionLabel={
          canManage ? messages.ui.emptyStateCtas.crearPrimero("investigador") : undefined
        }
        onAction={canManage ? onCreateClick : undefined}
        data-testid="investigadores-empty-initial"
      />
    );
  }

  return (
    <div className="overflow-x-auto whitespace-nowrap">
      <table
        className="table table-interactive"
        aria-label={messages.investigadores.table.ariaLabel}
      >
        <thead>
          <tr>
            <th scope="col">{messages.investigadores.table.columns.dni}</th>
            <th scope="col">{messages.investigadores.table.columns.perfilAcademico}</th>
            <th scope="col">{messages.investigadores.table.columns.nombre}</th>
            <th scope="col">{messages.investigadores.table.columns.proyectos}</th>
            <th scope="col">{messages.investigadores.table.columns.estado}</th>
            <th scope="col">{messages.investigadores.table.columns.acciones}</th>
          </tr>
        </thead>
        <tbody>
          {investigadores.map((investigador) =>
            (() => {
              const tieneRenacyt = Boolean(
                investigador.renacytCodigoRegistro || investigador.renacytIdInvestigador,
              );
              const tieneFormaciones = Boolean(
                investigador.renacytFormacionesAcademicasJson?.trim(),
              );
              const estaActualizando =
                refreshingRenacytInvestigadorId === investigador.idInvestigador;
              const nivelRenacyt = formatRenacytNivel(investigador.renacytNivel);
              const cambiosSinRevisar = tieneCambiosSinRevisar(investigador);

              return (
                <tr
                  key={investigador.idInvestigador}
                  className={investigador.cantidadProyectos === 0 ? "unassigned" : ""}
                  title={
                    investigador.cantidadProyectos === 0
                      ? messages.investigadores.table.sinProyectosTooltip
                      : undefined
                  }
                >
                  <td>{investigador.dni || messages.investigadores.fallbacks.sinDni}</td>
                  <td>
                    <div className="investigador-profile-cell">
                      <strong>
                        {investigador.grado || messages.investigadores.fallbacks.sinGrado}
                      </strong>
                      <Badge variant={nivelRenacyt ? "info" : "warning"}>
                        {nivelRenacyt
                          ? messages.investigadores.renacytSection.renacytNivel(nivelRenacyt)
                          : messages.investigadores.fallbacks.sinNivelRenacyt}
                      </Badge>
                    </div>
                  </td>
                  <td className="font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {investigador.nombresApellidos ||
                          messages.investigadores.fallbacks.sinNombre}
                      </span>
                      {cambiosSinRevisar && (
                        <StatusChip variant="warning">
                          {messages.investigadores.kardex.alertaBadge}
                        </StatusChip>
                      )}
                    </span>
                  </td>
                  <td>
                    <Badge variant={investigador.cantidadProyectos === 0 ? "warning" : "success"}>
                      {investigador.cantidadProyectos}
                    </Badge>
                  </td>
                  <td>
                    {investigador.activo === 1 ? (
                      <Badge variant="success">{messages.ui.statusActivo}</Badge>
                    ) : (
                      <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
                    )}
                  </td>
                  <td className="table-actions">
                    <TableActionButton
                      className="btn-view"
                      icon={Eye}
                      label={messages.investigadores.table.actions.verDetalles}
                      onClick={() => {
                        onView(investigador);
                      }}
                    />
                    {canManage && tieneRenacyt && (
                      <TableActionButton
                        className="btn-secondary"
                        icon={RefreshCw}
                        label={
                          estaActualizando
                            ? messages.investigadores.table.actions.actualizandoFormacion
                            : tieneFormaciones
                              ? messages.investigadores.table.actions.actualizarFormacion
                              : messages.investigadores.table.actions.reintentarFormacion
                        }
                        onClick={() => {
                          onRefreshRenacyt(investigador.idInvestigador);
                        }}
                        disabled={estaActualizando}
                      />
                    )}
                    {canManage && investigador.activo === 0 && (
                      <TableActionButton
                        className="btn-primary"
                        icon={RotateCcw}
                        iconSize={18}
                        label={messages.investigadores.table.actions.reactivar}
                        onClick={() => {
                          onReactivate(investigador.idInvestigador);
                        }}
                      />
                    )}
                    {canManage && investigador.activo === 1 && (
                      <TableActionButton
                        className="btn-delete"
                        icon={Trash2}
                        label={messages.investigadores.table.actions.desactivar}
                        onClick={() => {
                          onDeactivate(investigador);
                        }}
                      />
                    )}
                  </td>
                </tr>
              );
            })(),
          )}
        </tbody>
      </table>
    </div>
  );
};
