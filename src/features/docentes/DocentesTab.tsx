import React, { useState } from "react";
import { useDocentesTable } from "./hooks/useDocentesTable";
import { DocentesListView } from "./components/DocentesListView";
import { DocenteFormScreen } from "./components/DocenteFormScreen";
import { DocenteDetailScreen } from "./components/DocenteDetailScreen";
import type { DocenteDetalle } from "./api";

type DocentesView = "list" | "create" | "detail";

interface DocentesTabProps {
  canManage: boolean;
  refreshTrigger?: number;
  onDataModified: () => void;
}

export const DocentesTab: React.FC<DocentesTabProps> = ({
  canManage,
  refreshTrigger = 0,
  onDataModified,
}) => {
  const [view, setView] = useState<DocentesView>("list");
  const [selectedDocente, setSelectedDocente] = useState<DocenteDetalle | null>(null);

  const table = useDocentesTable(refreshTrigger);

  const handleOpenCreate = () => {
    setSelectedDocente(null);
    setView("create");
  };

  const handleOpenDetail = (docente: DocenteDetalle) => {
    setSelectedDocente(docente);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedDocente(null);
  };

  const handleDocenteCreated = () => {
    onDataModified();
    handleBackToList();
  };

  if (view === "list") {
    return (
      <DocentesListView
        canManage={canManage}
        busqueda={table.busqueda}
        cargarDocentes={table.cargarDocentes}
        docenteToDelete={table.docenteToDelete}
        docentes={table.docentes}
        docentesFiltrados={table.docentesFiltrados}
        error={table.error}
        estadoFiltro={table.estadoFiltro}
        gradoFiltro={table.gradoFiltro}
        gradosDisponibles={table.gradosDisponibles}
        handleRefreshRenacytFormaciones={(id: string) => {
          void table.handleRefreshRenacytFormaciones(id);
        }}
        handleReactivarDocente={(id: string) => {
          void table.handleReactivarDocente(id);
        }}
        loading={table.loading}
        nivelesRenacytDisponibles={table.nivelesRenacytDisponibles}
        renacytNivelFiltro={table.renacytNivelFiltro}
        refreshingRenacytDocenteId={table.refreshingRenacytDocenteId}
        totalActivos={table.totalActivos}
        totalInactivos={table.totalInactivos}
        onBusquedaChange={table.setBusqueda}
        onEstadoFiltroChange={table.setEstadoFiltro}
        onGradoFiltroChange={table.setGradoFiltro}
        onRenacytNivelFiltroChange={table.setRenacytNivelFiltro}
        onDeactivate={table.setDocenteToDelete}
        onConfirmDelete={() => {
          table.handleEliminarDocente().catch(() => {});
        }}
        onCancelDelete={() => {
          table.setDocenteToDelete(null);
        }}
        onCreateClick={handleOpenCreate}
        onOpenDetail={handleOpenDetail}
      />
    );
  }

  if (view === "create") {
    return (
      <DocenteFormScreen
        refreshTrigger={refreshTrigger}
        onBack={handleBackToList}
        onDocenteCreated={handleDocenteCreated}
      />
    );
  }

  // view === "detail"
  if (selectedDocente) {
    return (
      <DocenteDetailScreen
        docente={selectedDocente}
        canRefreshRenacyt={canManage}
        canSyncPure={canManage}
        onBack={handleBackToList}
        onRefreshRenacytFormaciones={(id: string) => {
          table.handleRefreshRenacytFormaciones(id).catch(() => {});
        }}
        isRefreshingRenacyt={table.refreshingRenacytDocenteId === selectedDocente.id_docente}
      />
    );
  }

  handleBackToList();
  return null;
};
