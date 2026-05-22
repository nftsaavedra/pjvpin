import { useEffect, useMemo, useState } from "react";
import { useFetchDocentes } from "../../docentes/hooks/useFetchDocentes";
import { useProyectosCrud } from "./useProyectosCrud";
import { useProyectosRecursos } from "./useProyectosRecursos";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "@/services/tauri/error";
import type { ProyectoDetalle, ProyectoParticipantesPayload } from "../api";

export const useProyectosTab = (refreshTrigger = 0, onProyectoCreated: () => void) => {
  const [titulo, setTitulo] = useState("");
  const [docentesSeleccionados, setDocentesSeleccionados] = useState<string[]>([]);
  const [docenteResponsableId, setDocenteResponsableId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState<ProyectoDetalle | null>(null);
  const [proyectoToEdit, setProyectoToEdit] = useState<ProyectoDetalle | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("activos");
  const [busqueda, setBusqueda] = useState("");

  const {
    proyectos,
    loading: loadingProyectos,
    refreshing: _refreshingProyectos,
    proyectosError,
    cargarProyectos,
    handleCreate: crudHandleCreate,
    handleUpdate: crudHandleUpdate,
    handleDelete: crudHandleDelete,
    handleReactivate: crudHandleReactivate,
  } = useProyectosCrud(refreshTrigger, onProyectoCreated);

  const recursos = useProyectosRecursos(proyectoToEdit?.id_proyecto);

  useEffect(() => {
    const pid = proyectoToEdit?.id_proyecto;
    if (!pid) {
      recursos.resetearRecursos();
      return;
    }
    void recursos.cargarRecursos(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoToEdit?.id_proyecto]);

  const {
    docentes,
    loading: loadingDocentes,
    refreshing: refreshingDocentes,
  } = useFetchDocentes(refreshTrigger);

  const resetForm = (): void => {
    setTitulo("");
    setDocentesSeleccionados([]);
    setDocenteResponsableId(null);
    recursos.resetearRecursos();
  };

  const handleChangeDocentesSeleccionados = (ids: string[]): void => {
    setDocentesSeleccionados(ids);
    setDocenteResponsableId((current) => {
      if (ids.length === 0) {
        return null;
      }
      if (current && ids.includes(current)) {
        return current;
      }
      return ids[0] ?? null;
    });
  };

  const handleOpenCreate = (): void => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = (): void => {
    if (isLoading) return;
    resetForm();
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.warning("Ingrese el título del proyecto");
      return;
    }

    if (docentesSeleccionados.length === 0) {
      toast.warning("Seleccione al menos un docente");
      return;
    }

    if (!docenteResponsableId) {
      toast.warning("Seleccione un docente responsable para el proyecto");
      return;
    }

    setIsLoading(true);
    try {
      const proyecto = await crudHandleCreate(titulo, docentesSeleccionados, docenteResponsableId);
      await recursos.crearRecursosParaProyecto(proyecto.id_proyecto);

      toast.success("Proyecto creado exitosamente");
      resetForm();
      setIsFormOpen(false);
      onProyectoCreated();
      await cargarProyectos();
    } catch (error) {
      toast.error("Error al crear proyecto: " + getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleActualizarProyecto = async (
    idProyecto: string,
    payload: ProyectoParticipantesPayload,
  ): Promise<void> => {
    await crudHandleUpdate(idProyecto, payload);
    setProyectoToEdit(null);
  };

  const handleEliminarProyecto = async (): Promise<void> => {
    if (!proyectoToDelete) return;
    try {
      await crudHandleDelete(proyectoToDelete.id_proyecto);
      setProyectoToDelete(null);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const handleReactivarProyecto = async (id: string): Promise<void> => {
    try {
      await crudHandleReactivate(id);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const totalActivos = useMemo(
    () => proyectos.filter((proyecto) => proyecto.activo === 1).length,
    [proyectos],
  );
  const totalInactivos = useMemo(
    () => proyectos.filter((proyecto) => proyecto.activo === 0).length,
    [proyectos],
  );

  const proyectosFiltrados = useMemo(
    () =>
      proyectos
        .filter((proyecto) => {
          if (estadoFiltro === "activos") return proyecto.activo === 1;
          if (estadoFiltro === "inactivos") return proyecto.activo === 0;
          return true;
        })
        .filter((proyecto) => {
          const texto = busqueda.trim().toLowerCase();
          if (!texto) return true;
          return (
            proyecto.titulo_proyecto.toLowerCase().includes(texto) ||
            (proyecto.docente_responsable || "").toLowerCase().includes(texto) ||
            (proyecto.docentes || "").toLowerCase().includes(texto)
          );
        }),
    [busqueda, estadoFiltro, proyectos],
  );

  return {
    busqueda,
    docentes,
    docenteResponsableId,
    docentesSeleccionados,
    estadoFiltro,
    handleCloseForm,
    handleActualizarProyecto,
    handleChangeDocentesSeleccionados,
    handleEliminarProyecto,
    handleOpenCreate,
    handleReactivarProyecto,
    handleSubmit,
    isFormOpen,
    isLoading,
    loadingDocentes,
    loadingProyectos,
    proyectoToDelete,
    proyectoToEdit,
    proyectos,
    proyectosError,
    proyectosFiltrados,
    refreshingDocentes,
    setBusqueda,
    setDocenteResponsableId,
    setEstadoFiltro,
    setProyectoToDelete,
    setProyectoToEdit,
    setTitulo,
    titulo,
    totalActivos,
    totalInactivos,
    cargarProyectos,
    patentes: recursos.patentes,
    productos: recursos.productos,
    equipamientos: recursos.equipamientos,
    financiamientos: recursos.financiamientos,
    handlePatentesChange: recursos.handlePatentesChange,
    handleProductosChange: recursos.handleProductosChange,
    handleEquipamientosChange: recursos.handleEquipamientosChange,
    handleFinanciamientosChange: recursos.handleFinanciamientosChange,
  };
};
