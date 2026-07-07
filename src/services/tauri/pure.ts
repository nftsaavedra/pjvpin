import { invoke } from "./client";
import type { Publicacion, SyncPublicacionesResult } from "./types";

export const sincronizarPublicacionesPure = async (
  investigador_id: string,
): Promise<SyncPublicacionesResult> => {
  return await invoke("sincronizar_publicaciones_pure", { docenteId: investigador_id });
};

export const getPublicacionesInvestigador = async (
  investigador_id: string,
): Promise<Publicacion[]> => {
  return await invoke("get_publicaciones_investigador", { docenteId: investigador_id });
};
