import React from "react";
import { useProyectosTab } from "./hooks/useProyectosTab";
import { ProyectosListView } from "./components/ProyectosListView";
import { ProyectoFormScreen } from "./components/ProyectoFormScreen";
import { ProyectoDetailScreen } from "./components/ProyectoDetailScreen";

interface ProyectosTabProps {
  canManage: boolean;
  onProyectoCreated: () => void;
  refreshTrigger?: number;
}

export const ProyectosTab: React.FC<ProyectosTabProps> = ({
  canManage,
  onProyectoCreated,
  refreshTrigger = 0,
}) => {
  const {
    catalogos,
    listado,
    proyectos,
    loadingProyectos,
    proyectosError,
    docentes,
    loadingDocentes,
    refreshingDocentes,
    recursos,
    view,
    selectedProyecto,
    isLoading,
    proyectoToDelete,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDetail,
    handleBackToList,
    handleSubmit,
    handleActualizarProyecto,
    handleEliminarProyecto,
    handleReactivarProyecto,
    setProyectoToDelete,
  } = useProyectosTab(refreshTrigger, onProyectoCreated);

  if (view === "list") {
    return (
      <ProyectosListView
        canManage={canManage}
        listado={listado}
        proyectos={proyectos}
        loadingProyectos={loadingProyectos}
        proyectosError={proyectosError}
        proyectoToDelete={proyectoToDelete}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onOpenDetail={handleOpenDetail}
        onDeactivate={setProyectoToDelete}
        onReactivate={(id) => {
          void handleReactivarProyecto(id);
        }}
        onConfirmDelete={() => {
          void handleEliminarProyecto();
        }}
        onCancelDelete={() => {
          setProyectoToDelete(null);
        }}
      />
    );
  }

  if (view === "create") {
    return (
      <ProyectoFormScreen
        mode="create"
        docentes={docentes}
        loadingDocentes={loadingDocentes}
        refreshingDocentes={refreshingDocentes}
        catalogos={catalogos}
        patentes={recursos.patentesNormalizados}
        productos={recursos.productosNormalizados}
        equipamientos={recursos.equipamientosNormalizados}
        financiamientos={recursos.financiamientosNormalizados}
        isLoading={isLoading}
        onBack={handleBackToList}
        onCreate={handleSubmit}
        onUpdate={async () => {}}
        onPatentesChange={(items) => {
          void recursos.handlePatentesChange(items);
        }}
        onProductosChange={(items) => {
          void recursos.handleProductosChange(items);
        }}
        onEquipamientosChange={(items) => {
          void recursos.handleEquipamientosChange(items);
        }}
        onFinanciamientosChange={(items) => {
          void recursos.handleFinanciamientosChange(items);
        }}
      />
    );
  }

  if (view === "edit" && selectedProyecto) {
    return (
      <ProyectoFormScreen
        mode="edit"
        proyecto={selectedProyecto}
        docentes={docentes}
        loadingDocentes={loadingDocentes}
        refreshingDocentes={refreshingDocentes}
        catalogos={catalogos}
        patentes={recursos.patentesNormalizados}
        productos={recursos.productosNormalizados}
        equipamientos={recursos.equipamientosNormalizados}
        financiamientos={recursos.financiamientosNormalizados}
        isLoading={isLoading}
        onBack={handleBackToList}
        onCreate={async () => {}}
        onUpdate={async (id, payload) => {
          await handleActualizarProyecto(id, payload);
        }}
        onPatentesChange={(items) => {
          void recursos.handlePatentesChange(items);
        }}
        onProductosChange={(items) => {
          void recursos.handleProductosChange(items);
        }}
        onEquipamientosChange={(items) => {
          void recursos.handleEquipamientosChange(items);
        }}
        onFinanciamientosChange={(items) => {
          void recursos.handleFinanciamientosChange(items);
        }}
      />
    );
  }

  if (view === "detail" && selectedProyecto) {
    return (
      <ProyectoDetailScreen
        proyecto={selectedProyecto}
        patentes={recursos.patentesNormalizados}
        productos={recursos.productosNormalizados}
        equipamientos={recursos.equipamientosNormalizados}
        financiamientos={recursos.financiamientosNormalizados}
        canManage={canManage}
        onBack={handleBackToList}
        onEdit={() => {
          handleOpenEdit(selectedProyecto);
        }}
      />
    );
  }

  handleBackToList();
  return null;
};
