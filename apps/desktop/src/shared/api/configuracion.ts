import { apiFetch } from "../http/client";
import type {
  CatalogoItem,
  EliminarCatalogoResultado,
  EliminarGradoResultado,
  GradoAcademico,
  Persona,
  ReniecDniLookupResult,
  Usuario,
} from "./types";

export const getAllGrados = async (): Promise<GradoAcademico[]> => {
  return apiFetch("/grados");
};

export const crearGrado = async (nombre: string, descripcion?: string): Promise<GradoAcademico> => {
  return apiFetch("/grados", { method: "POST", body: { nombre, descripcion } });
};

export const actualizarGrado = async (
  id_grado: string,
  nombre: string,
  descripcion?: string,
): Promise<GradoAcademico> => {
  return apiFetch(`/grados/${encodeURIComponent(id_grado)}`, {
    method: "PATCH",
    body: { nombre, descripcion },
  });
};

export const eliminarGrado = async (id_grado: string): Promise<EliminarGradoResultado> => {
  return apiFetch(`/grados/${encodeURIComponent(id_grado)}`, { method: "DELETE" });
};

export const reactivarGrado = async (id_grado: string): Promise<GradoAcademico> => {
  return apiFetch(`/grados/${encodeURIComponent(id_grado)}/reactivar`, { method: "PATCH" });
};

export interface CrearUsuarioArgs {
  username: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  rol: string;
  password: string;
}

export const crearUsuario = async (args: CrearUsuarioArgs): Promise<Usuario> => {
  return apiFetch("/usuarios", {
    method: "POST",
    body: {
      username: args.username,
      dni: args.dni,
      nombres: args.nombres,
      apellido_paterno: args.apellido_paterno,
      apellido_materno: args.apellido_materno ?? null,
      rol: args.rol,
      password: args.password,
    },
  });
};

export const consultarDniParaUsuario = async (
  numero: string,
): Promise<ReniecDniLookupResult> => {
  return apiFetch("/usuarios/reniec-dni", { method: "POST", body: { numero } });
};

export const getAllUsuarios = async (): Promise<Usuario[]> => {
  return apiFetch("/usuarios");
};

export interface ActualizarUsuarioIdentidad {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
}

export const consultarPersonaDeUsuario = async (id_usuario: string): Promise<Persona> => {
  return apiFetch(`/usuarios/${encodeURIComponent(id_usuario)}/persona`);
};

export const actualizarUsuario = async (
  id_usuario: string,
  username: string,
  rol: string,
  password?: string,
  identidad?: ActualizarUsuarioIdentidad,
): Promise<Usuario> => {
  return apiFetch(`/usuarios/${encodeURIComponent(id_usuario)}`, {
    method: "PATCH",
    body: {
      username,
      rol,
      password: password?.trim() ? password : null,
      nombres: identidad?.nombres ?? null,
      apellido_paterno: identidad?.apellido_paterno ?? null,
      apellido_materno: identidad?.apellido_materno ?? null,
    },
  });
};

export const desactivarUsuario = async (id_usuario: string): Promise<Usuario> => {
  return apiFetch(`/usuarios/${encodeURIComponent(id_usuario)}/desactivar`, { method: "PATCH" });
};

export const reactivarUsuario = async (id_usuario: string): Promise<Usuario> => {
  return apiFetch(`/usuarios/${encodeURIComponent(id_usuario)}/reactivar`, { method: "PATCH" });
};

export const getCatalogos = async (tipo: string): Promise<CatalogoItem[]> => {
  return apiFetch("/catalogos", { query: { tipo } });
};

export const getAllCatalogosAdmin = async (tipo: string): Promise<CatalogoItem[]> => {
  return apiFetch("/catalogos/admin", { query: { tipo } });
};

export const crearCatalogo = async (request: {
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
}): Promise<CatalogoItem> => {
  return apiFetch("/catalogos", { method: "POST", body: request });
};

export const actualizarCatalogo = async (
  id: string,
  request: {
    tipo: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    orden?: number;
  },
): Promise<CatalogoItem> => {
  return apiFetch(`/catalogos/${encodeURIComponent(id)}`, { method: "PATCH", body: request });
};

export const eliminarCatalogo = async (id: string): Promise<EliminarCatalogoResultado> => {
  return apiFetch(`/catalogos/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const reactivarCatalogo = async (id: string): Promise<CatalogoItem> => {
  return apiFetch(`/catalogos/${encodeURIComponent(id)}/reactivar`, { method: "PATCH" });
};
