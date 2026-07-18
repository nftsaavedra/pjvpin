import React from "react";
import { Eye, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { formatRenacytNivel } from "@/shared/utils/renacyt";

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
    return <div className="empty-state">No hay investigadores para el filtro seleccionado</div>;
  }

  return (
    <table className="table table-interactive" aria-label="Tabla de investigadores registrados">
      <thead>
        <tr>
          <th scope="col">DNI</th>
          <th scope="col">Perfil Académico</th>
          <th scope="col">Nombre</th>
          <th scope="col">Proyectos</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
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
                <td>{investigador.dni || "Sin DNI"}</td>
                <td>
                  <div className="investigador-profile-cell">
                    <strong>{investigador.grado || "Sin grado"}</strong>
                    <Badge variant={nivelRenacyt ? "info" : "warning"}>
                      {nivelRenacyt ? `RENACYT ${nivelRenacyt}` : "Sin nivel RENACYT"}
                    </Badge>
                  </div>
                </td>
                <td className="font-semibold">
                  {investigador.nombres_apellidos || "Sin nombre registrado"}
                </td>
                <td>
                  <Badge variant={investigador.cantidad_proyectos === 0 ? "warning" : "success"}>
                    {investigador.cantidad_proyectos}
                  </Badge>
                </td>
                <td>
                  {investigador.activo === 1 ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="warning">Inactivo</Badge>
                  )}
                </td>
                <td className="table-actions">
                  <TableActionButton
                    className="btn-view"
                    icon={Eye}
                    label="Ver detalles"
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
                          ? "Actualizando formación RENACYT"
                          : tieneFormaciones
                            ? "Actualizar formación RENACYT"
                            : "Reintentar formación RENACYT"
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
                      label="Reactivar investigador"
                      onClick={() => {
                        onReactivate(investigador.id_investigador);
                      }}
                    />
                  )}
                  {canManage && investigador.activo === 1 && (
                    <TableActionButton
                      className="btn-delete"
                      icon={Trash2}
                      label="Desactivar investigador"
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
