import React from "react";
import { GraduationCap, Plus } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { InvestigadoresTableGrid } from "./InvestigadoresTableGrid";
import { InvestigadoresTableToolbar } from "./InvestigadoresTableToolbar";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";

interface InvestigadoresListViewProps {
  canManage: boolean;
  busqueda: string;
  cargarInvestigadores: () => Promise<void>;
  investigadorToDelete: InvestigadorDetalle | null;
  investigadores: InvestigadorDetalle[];
  investigadoresFiltrados: InvestigadorDetalle[];
  error: string | null;
  estadoFiltro: "todos" | "activos" | "inactivos";
  gradoFiltro: string;
  gradosDisponibles: string[];
  handleRefreshRenacytFormaciones: (id: string) => void;
  handleReactivarInvestigador: (id: string) => void;
  loading: boolean;
  nivelesRenacytDisponibles: string[];
  renacytNivelFiltro: string;
  refreshingRenacytInvestigadorId: string | null;
  totalActivos: number;
  totalInactivos: number;
  onBusquedaChange: (value: string) => void;
  onEstadoFiltroChange: (value: "todos" | "activos" | "inactivos") => void;
  onGradoFiltroChange: (value: string) => void;
  onRenacytNivelFiltroChange: (value: string) => void;
  onDeactivate: (investigador: InvestigadorDetalle) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCreateClick: () => void;
  onOpenDetail: (investigador: InvestigadorDetalle) => void;
}

export const InvestigadoresListView: React.FC<InvestigadoresListViewProps> = ({
  canManage,
  busqueda,
  cargarInvestigadores,
  investigadorToDelete,
  investigadores,
  investigadoresFiltrados,
  error,
  estadoFiltro,
  gradoFiltro,
  gradosDisponibles,
  handleRefreshRenacytFormaciones,
  handleReactivarInvestigador,
  loading,
  nivelesRenacytDisponibles,
  renacytNivelFiltro,
  refreshingRenacytInvestigadorId,
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
    <div className="tab-panel investigadores-list-panel">
      <div className="table-container">
        <div className="section-header">
          <h2 className="title-with-icon">
            <AppIcon icon={GraduationCap} size={20} />
            <span>Investigadores Registrados</span>
          </h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={onCreateClick}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>Nuevo investigador</span>
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
                void cargarInvestigadores();
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {!canManage && (
          <div className="inline-feedback inline-feedback-info">
            <span>Modo consulta: solo lectura de investigadores.</span>
          </div>
        )}
        <InvestigadoresTableToolbar
          busqueda={busqueda}
          estadoFiltro={estadoFiltro}
          gradoFiltro={gradoFiltro}
          gradosDisponibles={gradosDisponibles}
          nivelesRenacytDisponibles={nivelesRenacytDisponibles}
          renacytNivelFiltro={renacytNivelFiltro}
          totalVisibles={investigadoresFiltrados.length}
          totalTodos={investigadores.length}
          totalActivos={totalActivos}
          totalInactivos={totalInactivos}
          onBusquedaChange={onBusquedaChange}
          onEstadoFiltroChange={onEstadoFiltroChange}
          onGradoFiltroChange={onGradoFiltroChange}
          onRenacytNivelFiltroChange={onRenacytNivelFiltroChange}
        />
        <InvestigadoresTableGrid
          investigadores={investigadoresFiltrados}
          loading={loading}
          onView={onOpenDetail}
          onRefreshRenacyt={(id: string) => {
            handleRefreshRenacytFormaciones(id);
          }}
          onReactivate={(id: string) => {
            handleReactivarInvestigador(id);
          }}
          onDeactivate={onDeactivate}
          refreshingRenacytInvestigadorId={refreshingRenacytInvestigadorId}
          canManage={canManage}
        />
      </div>

      {canManage && (
        <ConfirmDialog
          open={Boolean(investigadorToDelete)}
          title="Desactivar investigador"
          message={`¿Desactivar a "${investigadorToDelete?.nombres_apellidos ?? ""}"?`}
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
