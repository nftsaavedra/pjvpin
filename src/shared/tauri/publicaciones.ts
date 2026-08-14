import { invoke } from "./client";
import type { PublicacionCientifica } from "./types";

export const crearPublicacion = async (request: {
  titulo: string;
  doi?: string;
  issn?: string;
  anio?: number;
  cuartil?: string;
  tipo: string;
  resumen?: string;
  palabrasClave?: string[];
  handleUrl?: string;
  fechaPublicacion?: number;
  editorial?: string;
  idOrgUnitEditora?: string;
  revistaTitulo?: string;
  isbn?: string;
  scimagoCuartil?: string;
  wosCuartil?: string;
  esRevisadoPorPares?: boolean;
  accesoAbierto?: string;
  idioma?: string;
  volumen?: string;
  numeroIssue?: string;
  paginas?: string;
  dominioOrigen?: string;
  pureUuid?: string;
  estadoPublicacion?: string;
  idProyecto?: string;
}): Promise<PublicacionCientifica> => {
  return await invoke("crear_publicacion", { request });
};

export const getAllPublicaciones = async (): Promise<PublicacionCientifica[]> => {
  return await invoke("get_all_publicaciones");
};

export const getPublicacionById = async (id: string): Promise<PublicacionCientifica> => {
  return await invoke("get_publicacion_by_id", { id });
};

export const getPublicacionesByInvestigador = async (
  investigadorId: string,
): Promise<PublicacionCientifica[]> => {
  return await invoke("get_publicaciones_by_investigador", { idInvestigador: investigadorId });
};

export const getPublicacionesByAnio = async (anio: number): Promise<PublicacionCientifica[]> => {
  return await invoke("get_publicaciones_by_anio", { anio });
};

export const actualizarPublicacion = async (
  id: string,
  request: {
    titulo?: string;
    doi?: string;
    issn?: string;
    anio?: number;
    cuartil?: string;
    tipo?: string;
    resumen?: string;
    palabrasClave?: string[];
    handleUrl?: string;
    fechaPublicacion?: number;
    editorial?: string;
    idOrgUnitEditora?: string;
    revistaTitulo?: string;
    isbn?: string;
    scimagoCuartil?: string;
    wosCuartil?: string;
    esRevisadoPorPares?: boolean;
    accesoAbierto?: string;
    idioma?: string;
    volumen?: string;
    numeroIssue?: string;
    paginas?: string;
    dominioOrigen?: string;
    pureUuid?: string;
    estadoPublicacion?: string;
    idProyecto?: string;
  },
): Promise<PublicacionCientifica> => {
  return await invoke("actualizar_publicacion", { id, request });
};

export const eliminarPublicacion = async (id: string): Promise<void> => {
  await invoke("eliminar_publicacion", { id });
};

export const reactivarPublicacion = async (id: string): Promise<PublicacionCientifica> => {
  return await invoke("reactivar_publicacion", { id });
};
