import { apiFetch } from "../http/client";
import type {
  CambioKardex,
  CreateInvestigadorRenacytPayload,
  EliminarInvestigadorResultado,
  ImportInvestigadoresResult,
  Investigador,
  InvestigadorDetalle,
  RefreshInvestigadorRenacytFormacionResultado,
  RefreshMasivoRenacytResultado,
  RenacytLookupResult,
  ReniecDniLookupResult,
  SyncPurePersonIdsResult,
} from "./types";

export interface CrearInvestigadorArgs {
  dni: string;
  idGrado: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  perfil?: "docente" | "tesista" | "alumno_egresado";
  renacyt?: CreateInvestigadorRenacytPayload | null;
}

export const crearInvestigador = async (args: CrearInvestigadorArgs): Promise<Investigador> => {
  return apiFetch("/investigadores", {
    method: "POST",
    body: {
      dni: args.dni,
      idGrado: args.idGrado,
      nombres: args.nombres,
      apellidoPaterno: args.apellidoPaterno,
      apellidoMaterno: args.apellidoMaterno ?? null,
      perfil: args.perfil ?? "docente",
      renacyt: args.renacyt ?? null,
    },
  });
};

export const getAllInvestigadores = async (): Promise<Investigador[]> => {
  return apiFetch("/investigadores");
};

export const buscarInvestigadorPorDni = async (dni: string): Promise<Investigador | null> => {
  return apiFetch(`/investigadores/dni/${encodeURIComponent(dni)}`);
};

export const buscarInvestigadorPorDniConRenacyt = async (
  dni: string,
): Promise<RenacytLookupResult | null> => {
  return apiFetch(`/investigadores/dni/${encodeURIComponent(dni)}/renacyt`);
};

export const consultarDniReniec = async (numero: string): Promise<ReniecDniLookupResult> => {
  return apiFetch(`/external/reniec/dni/${encodeURIComponent(numero)}`);
};

export const consultarRenacytInvestigador = async (
  codigoOId: string,
): Promise<RenacytLookupResult> => {
  return apiFetch(`/external/renacyt/investigador/${encodeURIComponent(codigoOId)}`);
};

export const getAllInvestigadoresConProyectos = async (): Promise<InvestigadorDetalle[]> => {
  return apiFetch("/investigadores/detalle");
};

export const eliminarInvestigador = async (
  idInvestigador: string,
): Promise<EliminarInvestigadorResultado> => {
  return apiFetch(`/investigadores/${encodeURIComponent(idInvestigador)}`, {
    method: "DELETE",
  });
};

export const reactivarInvestigador = async (idInvestigador: string): Promise<Investigador> => {
  return apiFetch(`/investigadores/${encodeURIComponent(idInvestigador)}/reactivar`, {
    method: "PATCH",
  });
};

export const refrescarFormacionAcademicaRenacytInvestigador = async (
  idInvestigador: string,
): Promise<RefreshInvestigadorRenacytFormacionResultado> => {
  return apiFetch(
    `/investigadores/${encodeURIComponent(idInvestigador)}/renacyt/formacion/refrescar`,
    { method: "POST" },
  );
};

export const actualizarInvestigador = async (
  idInvestigador: string,
  request: {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    idGrado?: string;
    grupoInvestigacionId?: string;
  },
): Promise<Investigador> => {
  return apiFetch(`/investigadores/${encodeURIComponent(idInvestigador)}`, {
    method: "PATCH",
    body: request,
  });
};

export const descargarConstanciaRenacytInvestigador = async (
  idInvestigador: string,
): Promise<Uint8Array> => {
  const url = `${(await import("../http/config")).getApiBaseUrl()}/investigadores/${encodeURIComponent(idInvestigador)}/renacyt/constancia`;
  const token = (await import("../http/tokenStore")).getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const { getApiErrorMessage } = await import("../http/error");
    const body = await res.text().catch(() => "");
    const { AppError } = await import("../http/error");
    throw new AppError(getApiErrorMessage(res.status, body));
  }
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
};

export const sincronizarPurePersonIds = async (): Promise<SyncPurePersonIdsResult> =>
  apiFetch("/pure/person-ids/sync", { method: "POST" });

export const importarInvestigadores = async (
  dnis: string[],
): Promise<ImportInvestigadoresResult> => {
  return apiFetch("/investigadores/import", { method: "POST", body: { dnis } });
};

export const getPlantillaInvestigadoresDefault = async (): Promise<string[]> => {
  return apiFetch("/investigadores/import/plantilla");
};

export interface KardexEntry {
  id: string;
  investigadorId: string;
  personaId: string;
  fechaEvento: number;
  cambios: CambioKardex[];
  formacionesDiff?: {
    agregadas: unknown[];
    retiradas: unknown[];
    sinDetalle: boolean;
  } | null;
}

export const getKardexInvestigador = async (idInvestigador: string): Promise<KardexEntry[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(idInvestigador)}/kardex`);
};

export const marcarCambiosRenacytRevisados = async (
  idInvestigador: string,
): Promise<Investigador> => {
  return apiFetch(
    `/investigadores/${encodeURIComponent(idInvestigador)}/renacyt/cambios-revisados`,
    { method: "PATCH" },
  );
};

export const refrescarRenacytTodos = async (): Promise<RefreshMasivoRenacytResultado> => {
  return apiFetch("/investigadores/renacyt/refrescar-todos", { method: "POST" });
};
