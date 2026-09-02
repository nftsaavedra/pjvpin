import { apiFetch } from "../http/client";
import type { GrupoInvestigacion } from "./types";

export interface CreateGrupoPayload {
  nombre: string;
  descripcion?: string | null;
  coordinador_id?: string | null;
  lineas_investigacion: string[];
}

export interface UpdateGrupoPayload {
  nombre: string;
  descripcion?: string | null;
  coordinador_id?: string | null;
  lineas_investigacion: string[];
}

export const getAllGrupos = async (): Promise<GrupoInvestigacion[]> => {
  return apiFetch("/grupos");
};

export const getGrupo = async (id_grupo: string): Promise<GrupoInvestigacion> => {
  return apiFetch(`/grupos/${encodeURIComponent(id_grupo)}`);
};

export const createGrupo = async (request: CreateGrupoPayload): Promise<GrupoInvestigacion> => {
  return apiFetch("/grupos", { method: "POST", body: request });
};

export const updateGrupo = async (
  id_grupo: string,
  request: UpdateGrupoPayload,
): Promise<GrupoInvestigacion> => {
  return apiFetch(`/grupos/${encodeURIComponent(id_grupo)}`, {
    method: "PATCH",
    body: request,
  });
};

export const deleteGrupo = async (id_grupo: string): Promise<void> => {
  await apiFetch(`/grupos/${encodeURIComponent(id_grupo)}`, { method: "DELETE" });
};
