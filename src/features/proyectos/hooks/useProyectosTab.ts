import { useCallback, useEffect, useRef, useState } from "react";
import { useProyectosListado } from "./useProyectosListado";
import { useProyectosCrud } from "./useProyectosCrud";
import { useProyectosRecursos } from "./useProyectosRecursos";
import { useFetchDocentes } from "../../docentes/hooks/useFetchDocentes";
import { useCatalogosProyectos } from "./useCatalogosProyectos";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "@/services/tauri/error";
import type { ProyectoDetalle, ProyectoParticipantesPayload } from "../api";

export type ProyectosView = "list" | "create" | "edit" | "detail";

export const useProyectosTab = (refreshTrigger = 0, onProyectoCreated: () => void) => {
  const [view, setView] = useState<ProyectosView>("list");
  const [selectedProyectoId, setSelectedProyectoId] = useState<string | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<ProyectoDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState<ProyectoDetalle | null>(null);

  const {
    proyectos,
    loading: loadingProyectos,
    proyectosError,
    cargarProyectos,
    handleCreate: crudHandleCreate,
    handleUpdate: crudHandleUpdate,
    handleDelete: crudHandleDelete,
    handleReactivate: crudHandleReactivate,
  } = useProyectosCrud(refreshTrigger, onProyectoCreated);

  const listado = useProyectosListado(proyectos);
  const recursos = useProyectosRecursos(selectedProyectoId ?? undefined);
  const recursosRef = useRef(recursos);
  useEffect(() => {
    recursosRef.current = recursos;
  });

  const catalogos = useCatalogosProyectos();

  useEffect(() => {
    if (!selectedProyectoId) {
      recursosRef.current.resetearRecursos();
      return;
    }
    void recursosRef.current.cargarRecursos(selectedProyectoId);
  }, [selectedProyectoId]);

  const {
    docentes,
    loading: loadingDocentes,
    refreshing: refreshingDocentes,
  } = useFetchDocentes(refreshTrigger);

  const handleBackToList = useCallback((): void => {
    setView("list");
    setSelectedProyectoId(null);
    setSelectedProyecto(null);
    recursosRef.current.resetearRecursos();
  }, []);

  const handleOpenCreate = useCallback((): void => {
    recursosRef.current.resetearRecursos();
    setSelectedProyectoId(null);
    setSelectedProyecto(null);
    setView("create");
  }, []);

  const handleOpenEdit = useCallback((proyecto: ProyectoDetalle): void => {
    setSelectedProyecto(proyecto);
    setSelectedProyectoId(proyecto.id_proyecto);
    setView("edit");
  }, []);

  const handleOpenDetail = useCallback((proyecto: ProyectoDetalle): void => {
    setSelectedProyecto(proyecto);
    setSelectedProyectoId(proyecto.id_proyecto);
    setView("detail");
  }, []);

  const navigateToProyectoDetail = useCallback(
    (idProyecto: string) => {
      if (!idProyecto) {
        handleBackToList();
        return;
      }
      cargarProyectos()
        .then(() => {
          const encontrado = proyectos.find((p) => p.id_proyecto === idProyecto);
          if (encontrado) {
            setSelectedProyecto(encontrado);
            setSelectedProyectoId(encontrado.id_proyecto);
            setView("detail");
          } else {
            handleBackToList();
          }
        })
        .catch(() => {
          handleBackToList();
        });
    },
    [cargarProyectos, proyectos, handleBackToList],
  );

  const handleSubmit = async (
    titulo: string,
    docentesSeleccionados: string[],
    docenteResponsableId: string,
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const proyecto = await crudHandleCreate(titulo, docentesSeleccionados, docenteResponsableId);
      await recursosRef.current.crearRecursosParaProyecto(proyecto.id_proyecto);

      toast.success("Proyecto creado exitosamente");
      recursosRef.current.resetearRecursos();
      onProyectoCreated();
      navigateToProyectoDetail(proyecto.id_proyecto);
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
    navigateToProyectoDetail(idProyecto);
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

  return {
    catalogos,
    listado,
    proyectos,
    loadingProyectos,
    proyectosError,
    cargarProyectos,
    docentes,
    loadingDocentes,
    refreshingDocentes,
    recursos,
    view,
    selectedProyectoId,
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
  };
};
