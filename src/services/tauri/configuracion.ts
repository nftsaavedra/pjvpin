import { invoke } from "./client";
import type {
  CatalogoItem,
  EliminarCatalogoResultado,
  EliminarGradoResultado,
  GradoAcademico,
  Usuario,
} from "./types";

export const getAllGrados = async (): Promise<GradoAcademico[]> => {
  return await invoke("get_all_grados");
};

export const crearGrado = async (nombre: string, descripcion?: string): Promise<GradoAcademico> => {
  return await invoke("crear_grado", { request: { nombre, descripcion } });
};

export const actualizarGrado = async (
  id_grado: string,
  nombre: string,
  descripcion?: string,
): Promise<GradoAcademico> => {
  return await invoke("actualizar_grado", { idGrado: id_grado, request: { nombre, descripcion } });
};

export const eliminarGrado = async (id_grado: string): Promise<EliminarGradoResultado> => {
  return await invoke("eliminar_grado", { idGrado: id_grado });
};

export const reactivarGrado = async (id_grado: string): Promise<GradoAcademico> => {
  return await invoke("reactivar_grado", { idGrado: id_grado });
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
  return await invoke("crear_usuario", {
    request: {
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
): Promise<import("./types").ReniecDniLookupResult> => {
  return await invoke("consultar_dni_para_usuario", { numero });
};

export const getAllUsuarios = async (): Promise<Usuario[]> => {
  return await invoke("get_all_usuarios");
};

export const actualizarUsuario = async (
  id_usuario: string,
  username: string,
  rol: string,
  password?: string,
): Promise<Usuario> => {
  return await invoke("actualizar_usuario", {
    idUsuario: id_usuario,
    request: { username, rol, password: password?.trim() ? password : null },
  });
};

export const desactivarUsuario = async (id_usuario: string): Promise<Usuario> => {
  return await invoke("desactivar_usuario", { idUsuario: id_usuario });
};

export const reactivarUsuario = async (id_usuario: string): Promise<Usuario> => {
  return await invoke("reactivar_usuario", { idUsuario: id_usuario });
};

export const getCatalogos = async (tipo: string): Promise<CatalogoItem[]> => {
  return await invoke("get_catalogos", { tipo });
};

export const getAllCatalogosAdmin = async (tipo: string): Promise<CatalogoItem[]> => {
  return await invoke("get_all_catalogos_admin", { tipo });
};

export const crearCatalogo = async (request: {
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
}): Promise<CatalogoItem> => {
  return await invoke("crear_catalogo", { request });
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
  return await invoke("actualizar_catalogo", { id, request });
};

export const eliminarCatalogo = async (id: string): Promise<EliminarCatalogoResultado> => {
  return await invoke("eliminar_catalogo", { id });
};

export const reactivarCatalogo = async (id: string): Promise<CatalogoItem> => {
  return await invoke("reactivar_catalogo", { id });
};
