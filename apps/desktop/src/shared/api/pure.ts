import { apiFetch } from "../http/client";
import type {
  PublicacionCientifica,
  SyncPublicacionesResult,
  SyncReport,
  SyncReportTipo,
} from "./types";

export const sincronizarPublicacionesPure = async (
  investigador_id: string,
): Promise<SyncPublicacionesResult> => {
  return apiFetch(`/investigadores/${encodeURIComponent(investigador_id)}/pure/sync`, {
    method: "POST",
  });
};

export const getPublicacionesInvestigador = async (
  investigador_id: string,
): Promise<PublicacionCientifica[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(investigador_id)}/publicaciones`);
};

export const verificarDiferenciasPure = async (investigador_id?: string): Promise<SyncReport> => {
  return apiFetch("/pure/verificar-diferencias", {
    method: "POST",
    body: investigador_id ? { investigador_id } : {},
  });
};

export const listSyncReports = async (
  tipo?: SyncReportTipo,
  limit?: number,
): Promise<SyncReport[]> => {
  return apiFetch("/sync/reportes", {
    query: {
      ...(tipo ? { tipo } : {}),
      ...(limit ? { limit } : {}),
    },
  });
};
