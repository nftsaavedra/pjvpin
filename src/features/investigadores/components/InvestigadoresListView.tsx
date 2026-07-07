import React from "react";
import { GraduationCap, Plus } from "lucide-react";
import type { DocenteDetalle } from "../api";
import { DocentesTableGrid } from "./DocentesTableGrid";
import { DocentesTableToolbar } from "./DocentesTableToolbar";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";

interface DocentesListViewProps {
  canManage: boolean;
  busqueda: string;
  cargarDocentes: () => Promise<void>;
  docenteToDelete: DocenteDetalle | null;
  docentes: DocenteDetalle[];
  docentesFiltrados: DocenteDetalle[];
  error: string | null;
  estadoFiltro: "todos" | "activos" | "inactivos";
  gradoFiltro: string;
  gradosDisponibles: string[];
  handleRefreshRenacytFormaciones: (id: string) => void;
  handleReactivarDocente: (id: string) => void;
  loading: boolean;
  nivelesRenacytDisponibles: string[];
  renacytNivelFiltro: string;
  refreshingRenacytDocenteId: string | null;
  totalActivos: number;
  totalInactivos: number;
  onBusquedaChange: (value: string) => void;
  onEstadoFiltroChange: (value: "todos" | "activos" | "inactivos") => void;
  onGradoFiltroChange: (value: string) => void;
  onRenacytNivelFiltroChange: (value: string) => void;
  onDeactivate: (docente: DocenteDetalle) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCreateClick: () => void;
  onOpenDetail: (docente: DocenteDetalle) => void;
}

export const DocentesListView: React.FC<DocentesListViewProps> = ({
  canManage,
  busqueda,
  cargarDocentes,
  docenteToDelete,
  docentes,
  docentesFiltrados,
  error,
  estadoFiltro,
  gradoFiltro,
  gradosDisponibles,
  handleRefreshRenacytFormaciones,
  handleReactivarDocente,
  loading,
  nivelesRenacytDisponibles,
  renacytNivelFiltro,
  refreshingRenacytDocenteId,
  totalActivos,
  totalInactivos,
  onBusquedaChange,
  onEstadoFiltroChange,
  onGradoFiltroChange,
  onRenacytNivelFiltroChange,
  onDeactivate,
  onConfirmDelete,
  onCancelDelete,
  onCreateClick,
  onOpenDetail,
}) => {
  return (
    <div className="tab-panel docentes-list-panel">
      <div className="table-container">
        <div className="section-header">
          <h2 className="title-with-icon">
            <AppIcon icon={GraduationCap} size={20} />
            <span>Docentes Registrados</span>
          </h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={onCreateClick}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>Nuevo docente</span>
                </span>
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>No se pudo refrescar la lista. Se muestran los datos ya cargados.</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void cargarDocentes();
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {!canManage && (
          <div className="inline-feedback inline-feedback-info">
            <span>
              Modo consulta: puede revisar docentes y su detalle, pero no crear, desactivar,
              reactivar ni refrescar información RENACYT.
            </span>
          </div>
        )}
        <DocentesTableToolbar
          busqueda={busqueda}
          estadoFiltro={estadoFiltro}
          gradoFiltro={gradoFiltro}
          gradosDisponibles={gradosDisponibles}
          nivelesRenacytDisponibles={nivelesRenacytDisponibles}
          renacytNivelFiltro={renacytNivelFiltro}
          totalVisibles={docentesFiltrados.length}
          totalTodos={docentes.length}
          totalActivos={totalActivos}
          totalInactivos={totalInactivos}
          onBusquedaChange={onBusquedaChange}
          onEstadoFiltroChange={onEstadoFiltroChange}
          onGradoFiltroChange={onGradoFiltroChange}
          onRenacytNivelFiltroChange={onRenacytNivelFiltroChange}
        />
        <DocentesTableGrid
          docentes={docentesFiltrados}
          loading={loading}
          onView={onOpenDetail}
          onRefreshRenacyt={(id: string) => {
            handleRefreshRenacytFormaciones(id);
          }}
          onReactivate={(id: string) => {
            handleReactivarDocente(id);
          }}
          onDeactivate={onDeactivate}
          refreshingRenacytDocenteId={refreshingRenacytDocenteId}
          canManage={canManage}
        />
      </div>

      {canManage && (
        <ConfirmDialog
          open={Boolean(docenteToDelete)}
          title="Desactivar docente"
          message={`¿Desea desactivar al docente "${docenteToDelete?.nombres_apellidos ?? ""}"? Su historial y relaciones se conservarán para mantener la trazabilidad.`}
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
