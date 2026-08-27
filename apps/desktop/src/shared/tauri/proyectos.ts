import { invoke } from "./client";
import type { EliminarProyectoResultado, Proyecto, ProyectoDetalle } from "./types";

export interface ProyectoParticipantesPayload {
  tituloProyecto: string;
  investigadoresIds: string[];
  investigadorResponsableId?: string | null;
}

export const crearProyectoConParticipantes = async (
  tituloProyecto: string,
  investigadoresIds: string[],
  investigadorResponsableId?: string | null,
): Promise<Proyecto> => {
  return await invoke("crear_proyecto_con_participantes", {
    request: {
      tituloProyecto,
      investigadoresIds,
      investigadorResponsableId,
    },
  });
};

export const actualizarProyectoConParticipantes = async (
  idProyecto: string,
  payload: ProyectoParticipantesPayload,
): Promise<Proyecto> => {
  return await invoke("actualizar_proyecto_con_participantes", {
    idProyecto,
    request: payload,
  });
};

export const buscarProyectosPorInvestigador = async (
  idInvestigador: string,
): Promise<Proyecto[]> => {
  return await invoke("buscar_proyectos_por_investigador", { idInvestigador });
};

export const getAllProyectosDetalle = async (): Promise<ProyectoDetalle[]> => {
  return await invoke("get_all_proyectos_detalle");
};

export const eliminarRelacionProyectoInvestigador = async (
  idProyecto: string,
  idInvestigador: string,
): Promise<void> => {
  await invoke("eliminar_relacion_proyecto_investigador", {
    idProyecto,
    idInvestigador,
  });
};

export const eliminarRelacionesProyecto = async (idProyecto: string): Promise<void> => {
  await invoke("eliminar_relaciones_proyecto", { idProyecto });
};

export const eliminarProyecto = async (idProyecto: string): Promise<EliminarProyectoResultado> => {
  return await invoke("eliminar_proyecto", { idProyecto });
};

export const reactivarProyecto = async (idProyecto: string): Promise<Proyecto> => {
  return await invoke("reactivar_proyecto", { idProyecto });
};
