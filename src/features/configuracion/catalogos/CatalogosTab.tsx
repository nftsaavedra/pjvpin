import React, { useMemo, useState } from "react";
import { BookPlus, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useFetchCatalogos } from "./hooks/useFetchCatalogos";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import {
  actualizarCatalogo,
  crearCatalogo,
  eliminarCatalogo,
  getTauriErrorMessage,
  reactivarCatalogo,
  type CatalogoItem,
} from "../api";

interface CatalogosTabProps {
  tipo: string;
  titulo: string;
  canManage: boolean;
  onModified: () => void;
  refreshTrigger?: number;
}

export const CatalogosTab: React.FC<CatalogosTabProps> = ({
  tipo,
  titulo,
  canManage,
  onModified,
  refreshTrigger = 0,
}) => {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState("");
  const [editingItem, setEditingItem] = useState<CatalogoItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CatalogoItem | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("todos");
  const [busqueda, setBusqueda] = useState("");

  const { catalogos, loading, refreshing, error, recargar } = useFetchCatalogos(
    tipo,
    canManage,
    refreshTrigger,
  );

  useRefreshToast({
    refreshing,
    message: `Actualizando ${titulo.toLowerCase()}`,
    toastKey: `catalogos-${tipo}-refresh`,
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!codigo.trim() || !nombre.trim()) {
      toast.warning("Complete los campos obligatorios del catálogo");
      return;
    }

    const ordenNum = orden.trim() ? Number(orden.trim()) : undefined;

    setIsLoading(true);
    try {
      if (editingItem) {
        await actualizarCatalogo(editingItem.id_catalogo, {
          tipo,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          orden: ordenNum,
        });
        toast.success("Elemento actualizado");
      } else {
        await crearCatalogo({
          tipo,
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          orden: ordenNum,
        });
        toast.success("Elemento creado");
      }
      setCodigo("");
      setNombre("");
      setDescripcion("");
      setOrden("");
      setEditingItem(null);
      setIsFormOpen(false);
      await recargar();
      onModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (item: CatalogoItem) => {
    setEditingItem(item);
    setCodigo(item.codigo);
    setNombre(item.nombre);
    setDescripcion(item.descripcion || "");
    setOrden(item.orden != null ? String(item.orden) : "");
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setCodigo("");
    setNombre("");
    setDescripcion("");
    setOrden("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isLoading) return;
    resetForm();
    setIsFormOpen(false);
  };

  const handleEliminar = async () => {
    if (!itemToDelete) return;
    try {
      const resultado = await eliminarCatalogo(itemToDelete.id_catalogo);
      if (resultado.accion === "desactivado") {
        toast.info(resultado.mensaje);
      } else {
        toast.success(resultado.mensaje);
      }
      setItemToDelete(null);
      await recargar();
      onModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    }
  };

  const handleReactivar = async (id: string) => {
    try {
      await reactivarCatalogo(id);
      toast.success("Elemento reactivado correctamente");
      await recargar();
      onModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    }
  };

  const totalActivos = useMemo(
    () => catalogos.filter((item) => item.activo !== 0).length,
    [catalogos],
  );
  const totalInactivos = useMemo(
    () => catalogos.filter((item) => item.activo === 0).length,
    [catalogos],
  );

  const catalogosFiltrados = catalogos
    .filter((item) => {
      if (estadoFiltro === "activos") return item.activo !== 0;
      if (estadoFiltro === "inactivos") return item.activo === 0;
      return true;
    })
    .filter((item) => {
      const texto = busqueda.trim().toLowerCase();
      if (!texto) return true;
      return (
        item.codigo.toLowerCase().includes(texto) ||
        item.nombre.toLowerCase().includes(texto) ||
        (item.descripcion || "").toLowerCase().includes(texto)
      );
    });

  return (
    <div className="tab-panel">
      <div className="table-container">
        <div className="section-header">
          <h2>{titulo}</h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={handleOpenCreate}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>Nuevo elemento</span>
                </span>
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>{messages.ui.sinDatos}</span>
            <button type="button" className="btn-secondary" onClick={() => void recargar()}>
              Reintentar
            </button>
          </div>
        )}
        <div className="filter-bar">
          <div className="filter-summary-group">
            <div className="filter-summary">Visibles: {catalogosFiltrados.length}</div>
            <StatusChip variant="total">Todos: {catalogos.length}</StatusChip>
            <StatusChip variant="success">Activos: {totalActivos}</StatusChip>
            <StatusChip variant="warning">Inactivos: {totalInactivos}</StatusChip>
          </div>
          <input
            className="form-input filter-search"
            placeholder="Buscar por código, nombre o descripción"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
            }}
            aria-label={`Buscar en ${titulo}`}
          />
          <select
            className="form-input filter-select"
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos");
            }}
            aria-label={`Filtrar ${titulo} por estado`}
          >
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>
        {loading ? (
          <SkeletonTable columns={4} rows={5} />
        ) : catalogosFiltrados.length > 0 ? (
          <table className="table" aria-label={`Tabla de ${titulo}`}>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Descripción</th>
                {canManage && <th scope="col">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {catalogosFiltrados.map((item) => (
                <tr key={item.id_catalogo}>
                  <td>{item.codigo}</td>
                  <td>{item.nombre}</td>
                  <td>{item.descripcion || "-"}</td>
                  {canManage && (
                    <td className="table-actions">
                      {item.activo === 0 && <Badge variant="warning">Inactivo</Badge>}
                      {item.activo === 0 && (
                        <TableActionButton
                          className="btn-primary"
                          icon={RotateCcw}
                          iconSize={18}
                          label="Reactivar elemento"
                          onClick={() => {
                            void handleReactivar(item.id_catalogo);
                          }}
                        />
                      )}
                      <TableActionButton
                        className="btn-edit"
                        icon={Pencil}
                        label="Editar elemento"
                        onClick={() => {
                          handleEditar(item);
                        }}
                      />
                      <TableActionButton
                        className="btn-delete"
                        icon={Trash2}
                        label="Desactivar o eliminar elemento"
                        onClick={() => {
                          setItemToDelete(item);
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">Sin resultados</div>
        )}
      </div>

      {canManage && (
        <FormModal
          open={isFormOpen}
          title={
            <span className="title-with-icon form-card-title">
              <AppIcon icon={editingItem ? Pencil : BookPlus} size={20} />
              <span>
                {editingItem ? "Editar Elemento" : "Crear Elemento"} — {titulo}
              </span>
            </span>
          }
          onClose={handleCloseForm}
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          submitText={
            <span className="button-with-icon">
              <AppIcon icon={Save} size={18} />
              <span>{editingItem ? "Actualizar" : "Crear"}</span>
            </span>
          }
          isLoading={isLoading}
        >
          <div className="p-6">
            <FormInput
              label="Código"
              value={codigo}
              onChange={setCodigo}
              placeholder="Ej: PAT_01"
              required
            />

            <FormInput
              label="Nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="Ej: Patente de invención"
              required
            />

            <FormInput
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Descripción opcional del elemento"
            />

            <FormInput
              label="Orden"
              value={orden}
              onChange={setOrden}
              placeholder="Ej: 1"
              help="Menor número = primera posición"
            />
          </div>
        </FormModal>
      )}

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title="Desactivar o eliminar elemento"
        message={`¿Eliminar "${itemToDelete?.nombre ?? ""}" de ${titulo}? Si está en uso, se desactivará.`}
        confirmText="Sí, continuar"
        cancelText="No, cancelar"
        onConfirm={() => {
          void handleEliminar();
        }}
        onCancel={() => {
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
