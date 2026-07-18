import React from "react";
import { GraduationCap, Plus } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { InvestigadoresTableGrid } from "./InvestigadoresTableGrid";
import { InvestigadoresTableToolbar } from "./InvestigadoresTableToolbar";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";
import { EmptyState } from "@/shared/ui/EmptyState";
import { messages } from "@/shared/feedback/messages";

interface InvestigadoresListViewProps {
  canManage: boolean;
  busqueda: string;
  cargarInvestigadores: () => Promise<void>;
  hasActiveFilters: boolean;
  investigadorToDelete: InvestigadorDetalle | null;
  investigadores: InvestigadorDetalle[];
  investigadoresFiltrados: InvestigadorDetalle[];
  error: string | null;
  estadoFiltro: "todos" | "activos" | "inactivos";
  gradoFiltro: string;
  gradosDisponibles: string[];
  handleRefreshRenacytFormaciones: (id: string) => void;
  handleReactivarInvestigador: (id: string) => void;
  limpiarFiltros: () => void;
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
  hasActiveFilters,
  investigadorToDelete,
  investigadores,
  investigadoresFiltrados,
  error,
  estadoFiltro,
  gradoFiltro,
  gradosDisponibles,
  handleRefreshRenacytFormaciones,
  handleReactivarInvestigador,
  limpiarFiltros,
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
            <span>{messages.investigadores.list.sectionTitle}</span>
          </h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={onCreateClick}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>{messages.investigadores.list.nuevoInvestigador}</span>
                </span>
              </button>
            </div>
          )}
        </div>
        {!canManage && (
          <div className="inline-feedback inline-feedback-info">
            <span>{messages.investigadores.list.modoConsulta}</span>
          </div>
        )}
        {error ? (
          <EmptyState
            variant="error"
            message={messages.ui.errorCarga("investigadores")}
            actionLabel={messages.ui.reintentar}
            onAction={() => {
              void cargarInvestigadores();
            }}
            data-testid="investigadores-empty-error"
          />
        ) : (
          <>
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
              hasActiveFilters={hasActiveFilters}
              investigadores={investigadoresFiltrados}
              loading={loading}
              onClearFilters={limpiarFiltros}
              onCreateClick={onCreateClick}
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
          </>
        )}
      </div>

      {canManage && (
        <ConfirmDialog
          open={Boolean(investigadorToDelete)}
          title={messages.investigadores.list.desactivarDialog.title}
          message={messages.investigadores.list.desactivarDialog.message(
            investigadorToDelete?.nombres_apellidos ?? "",
          )}
          confirmText={messages.investigadores.list.desactivarDialog.confirmText}
          cancelText={messages.ui.cancelar}
          onConfirm={() => {
            onConfirmDelete();
          }}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
};
