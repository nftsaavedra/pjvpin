import { apiFetch } from "../http/client";
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
  return apiFetch("/proyectos", {
    method: "POST",
    body: { tituloProyecto, investigadoresIds, investigadorResponsableId },
  });
};

export const actualizarProyectoConParticipantes = async (
  idProyecto: string,
  payload: ProyectoParticipantesPayload,
): Promise<Proyecto> => {
  return apiFetch(`/proyectos/${encodeURIComponent(idProyecto)}`, {
    method: "PATCH",
    body: payload,
  });
};

export const buscarProyectosPorInvestigador = async (
  idInvestigador: string,
): Promise<Proyecto[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(idInvestigador)}/proyectos`);
};

export const getAllProyectosDetalle = async (): Promise<ProyectoDetalle[]> => {
  return apiFetch("/proyectos/detalle");
};

export const eliminarRelacionProyectoInvestigador = async (
  idProyecto: string,
  idInvestigador: string,
): Promise<void> => {
  await apiFetch(
    `/proyectos/${encodeURIComponent(idProyecto)}/participaciones/${encodeURIComponent(idInvestigador)}`,
    { method: "DELETE" },
  );
};

export const eliminarRelacionesProyecto = async (idProyecto: string): Promise<void> => {
  await apiFetch(`/proyectos/${encodeURIComponent(idProyecto)}/participaciones`, {
    method: "DELETE",
  });
};

export const eliminarProyecto = async (
  idProyecto: string,
): Promise<EliminarProyectoResultado> => {
  return apiFetch(`/proyectos/${encodeURIComponent(idProyecto)}`, { method: "DELETE" });
};

export const reactivarProyecto = async (idProyecto: string): Promise<Proyecto> => {
  return apiFetch(`/proyectos/${encodeURIComponent(idProyecto)}/reactivar`, { method: "PATCH" });
};
