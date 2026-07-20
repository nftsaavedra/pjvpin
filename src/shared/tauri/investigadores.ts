import { invoke } from "./client";
import type {
  CreateInvestigadorRenacytPayload,
  EliminarInvestigadorResultado,
  Investigador,
  InvestigadorDetalle,
  RefreshInvestigadorRenacytFormacionResultado,
  RenacytLookupResult,
  ReniecDniLookupResult,
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
  return await invoke("crear_investigador", {
    request: {
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
  codigoOId: string,
): Promise<RenacytLookupResult> => {
  return await invoke("consultar_renacyt_investigador", { codigoOId });
};

export const getAllInvestigadoresConProyectos = async (): Promise<InvestigadorDetalle[]> => {
  return await invoke("get_all_investigadores_con_proyectos");
};

export const eliminarInvestigador = async (
  idInvestigador: string,
): Promise<EliminarInvestigadorResultado> => {
  return await invoke("eliminar_investigador", { idInvestigador });
};

export const reactivarInvestigador = async (idInvestigador: string): Promise<Investigador> => {
  return await invoke("reactivar_investigador", { idInvestigador });
};

export const refrescarFormacionAcademicaRenacytInvestigador = async (
  idInvestigador: string,
): Promise<RefreshInvestigadorRenacytFormacionResultado> => {
  return await invoke("refrescar_formacion_academica_renacyt_investigador", {
    idInvestigador,
  });
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
  return await invoke("actualizar_investigador", { idInvestigador, request });
};
