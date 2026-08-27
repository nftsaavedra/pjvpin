import { invoke } from "./client";
import type {
  PublicacionCientifica,
  SyncPublicacionesResult,
  SyncReport,
  SyncReportTipo,
} from "./types";

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

/**
 * Verificacion de doble via contra Pure (solo lectura). Sin
 * `investigador_id` compara el mapeo global de personas.
 */
export const verificarDiferenciasPure = async (investigador_id?: string): Promise<SyncReport> => {
  return await invoke("verificar_diferencias_pure", { investigadorId: investigador_id ?? null });
};

/** Historial de reportes de sincronizacion persistidos. */
export const listSyncReports = async (
  tipo?: SyncReportTipo,
  limit?: number,
): Promise<SyncReport[]> => {
  return await invoke("list_sync_reports", { tipo: tipo ?? null, limit: limit ?? null });
};
