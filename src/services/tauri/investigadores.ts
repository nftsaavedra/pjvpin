import { invoke } from "./client";
import type {
  EliminarInvestigadorResultado,
  Investigador,
  InvestigadorDetalle,
  RefreshInvestigadorRenacytFormacionResultado,
  RenacytLookupResult,
  ReniecDniLookupResult,
} from "./types";

interface CreateInvestigadorRenacytPayload {
  codigo_registro: string;
  id_investigador: string;
  nivel?: string | null;
  grupo?: string | null;
  condicion?: string | null;
  fecha_informe_calificacion?: number | null;
  fecha_registro?: number | null;
  fecha_ultima_revision?: number | null;
  orcid?: string | null;
  scopus_author_id?: string | null;
  ficha_url: string;
  formaciones_academicas_json?: string | null;
}

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
  return await invoke("crear_investigador", {
    request: {
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
  return await invoke("get_all_investigadores");
};

export const buscarInvestigadorPorDni = async (dni: string): Promise<Investigador | null> => {
  return await invoke("buscar_investigador_por_dni", { dni });
};

export const buscarInvestigadorPorDniConRenacyt = async (
  dni: string,
): Promise<RenacytLookupResult | null> => {
  return await invoke("buscar_investigador_por_dni_con_renacyt", { dni });
};

export const consultarDniReniec = async (numero: string): Promise<ReniecDniLookupResult> => {
  return await invoke("consultar_dni_reniec", { numero });
};

export const consultarRenacytInvestigador = async (
  codigo_o_id: string,
): Promise<RenacytLookupResult> => {
  return await invoke("consultar_renacyt_investigador", { codigo_o_id });
};

export const getAllInvestigadoresConProyectos = async (): Promise<InvestigadorDetalle[]> => {
  return await invoke("get_all_investigadores_con_proyectos");
};

export const eliminarInvestigador = async (
  id_investigador: string,
): Promise<EliminarInvestigadorResultado> => {
  return await invoke("eliminar_investigador", { id_investigador });
};

export const reactivarInvestigador = async (id_investigador: string): Promise<Investigador> => {
  return await invoke("reactivar_investigador", { id_investigador });
};

export const refrescarFormacionAcademicaRenacytInvestigador = async (
  id_investigador: string,
): Promise<RefreshInvestigadorRenacytFormacionResultado> => {
  return await invoke("refrescar_formacion_academica_renacyt_investigador", {
    id_investigador,
  });
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
  return await invoke("actualizar_investigador", { id_investigador, request });
};
