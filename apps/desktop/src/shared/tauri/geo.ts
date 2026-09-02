import { apiFetch } from "../http/client";
import type { Ubigeo } from "./types";

export const obtenerUbigeos = async (): Promise<Ubigeo[]> => {
  return apiFetch("/geo/ubigeos");
};

export const obtenerUbigeosPorDepartamento = async (
  departamento: string,
): Promise<Ubigeo[]> => {
  return apiFetch("/geo/ubigeos", { query: { departamento } });
};

export const buscarUbigeos = async (prefix: string): Promise<Ubigeo[]> => {
  return apiFetch("/geo/ubigeos", { query: { prefix } });
};
