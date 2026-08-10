import { invoke } from "./client";
import type { Patente, Producto, Equipamiento, Financiamiento } from "./types";

// ── Patentes ────────────────────────────────────────────────────────────────

export interface CreatePatentePayload {
  proyectoId?: string;
  investigadorId?: string;
  titulo: string;
  numeroPatente?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: number;
  fechaConcesion?: number;
  pais?: string;
  entidadConcedente?: string;
  descripcion?: string;
}

export interface UpdatePatentePayload {
  titulo?: string;
  numeroPatente?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: number;
  fechaConcesion?: number;
  pais?: string;
  entidadConcedente?: string;
  descripcion?: string;
}

export const crearPatente = async (request: CreatePatentePayload): Promise<Patente> => {
  return await invoke("crear_patente", { request });
};

export const getPatentesProyecto = async (proyectoId: string): Promise<Patente[]> => {
  return await invoke("get_patentes_proyecto", { proyectoId });
};

export const actualizarPatente = async (
  idPatente: string,
  request: UpdatePatentePayload,
): Promise<Patente> => {
  return await invoke("actualizar_patente", { idPatente, request });
};

export const eliminarPatente = async (idPatente: string): Promise<void> => {
  await invoke("eliminar_patente", { idPatente });
};

// ── Productos ────────────────────────────────────────────────────────────────

export interface CreateProductoPayload {
  proyectoId?: string;
  investigadorId?: string;
  nombre: string;
  tipo?: string;
  etapa?: string;
  descripcion?: string;
  fechaRegistro?: number;
}

export interface UpdateProductoPayload {
  nombre?: string;
  tipo?: string;
  etapa?: string;
  descripcion?: string;
  fechaRegistro?: number;
}

export const crearProducto = async (request: CreateProductoPayload): Promise<Producto> => {
  return await invoke("crear_producto", { request });
};

export const getProductosProyecto = async (proyectoId: string): Promise<Producto[]> => {
  return await invoke("get_productos_proyecto", { proyectoId });
};

export const actualizarProducto = async (
  idProducto: string,
  request: UpdateProductoPayload,
): Promise<Producto> => {
  return await invoke("actualizar_producto", { idProducto, request });
};

export const eliminarProducto = async (idProducto: string): Promise<void> => {
  await invoke("eliminar_producto", { idProducto });
};

// ── Equipamientos ────────────────────────────────────────────────────────────

export interface CreateEquipamientoPayload {
  proyectoId?: string;
  nombre: string;
  descripcion?: string;
  especificaciones?: string;
  valorEstimado?: number;
  moneda?: string;
  proveedor?: string;
  fechaAdquisicion?: number;
}

export interface UpdateEquipamientoPayload {
  nombre?: string;
  descripcion?: string;
  especificaciones?: string;
  valorEstimado?: number;
  moneda?: string;
  proveedor?: string;
  fechaAdquisicion?: number;
}

export const crearEquipamiento = async (
  request: CreateEquipamientoPayload,
): Promise<Equipamiento> => {
  return await invoke("crear_equipamiento", { request });
};

export const getEquipamientosProyecto = async (proyectoId: string): Promise<Equipamiento[]> => {
  return await invoke("get_equipamientos_proyecto", { proyectoId });
};

export const actualizarEquipamiento = async (
  idEquipamiento: string,
  request: UpdateEquipamientoPayload,
): Promise<Equipamiento> => {
  return await invoke("actualizar_equipamiento", { idEquipamiento, request });
};

export const eliminarEquipamiento = async (idEquipamiento: string): Promise<void> => {
  await invoke("eliminar_equipamiento", { idEquipamiento });
};

// ── Financiamientos ──────────────────────────────────────────────────────────

export interface CreateFinanciamientoPayload {
  proyectoId?: string;
  entidadFinanciadora: string;
  tipo?: string;
  monto?: number;
  moneda?: string;
  fechaInicio?: number;
  fechaFin?: number;
  descripcion?: string;
  estadoFinanciero?: string;
}

export interface UpdateFinanciamientoPayload {
  entidadFinanciadora?: string;
  tipo?: string;
  monto?: number;
  moneda?: string;
  fechaInicio?: number;
  fechaFin?: number;
  descripcion?: string;
  estadoFinanciero?: string;
}

export const crearFinanciamiento = async (
  request: CreateFinanciamientoPayload,
): Promise<Financiamiento> => {
  return await invoke("crear_financiamiento", { request });
};

export const getFinanciamientosProyecto = async (proyectoId: string): Promise<Financiamiento[]> => {
  return await invoke("get_financiamientos_proyecto", { proyectoId });
};

export const actualizarFinanciamiento = async (
  idFinanciamiento: string,
  request: UpdateFinanciamientoPayload,
): Promise<Financiamiento> => {
  return await invoke("actualizar_financiamiento", { idFinanciamiento, request });
};

export const eliminarFinanciamiento = async (idFinanciamiento: string): Promise<void> => {
  await invoke("eliminar_financiamiento", { idFinanciamiento });
};
