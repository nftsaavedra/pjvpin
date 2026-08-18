import { invoke } from "./client";
import type { PublicacionCientifica, SyncPublicacionesResult } from "./types";

export const sincronizarPublicacionesPure = async (
  investigador_id: string,
): Promise<SyncPublicacionesResult> => {
  return await invoke("sincronizar_publicaciones_pure", { investigadorId: investigador_id });
};

export const getPublicacionesInvestigador = async (
  investigador_id: string,
): Promise<PublicacionCientifica[]> => {
  return await invoke("get_publicaciones_investigador", { investigadorId: investigador_id });
};
