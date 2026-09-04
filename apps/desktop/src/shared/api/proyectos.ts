import { apiFetch } from "../http/client";
import type { EliminarProyectoResultado, Proyecto, ProyectoDetalle } from "./types";

export interface ProyectoParticipantesPayload {
  titulo_proyecto: string;
  investigadores_ids: string[];
  investigador_responsable_id?: string | null;
}

export const crearProyectoConParticipantes = async (
  titulo_proyecto: string,
  investigadores_ids: string[],
  investigador_responsable_id?: string | null,
): Promise<Proyecto> => {
  return apiFetch("/proyectos", {
    method: "POST",
    body: { titulo_proyecto, investigadores_ids, investigador_responsable_id },
  });
};

export const actualizarProyectoConParticipantes = async (
  id_proyecto: string,
  payload: ProyectoParticipantesPayload,
): Promise<Proyecto> => {
  return apiFetch(`/proyectos/${encodeURIComponent(id_proyecto)}`, {
    method: "PATCH",
    body: payload,
  });
};

export const buscarProyectosPorInvestigador = async (
  id_investigador: string,
): Promise<Proyecto[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(id_investigador)}/proyectos`);
};

export const getAllProyectosDetalle = async (): Promise<ProyectoDetalle[]> => {
  return apiFetch("/proyectos/detalle");
};

export const eliminarRelacionProyectoInvestigador = async (
  id_proyecto: string,
  id_investigador: string,
): Promise<void> => {
  await apiFetch(
    `/proyectos/${encodeURIComponent(id_proyecto)}/participaciones/${encodeURIComponent(id_investigador)}`,
    { method: "DELETE" },
  );
};

export const eliminarRelacionesProyecto = async (id_proyecto: string): Promise<void> => {
  await apiFetch(`/proyectos/${encodeURIComponent(id_proyecto)}/participaciones`, {
    method: "DELETE",
  });
};

export const eliminarProyecto = async (
  id_proyecto: string,
): Promise<EliminarProyectoResultado> => {
  return apiFetch(`/proyectos/${encodeURIComponent(id_proyecto)}`, { method: "DELETE" });
};

export const reactivarProyecto = async (id_proyecto: string): Promise<Proyecto> => {
  return apiFetch(`/proyectos/${encodeURIComponent(id_proyecto)}/reactivar`, { method: "PATCH" });
};
