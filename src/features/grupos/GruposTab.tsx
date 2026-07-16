import React, { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { useGruposTab } from "./hooks/useGruposTab";
import { GrupoFormModal } from "./components/GrupoFormModal";

interface GruposTabProps {
  canManage: boolean;
}

export const GruposTab: React.FC<GruposTabProps> = ({ canManage }) => {
  const {
    grupos,
    loading,
    error,
    recargar,
    formOpen,
    setFormOpen,
    editingGrupo,
    handleCreate,
    handleUpdate,
    handleDelete,
    deletingId,
    setDeletingId,
  } = useGruposTab(canManage);

  const [busqueda, setBusqueda] = useState("");

  const gruposFiltrados = useMemo(
    () =>
      grupos.filter(
        (grupo) =>
          grupo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (grupo.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase()),
      ),
    [busqueda, grupos],
  );

  const deletingGrupo = useMemo(() => {
    return deletingId ? (grupos.find((g) => g.id_grupo === deletingId) ?? null) : null;
  }, [deletingId, grupos]);

  return (
    <div className="tab-panel module-shell flex flex-col gap-4">
      <div className="table-container">
        <div className="section-header">
          <h2>Grupos de Investigación</h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={handleCreate}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>Nuevo grupo</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {!canManage && (
          <div className="inline-feedback inline-feedback-info">
            <span>
              Modo consulta: puede revisar grupos de investigación y líneas, pero no crear, editar
              ni eliminar.
            </span>
          </div>
        )}

        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>{error}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void recargar();
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="search-box">
            <AppIcon icon={Search} size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o coordinador..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
              }}
              className="search-input"
            />
          </div>
          <Badge variant="info">{gruposFiltrados.length} grupos</Badge>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
        >
          {loading ? (
            <div className="empty-state">
              <p>Cargando grupos...</p>
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="empty-state">
              <p>No hay grupos de investigación registrados</p>
              {canManage && (
                <button type="button" className="btn-secondary" onClick={handleCreate}>
                  Crear primer grupo
                </button>
              )}
            </div>
          ) : (
            gruposFiltrados.map((grupo) => (
              <div
                key={grupo.id_grupo}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm transition-all duration-300 flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 m-0">{grupo.nombre}</h3>
                    <p className="text-sm text-blue-700 font-semibold m-0">
                      {grupo.coordinador_nombre
                        ? `Coordinador: ${grupo.coordinador_nombre}`
                        : "Sin coordinador asignado"}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="p-2 rounded-lg transition-all duration-200 cursor-pointer inline-flex items-center justify-center"
                        onClick={() => {
                          handleUpdate(grupo);
                        }}
                        title="Editar grupo"
                      >
                        <AppIcon icon={Edit2} size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-lg transition-all duration-200 cursor-pointer inline-flex items-center justify-center border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium"
                        onClick={() => {
                          setDeletingId(grupo.id_grupo);
                        }}
                        title="Eliminar grupo"
                      >
                        <AppIcon icon={Trash2} size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {grupo.descripcion && (
                  <p className="text-sm text-gray-600 m-0">{grupo.descripcion}</p>
                )}

                <div className="flex flex-col gap-3 flex-1">
                  <strong className="text-sm text-gray-800">Líneas de investigación:</strong>
                  <div className="flex flex-wrap gap-2">
                    {grupo.lineas_investigacion.length > 0 ? (
                      grupo.lineas_investigacion.map((linea) => (
                        <span
                          key={linea}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                        >
                          {linea}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold italic text-gray-400">
                        Sin líneas registradas
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
                  <Badge variant={grupo.activo !== 0 ? "success" : "warning"}>
                    {grupo.activo !== 0 ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {canManage && (
        <GrupoFormModal
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
          }}
          editingGrupo={editingGrupo}
          onDataModified={() => {
            void recargar();
          }}
        />
      )}

      {canManage && (
        <ConfirmDialog
          open={Boolean(deletingId)}
          title="Eliminar grupo"
          message={`¿Está seguro de que desea eliminar el grupo "${deletingGrupo?.nombre ?? ""}"?`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          onConfirm={() => {
            void handleDelete();
          }}
          onCancel={() => {
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
};
