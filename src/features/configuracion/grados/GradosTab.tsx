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
import { EmptyState } from "@/shared/ui/EmptyState";
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
    message: messages.grados.tab.refreshMessage,
    toastKey: "grados-refresh",
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.warning(messages.grados.tab.validations.ingreseNombre);
      return;
    }

    setIsLoading(true);
    try {
      if (editingGrado) {
        await actualizarGrado(editingGrado.id_grado, nombre, descripcion || undefined);
        toast.success(messages.grados.tab.success.actualizado);
      } else {
        await crearGrado(nombre, descripcion || undefined);
        toast.success(messages.grados.tab.success.creado);
      }
      setNombre("");
      setDescripcion("");
      setEditingGrado(null);
      setIsFormOpen(false);
      await recargar();
      onGradoModified();
    } catch (error) {
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(error)));
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
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(error)));
    }
  };

  const handleReactivar = async (id: string) => {
    try {
      await reactivarGrado(id);
      toast.success(messages.grados.tab.success.reactivado);
      await recargar();
      onGradoModified();
    } catch (error) {
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(error)));
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

  const hasActiveFilters = estadoFiltro !== "todos" || busqueda.trim() !== "";
  const limpiarFiltros = () => {
    setEstadoFiltro("todos");
    setBusqueda("");
  };

  return (
    <div className="tab-panel">
      <div className="table-container">
        <div className="section-header">
          <h2>Grados Registrados</h2>
          <div className="section-header-actions">
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={18} />
                <span>{messages.grados.tab.nuevoGrado}</span>
              </span>
            </button>
          </div>
        </div>
        {error ? (
          <EmptyState
            variant="error"
            message={messages.ui.errorCarga("grados")}
            actionLabel={messages.ui.reintentar}
            onAction={() => {
              void recargar();
            }}
            data-testid="grados-empty-error"
          />
        ) : (
          <>
            <div className="filter-bar">
              <div className="filter-summary-group">
                <div className="filter-summary">
                  {messages.configuracion.filter.visibles(gradosFiltrados.length)}
                </div>
                <StatusChip variant="total">
                  {messages.configuracion.filter.todos(grados.length)}
                </StatusChip>
                <StatusChip variant="success">
                  {messages.configuracion.filter.activos(totalActivos)}
                </StatusChip>
                <StatusChip variant="warning">
                  {messages.configuracion.filter.inactivos(totalInactivos)}
                </StatusChip>
              </div>
              <input
                className="form-input filter-search"
                placeholder={messages.grados.tab.searchPlaceholder}
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                }}
                aria-label={messages.grados.tab.searchAriaLabel}
              />
              <select
                className="form-input filter-select"
                value={estadoFiltro}
                onChange={(e) => {
                  setEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos");
                }}
                aria-label={messages.grados.tab.filtroEstadoAriaLabel}
              >
                <option value="todos">{messages.configuracion.filter.opciones.todos}</option>
                <option value="activos">
                  {messages.configuracion.filter.opciones.soloActivos}
                </option>
                <option value="inactivos">
                  {messages.configuracion.filter.opciones.soloInactivos}
                </option>
              </select>
            </div>
            {loading ? (
              <SkeletonTable columns={3} rows={5} />
            ) : gradosFiltrados.length > 0 ? (
              <table className="table" aria-label={messages.grados.tab.tableAriaLabel}>
                <thead>
                  <tr>
                    <th scope="col">{messages.grados.tab.columns.nombre}</th>
                    <th scope="col">{messages.grados.tab.columns.descripcion}</th>
                    <th scope="col">{messages.grados.tab.columns.acciones}</th>
                  </tr>
                </thead>
                <tbody>
                  {gradosFiltrados.map((grado) => (
                    <tr key={grado.id_grado}>
                      <td>{grado.nombre}</td>
                      <td>{grado.descripcion || "-"}</td>
                      <td className="table-actions">
                        {grado.activo === 0 && (
                          <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
                        )}
                        {grado.activo === 0 && (
                          <TableActionButton
                            className="btn-primary"
                            icon={RotateCcw}
                            iconSize={18}
                            label={messages.grados.tab.actions.reactivar}
                            onClick={() => {
                              void handleReactivar(grado.id_grado);
                            }}
                          />
                        )}
                        <TableActionButton
                          className="btn-edit"
                          icon={Pencil}
                          label={messages.grados.tab.actions.editar}
                          onClick={() => {
                            handleEditar(grado);
                          }}
                        />
                        <TableActionButton
                          className="btn-delete"
                          icon={Trash2}
                          label={messages.grados.tab.actions.desactivarEliminar}
                          onClick={() => {
                            setGradoToDelete(grado);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : hasActiveFilters ? (
              <EmptyState
                variant="filtered"
                message={messages.ui.filteredEmpty("grados")}
                actionLabel={messages.ui.emptyStateCtas.limpiarFiltros}
                onAction={limpiarFiltros}
                data-testid="grados-empty-filtered"
              />
            ) : (
              <EmptyState
                variant="empty"
                message={messages.ui.emptyState("grados")}
                actionLabel={messages.ui.emptyStateCtas.crearPrimero("grado")}
                onAction={handleOpenCreate}
                data-testid="grados-empty-initial"
              />
            )}
          </>
        )}
      </div>

      <FormModal
        open={isFormOpen}
        title={
          <span className="title-with-icon form-card-title">
            <AppIcon icon={editingGrado ? Pencil : BookPlus} size={20} />
            <span>
              {editingGrado ? messages.grados.tab.modal.editar : messages.grados.tab.modal.crear}
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
            <span>
              {editingGrado
                ? messages.configuracion.actions.actualizar
                : messages.configuracion.actions.crear}
            </span>
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
        title={messages.grados.tab.confirm.title}
        message={messages.grados.tab.confirm.message(gradoToDelete?.nombre ?? "")}
        confirmText={messages.configuracion.confirm.siContinuar}
        cancelText={messages.configuracion.confirm.noCancelar}
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
