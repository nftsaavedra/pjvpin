import React, { useMemo, useState } from "react";
import { BookPlus, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useFetchGrados } from "./hooks/useFetchGrados";
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
  actualizarGrado,
  crearGrado,
  eliminarGrado,
  getTauriErrorMessage,
  reactivarGrado,
  type GradoAcademico,
} from "../api";

interface GradosTabProps {
  onGradoModified: () => void;
  refreshTrigger?: number;
}

export const GradosTab: React.FC<GradosTabProps> = ({ onGradoModified, refreshTrigger = 0 }) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editingGrado, setEditingGrado] = useState<GradoAcademico | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gradoToDelete, setGradoToDelete] = useState<GradoAcademico | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("todos");
  const [busqueda, setBusqueda] = useState("");

  const { grados, loading, refreshing, error, recargar } = useFetchGrados(refreshTrigger);

  useRefreshToast({
    refreshing,
    message: "Actualizando grados",
    toastKey: "grados-refresh",
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.warning("Ingrese el nombre del grado");
      return;
    }

    setIsLoading(true);
    try {
      if (editingGrado) {
        await actualizarGrado(editingGrado.id_grado, nombre, descripcion || undefined);
        toast.success("Grado actualizado");
      } else {
        await crearGrado(nombre, descripcion || undefined);
        toast.success("Grado creado");
      }
      setNombre("");
      setDescripcion("");
      setEditingGrado(null);
      setIsFormOpen(false);
      await recargar();
      onGradoModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (grado: GradoAcademico) => {
    setEditingGrado(grado);
    setNombre(grado.nombre);
    setDescripcion(grado.descripcion || "");
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingGrado(null);
    setNombre("");
    setDescripcion("");
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
    if (!gradoToDelete) return;
    try {
      const resultado = await eliminarGrado(gradoToDelete.id_grado);
      if (resultado.accion === "desactivado") {
        toast.info(resultado.mensaje);
      } else {
        toast.success(resultado.mensaje);
      }
      setGradoToDelete(null);
      await recargar();
      onGradoModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    }
  };

  const handleReactivar = async (id: string) => {
    try {
      await reactivarGrado(id);
      toast.success("Grado reactivado correctamente");
      await recargar();
      onGradoModified();
    } catch (error) {
      toast.error("Error: " + getTauriErrorMessage(error));
    }
  };

  const totalActivos = useMemo(() => grados.filter((grado) => grado.activo !== 0).length, [grados]);
  const totalInactivos = useMemo(
    () => grados.filter((grado) => grado.activo === 0).length,
    [grados],
  );

  const gradosFiltrados = grados
    .filter((grado) => {
      if (estadoFiltro === "activos") return grado.activo !== 0;
      if (estadoFiltro === "inactivos") return grado.activo === 0;
      return true;
    })
    .filter((grado) => {
      const texto = busqueda.trim().toLowerCase();
      if (!texto) return true;
      return (
        grado.nombre.toLowerCase().includes(texto) ||
        (grado.descripcion || "").toLowerCase().includes(texto)
      );
    });

  return (
    <div className="tab-panel">
      <div className="table-container">
        <div className="section-header">
          <h2>Grados Registrados</h2>
          <div className="section-header-actions">
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={18} />
                <span>Nuevo grado</span>
              </span>
            </button>
          </div>
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
            <div className="filter-summary">Visibles: {gradosFiltrados.length}</div>
            <StatusChip variant="total">Todos: {grados.length}</StatusChip>
            <StatusChip variant="success">Activos: {totalActivos}</StatusChip>
            <StatusChip variant="warning">Inactivos: {totalInactivos}</StatusChip>
          </div>
          <input
            className="form-input filter-search"
            placeholder="Buscar por nombre o descripción"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
            }}
            aria-label="Buscar grados por nombre o descripción"
          />
          <select
            className="form-input filter-select"
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos");
            }}
            aria-label="Filtrar grados por estado"
          >
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>
        {loading ? (
          <SkeletonTable columns={3} rows={5} />
        ) : gradosFiltrados.length > 0 ? (
          <table className="table" aria-label="Tabla de grados académicos registrados">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Descripción</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gradosFiltrados.map((grado) => (
                <tr key={grado.id_grado}>
                  <td>{grado.nombre}</td>
                  <td>{grado.descripcion || "-"}</td>
                  <td className="table-actions">
                    {grado.activo === 0 && <Badge variant="warning">Inactivo</Badge>}
                    {grado.activo === 0 && (
                      <TableActionButton
                        className="btn-primary"
                        icon={RotateCcw}
                        iconSize={18}
                        label="Reactivar grado"
                        onClick={() => {
                          void handleReactivar(grado.id_grado);
                        }}
                      />
                    )}
                    <TableActionButton
                      className="btn-edit"
                      icon={Pencil}
                      label="Editar grado"
                      onClick={() => {
                        handleEditar(grado);
                      }}
                    />
                    <TableActionButton
                      className="btn-delete"
                      icon={Trash2}
                      label="Desactivar o eliminar grado"
                      onClick={() => {
                        setGradoToDelete(grado);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">Sin resultados</div>
        )}
      </div>

      <FormModal
        open={isFormOpen}
        title={
          <span className="title-with-icon form-card-title">
            <AppIcon icon={editingGrado ? Pencil : BookPlus} size={20} />
            <span>{editingGrado ? "Editar Grado Académico" : "Crear Grado Académico"}</span>
          </span>
        }
        onClose={handleCloseForm}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        submitText={
          <span className="button-with-icon">
            <AppIcon icon={Save} size={18} />
            <span>{editingGrado ? "Actualizar" : "Crear"}</span>
          </span>
        }
        isLoading={isLoading}
      >
        <div className="p-6">
          <FormInput
            label="Nombre del Grado"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej: Licenciado"
            required
          />

          <FormInput
            label="Descripción"
            value={descripcion}
            onChange={setDescripcion}
            placeholder="Ej: Licenciatura en Ciencias"
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(gradoToDelete)}
        title="Desactivar o eliminar grado académico"
        message={`¿Eliminar "${gradoToDelete?.nombre ?? ""}"? Si tiene investigadores, se desactivará.`}
        confirmText="Sí, continuar"
        cancelText="No, cancelar"
        onConfirm={() => {
          void handleEliminar();
        }}
        onCancel={() => {
          setGradoToDelete(null);
        }}
      />
    </div>
  );
};
