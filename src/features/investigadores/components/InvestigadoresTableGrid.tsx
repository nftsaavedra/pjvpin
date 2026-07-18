import React from "react";
import { Eye, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { messages } from "@/shared/feedback/messages";

interface InvestigadoresTableGridProps {
  canManage: boolean;
  investigadores: InvestigadorDetalle[];
  loading: boolean;
  onView: (investigador: InvestigadorDetalle) => void;
  onRefreshRenacyt: (id: string) => void;
  onReactivate: (id: string) => void;
  onDeactivate: (investigador: InvestigadorDetalle) => void;
  refreshingRenacytInvestigadorId: string | null;
}

export const InvestigadoresTableGrid: React.FC<InvestigadoresTableGridProps> = ({
  canManage,
  investigadores,
  loading,
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
    return <div className="empty-state">{messages.investigadores.table.emptyState}</div>;
  }

  return (
    <table className="table table-interactive" aria-label={messages.investigadores.table.ariaLabel}>
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
              investigador.renacyt_codigo_registro || investigador.renacyt_id_investigador,
            );
            const tieneFormaciones = Boolean(
              investigador.renacyt_formaciones_academicas_json?.trim(),
            );
            const estaActualizando =
              refreshingRenacytInvestigadorId === investigador.id_investigador;
            const nivelRenacyt = formatRenacytNivel(investigador.renacyt_nivel);

            return (
              <tr
                key={investigador.id_investigador}
                className={investigador.cantidad_proyectos === 0 ? "unassigned" : ""}
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
                  {investigador.nombres_apellidos || messages.investigadores.fallbacks.sinNombre}
                </td>
                <td>
                  <Badge variant={investigador.cantidad_proyectos === 0 ? "warning" : "success"}>
                    {investigador.cantidad_proyectos}
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
                        onRefreshRenacyt(investigador.id_investigador);
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
                        onReactivate(investigador.id_investigador);
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
  );
};
