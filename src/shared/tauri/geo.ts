import { invoke } from "./client";
import type { Ubigeo } from "./types";

export const obtenerUbigeos = async (): Promise<Ubigeo[]> => {
  return await invoke("obtener_ubigeos");
};

export const obtenerUbigeosPorDepartamento = async (
  departamento: string,
): Promise<Ubigeo[]> => {
  return await invoke("obtener_ubigeos_por_departamento", { departamento });
};

export const buscarUbigeos = async (prefix: string): Promise<Ubigeo[]> => {
  return await invoke("buscar_ubigeos", { prefix });
};
