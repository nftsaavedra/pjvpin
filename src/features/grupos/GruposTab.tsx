import React, { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
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
    <div className="tab-panel module-shell grupos-module">
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

        <div className="toolbar-section">
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
          <span className="badge badge-info">{gruposFiltrados.length} grupos</span>
        </div>

        <div className="grupos-grid">
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
              <div key={grupo.id_grupo} className="grupo-card">
                <div className="grupo-card-header">
                  <div>
                    <h3>{grupo.nombre}</h3>
                    <p className="grupo-coordinador">
                      {grupo.coordinador_nombre
                        ? `Coordinador: ${grupo.coordinador_nombre}`
                        : "Sin coordinador asignado"}
                    </p>
                  </div>
                  {canManage && (
                    <div className="grupo-card-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          handleUpdate(grupo);
                        }}
                        title="Editar grupo"
                      >
                        <AppIcon icon={Edit2} size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
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

                {grupo.descripcion && <p className="grupo-descripcion">{grupo.descripcion}</p>}

                <div className="grupo-lineas">
                  <strong>Líneas de investigación:</strong>
                  <div className="lineas-tags">
                    {grupo.lineas_investigacion.length > 0 ? (
                      grupo.lineas_investigacion.map((linea) => (
                        <span key={linea} className="linea-tag">
                          {linea}
                        </span>
                      ))
                    ) : (
                      <span className="linea-tag linea-tag-empty">Sin líneas registradas</span>
                    )}
                  </div>
                </div>

                <div className="grupo-footer">
                  <span className={`badge badge-${grupo.activo !== 0 ? "success" : "warning"}`}>
                    {grupo.activo !== 0 ? "Activo" : "Inactivo"}
                  </span>
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
