import { apiFetch } from "../http/client";
import { AppError, getApiErrorMessage } from "../http/error";
import { getApiBaseUrl } from "../http/config";
import { getAccessToken } from "../http/tokenStore";
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
  id_grado: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  perfil?: "docente" | "tesista" | "alumno_egresado";
  renacyt?: CreateInvestigadorRenacytPayload | null;
}

export const crearInvestigador = async (args: CrearInvestigadorArgs): Promise<Investigador> => {
  return apiFetch("/investigadores", {
    method: "POST",
    body: {
      dni: args.dni,
      id_grado: args.id_grado,
      nombres: args.nombres,
      apellido_paterno: args.apellido_paterno,
      apellido_materno: args.apellido_materno ?? null,
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
  id_investigador: string,
): Promise<EliminarInvestigadorResultado> => {
  return apiFetch(`/investigadores/${encodeURIComponent(id_investigador)}`, {
    method: "DELETE",
  });
};

export const reactivarInvestigador = async (id_investigador: string): Promise<Investigador> => {
  return apiFetch(`/investigadores/${encodeURIComponent(id_investigador)}/reactivar`, {
    method: "PATCH",
  });
};

export const refrescarFormacionAcademicaRenacytInvestigador = async (
  id_investigador: string,
): Promise<RefreshInvestigadorRenacytFormacionResultado> => {
  return apiFetch(
    `/investigadores/${encodeURIComponent(id_investigador)}/renacyt/formacion/refrescar`,
    { method: "POST" },
  );
};

export const actualizarInvestigador = async (
  id_investigador: string,
  request: {
    nombres?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    id_grado?: string;
    grupo_investigacion_id?: string;
  },
): Promise<Investigador> => {
  return apiFetch(`/investigadores/${encodeURIComponent(id_investigador)}`, {
    method: "PATCH",
    body: request,
  });
};

export const descargarConstanciaRenacytInvestigador = async (
  id_investigador: string,
): Promise<Uint8Array> => {
  const url = `${getApiBaseUrl()}/investigadores/${encodeURIComponent(id_investigador)}/renacyt/constancia`;
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
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
  investigador_id: string;
  persona_id: string;
  fecha_evento: number;
  cambios: CambioKardex[];
  formaciones_diff?: {
    agregadas: unknown[];
    retiradas: unknown[];
    sin_detalle: boolean;
  } | null;
}

export const getKardexInvestigador = async (id_investigador: string): Promise<KardexEntry[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(id_investigador)}/kardex`);
};

export const marcarCambiosRenacytRevisados = async (
  id_investigador: string,
): Promise<Investigador> => {
  return apiFetch(
    `/investigadores/${encodeURIComponent(id_investigador)}/renacyt/cambios-revisados`,
    { method: "PATCH" },
  );
};

export const refrescarRenacytTodos = async (): Promise<RefreshMasivoRenacytResultado> => {
  return apiFetch("/investigadores/renacyt/refrescar-todos", { method: "POST" });
};
