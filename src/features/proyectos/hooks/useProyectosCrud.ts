import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/services/toast";
import {
  actualizarProyectoConParticipantes,
  crearProyectoConParticipantes,
  eliminarProyecto,
  getAllProyectosDetalle,
  reactivarProyecto,
  type ProyectoParticipantesPayload,
  type ProyectoDetalle,
} from "../api";
import type { Proyecto } from "@/services/tauri/types";

export const useProyectosCrud = (refreshTrigger: number, onProyectoCreated: () => void) => {
  const {
    data: proyectos,
    loading,
    refreshing,
    error: proyectosError,
    recargar: cargarProyectos,
  } = useStableFetchData<ProyectoDetalle[]>(
    () => getAllProyectosDetalle(),
    refreshTrigger,
    "Error cargando proyectos",
    [],
  );

  useRefreshToast({
    refreshing,
    message: "Actualizando proyectos",
    toastKey: "proyectos-refresh",
  });

  const handleCreate = async (
    titulo: string,
    investigadoresIds: string[],
    investigadorResponsableId: string,
  ): Promise<Proyecto> => {
    return await crearProyectoConParticipantes(
      titulo,
      investigadoresIds,
      investigadorResponsableId,
    );
  };

  const handleUpdate = async (
    idProyecto: string,
    payload: ProyectoParticipantesPayload,
  ): Promise<void> => {
    await actualizarProyectoConParticipantes(idProyecto, payload);
    toast.success("Proyecto actualizado correctamente");
    await cargarProyectos();
    onProyectoCreated();
  };

  const handleDelete = async (idProyecto: string): Promise<void> => {
    const resultado = await eliminarProyecto(idProyecto);
    toast.info(resultado.mensaje);
    await cargarProyectos();
    onProyectoCreated();
  };

  const handleReactivate = async (id: string): Promise<void> => {
    await reactivarProyecto(id);
    toast.success("Proyecto reactivado correctamente");
    await cargarProyectos();
    onProyectoCreated();
  };

  return {
    proyectos,
    loading,
    refreshing,
    proyectosError,
    cargarProyectos,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleReactivate,
  } as const;
};
