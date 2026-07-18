import React from "react";
import { Plus } from "lucide-react";
import type { ProyectoDetalle } from "../api";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";
import { ProyectosTableGrid } from "./ProyectosTableGrid";
import { ProyectosToolbar } from "./ProyectosToolbar";
import type { useProyectosListado } from "../hooks/useProyectosListado";

interface ProyectosListViewProps {
  canManage: boolean;
  listado: ReturnType<typeof useProyectosListado>;
  proyectos: ProyectoDetalle[];
  loadingProyectos: boolean;
  proyectosError: string | null;
  proyectoToDelete: ProyectoDetalle | null;
  onOpenCreate: () => void;
  onOpenEdit: (proyecto: ProyectoDetalle) => void;
  onOpenDetail: (proyecto: ProyectoDetalle) => void;
  onDeactivate: (proyecto: ProyectoDetalle) => void;
  onReactivate: (id: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const ProyectosListView: React.FC<ProyectosListViewProps> = ({
  canManage,
  listado,
  proyectos,
  loadingProyectos,
  proyectosError,
  proyectoToDelete,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  onDeactivate,
  onReactivate,
  onConfirmDelete,
  onCancelDelete,
}) => {
  return (
    <div className="tab-panel module-shell proyectos-module">
      <div className="table-container">
        <div className="section-header">
          <h2>Proyectos Registrados</h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={onOpenCreate}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>Nuevo proyecto</span>
                </span>
              </button>
            </div>
          )}
        </div>
        {proyectosError && (
          <div className="inline-feedback inline-feedback-warning">
            <span>No se pudo refrescar la lista. Se conservan los datos visibles.</span>
          </div>
        )}
        {!canManage && (
          <div className="inline-feedback inline-feedback-info">
            <span>Modo consulta: solo lectura de proyectos.</span>
          </div>
        )}
        <ProyectosToolbar
          busqueda={listado.busqueda}
          estadoFiltro={listado.estadoFiltro}
          loading={loadingProyectos}
          totalActivos={listado.totalActivos}
          totalInactivos={listado.totalInactivos}
          totalTodos={proyectos.length}
          totalVisibles={listado.proyectosFiltrados.length}
          onBusquedaChange={listado.setBusqueda}
          onEstadoFiltroChange={listado.setEstadoFiltro}
        />
        <ProyectosTableGrid
          loading={loadingProyectos}
          proyectos={listado.proyectosFiltrados}
          onDeactivate={onDeactivate}
          onEdit={onOpenEdit}
          onOpenDetail={onOpenDetail}
          onReactivate={(id: string) => {
            onReactivate(id);
          }}
          canManage={canManage}
        />
      </div>

      {canManage && (
        <ConfirmDialog
          open={Boolean(proyectoToDelete)}
          title="Desactivar proyecto"
          message={`¿Desactivar "${proyectoToDelete?.titulo_proyecto ?? ""}"?`}
          confirmText="Sí, desactivar"
          cancelText="Cancelar"
          onConfirm={() => {
            onConfirmDelete();
          }}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
};
