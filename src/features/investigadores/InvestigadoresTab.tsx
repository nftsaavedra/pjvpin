import React, { useState } from "react";
import { useInvestigadoresTable } from "./hooks/useInvestigadoresTable";
import { InvestigadoresListView } from "./components/InvestigadoresListView";
import { InvestigadorFormScreen } from "./components/InvestigadorFormScreen";
import { InvestigadorDetailScreen } from "./components/InvestigadorDetailScreen";
import type { InvestigadorDetalle } from "./api";

type InvestigadoresView = "list" | "create" | "detail";

interface InvestigadoresTabProps {
  canManage: boolean;
  refreshTrigger?: number;
  onDataModified: () => void;
}

export const InvestigadoresTab: React.FC<InvestigadoresTabProps> = ({
  canManage,
  refreshTrigger = 0,
  onDataModified,
}) => {
  const [view, setView] = useState<InvestigadoresView>("list");
  const [selectedInvestigador, setSelectedInvestigador] = useState<InvestigadorDetalle | null>(
    null,
  );

  const table = useInvestigadoresTable(refreshTrigger);

  const handleOpenCreate = () => {
    setSelectedInvestigador(null);
    setView("create");
  };

  const handleOpenDetail = (investigador: InvestigadorDetalle) => {
    setSelectedInvestigador(investigador);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedInvestigador(null);
  };

  const handleInvestigadorCreated = () => {
    onDataModified();
    handleBackToList();
  };

  if (view === "list") {
    return (
      <InvestigadoresListView
        canManage={canManage}
        busqueda={table.busqueda}
        cargarInvestigadores={table.cargarInvestigadores}
        investigadorToDelete={table.investigadorToDelete}
        investigadores={table.investigadores}
        investigadoresFiltrados={table.investigadoresFiltrados}
        error={table.error}
        estadoFiltro={table.estadoFiltro}
        gradoFiltro={table.gradoFiltro}
        gradosDisponibles={table.gradosDisponibles}
        handleRefreshRenacytFormaciones={(id: string) => {
          void table.handleRefreshRenacytFormaciones(id);
        }}
        handleReactivarInvestigador={(id: string) => {
          void table.handleReactivarInvestigador(id);
        }}
        loading={table.loading}
        nivelesRenacytDisponibles={table.nivelesRenacytDisponibles}
        renacytNivelFiltro={table.renacytNivelFiltro}
        refreshingRenacytInvestigadorId={table.refreshingRenacytInvestigadorId}
        totalActivos={table.totalActivos}
        totalInactivos={table.totalInactivos}
        onBusquedaChange={table.setBusqueda}
        onEstadoFiltroChange={table.setEstadoFiltro}
        onGradoFiltroChange={table.setGradoFiltro}
        onRenacytNivelFiltroChange={table.setRenacytNivelFiltro}
        onDeactivate={table.setInvestigadorToDelete}
        onConfirmDelete={() => {
          table.handleEliminarInvestigador().catch(() => {});
        }}
        onCancelDelete={() => {
          table.setInvestigadorToDelete(null);
        }}
        onCreateClick={handleOpenCreate}
        onOpenDetail={handleOpenDetail}
      />
    );
  }

  if (view === "create") {
    return (
      <InvestigadorFormScreen
        refreshTrigger={refreshTrigger}
        onBack={handleBackToList}
        onInvestigadorCreated={handleInvestigadorCreated}
      />
    );
  }

  // view === "detail"
  if (selectedInvestigador) {
    return (
      <InvestigadorDetailScreen
        investigador={selectedInvestigador}
        canRefreshRenacyt={canManage}
        canSyncPure={canManage}
        onBack={handleBackToList}
        onRefreshRenacytFormaciones={(id: string) => {
          table.handleRefreshRenacytFormaciones(id).catch(() => {});
        }}
        isRefreshingRenacyt={
          table.refreshingRenacytInvestigadorId === selectedInvestigador.id_docente
        }
      />
    );
  }

  handleBackToList();
  return null;
};
