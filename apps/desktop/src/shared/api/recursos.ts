import { apiFetch } from "../http/client";
import type {
  Patente,
  Equipamiento,
  Financiamiento,
  PublicacionCientifica,
} from "./types";

// ── Patentes ────────────────────────────────────────────────────────────────

export interface CreatePatentePayload {
  proyecto_id?: string;
  titulo: string;
  numero_patente?: string;
  tipo?: string;
  estado?: string;
  fecha_solicitud?: number;
  fecha_concesion?: number;
  pais?: string;
  entidad_concedente?: string;
  descripcion?: string;
  clasificacion_ipc?: string;
  id_org_unit_concedente?: string;
}

export interface UpdatePatentePayload {
  titulo?: string;
  numero_patente?: string;
  tipo?: string;
  estado?: string;
  fecha_solicitud?: number;
  fecha_concesion?: number;
  pais?: string;
  entidad_concedente?: string;
  descripcion?: string;
  clasificacion_ipc?: string;
  id_org_unit_concedente?: string;
}

export const crearPatente = async (request: CreatePatentePayload): Promise<Patente> => {
  return apiFetch("/patentes", { method: "POST", body: request });
};

export const getPatentesProyecto = async (proyecto_id: string): Promise<Patente[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyecto_id)}/patentes`);
};

export const actualizarPatente = async (
  id_patente: string,
  request: UpdatePatentePayload,
): Promise<Patente> => {
  return apiFetch(`/patentes/${encodeURIComponent(id_patente)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarPatente = async (id_patente: string): Promise<void> => {
  await apiFetch(`/patentes/${encodeURIComponent(id_patente)}`, { method: "DELETE" });
};

// ── Software ────────────────────────────────────────────────────────────────

export interface CreateSoftwarePayload {
  titulo: string;
  tipo?: string;
  id_proyecto?: string;
  resumen?: string;
  doi?: string;
  fecha_publicacion?: number;
  idioma?: string;
  acceso_abierto?: string;
  palabras_clave?: string[];
}

export interface UpdateSoftwarePayload {
  titulo?: string;
  tipo?: string;
  id_proyecto?: string;
  resumen?: string;
  doi?: string;
  fecha_publicacion?: number;
  idioma?: string;
  acceso_abierto?: string;
  palabras_clave?: string[];
}

export const crearSoftware = async (
  request: CreateSoftwarePayload,
): Promise<PublicacionCientifica> => {
  return apiFetch("/publicaciones", { method: "POST", body: request });
};

export const getSoftwareProyecto = async (
  id_proyecto: string,
): Promise<PublicacionCientifica[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(id_proyecto)}/software`);
};

export const actualizarSoftware = async (
  id_publicacion: string,
  request: UpdateSoftwarePayload,
): Promise<PublicacionCientifica> => {
  return apiFetch(`/publicaciones/${encodeURIComponent(id_publicacion)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarSoftware = async (id_publicacion: string): Promise<void> => {
  await apiFetch(`/publicaciones/${encodeURIComponent(id_publicacion)}`, { method: "DELETE" });
};

// ── Equipamientos ────────────────────────────────────────────────────────────

export interface CreateEquipamientoPayload {
  nombre: string;
  descripcion?: string;
  especificaciones?: string;
  valor_estimado?: number;
  moneda?: string;
  proveedor?: string;
  fecha_adquisicion?: number;
  codigo_institucional?: string;
  tipo_equipamiento?: string;
  uso_equipamiento?: string;
  id_org_unit_propietaria?: string;
  id_financiamiento?: string;
}

export interface UpdateEquipamientoPayload {
  nombre?: string;
  descripcion?: string;
  especificaciones?: string;
  valor_estimado?: number;
  moneda?: string;
  proveedor?: string;
  fecha_adquisicion?: number;
  codigo_institucional?: string;
  tipo_equipamiento?: string;
  uso_equipamiento?: string;
  id_org_unit_propietaria?: string;
  id_financiamiento?: string;
}

export const crearEquipamiento = async (
  request: CreateEquipamientoPayload,
): Promise<Equipamiento> => {
  return apiFetch("/equipamientos", { method: "POST", body: request });
};

export const getEquipamientosProyecto = async (proyecto_id: string): Promise<Equipamiento[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyecto_id)}/equipamientos`);
};

export const actualizarEquipamiento = async (
  id_equipamiento: string,
  request: UpdateEquipamientoPayload,
): Promise<Equipamiento> => {
  return apiFetch(`/equipamientos/${encodeURIComponent(id_equipamiento)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarEquipamiento = async (id_equipamiento: string): Promise<void> => {
  await apiFetch(`/equipamientos/${encodeURIComponent(id_equipamiento)}`, { method: "DELETE" });
};

// ── Financiamientos ──────────────────────────────────────────────────────────

export interface CreateFinanciamientoPayload {
  codigo: string;
  nombre?: string;
  modalidad?: string;
  id_org_unit_financiadora?: string;
  parent_id?: string;
  tipo?: string;
  monto?: number;
  moneda?: string;
  fecha_inicio?: number;
  fecha_fin?: number;
  descripcion?: string;
  estado_financiero?: string;
}

export interface UpdateFinanciamientoPayload {
  codigo?: string;
  nombre?: string;
  modalidad?: string;
  id_org_unit_financiadora?: string;
  parent_id?: string;
  tipo?: string;
  monto?: number;
  moneda?: string;
  fecha_inicio?: number;
  fecha_fin?: number;
  descripcion?: string;
  estado_financiero?: string;
}

export const crearFinanciamiento = async (
  request: CreateFinanciamientoPayload,
): Promise<Financiamiento> => {
  return apiFetch("/financiamientos", { method: "POST", body: request });
};

export const getFinanciamientosProyecto = async (
  proyecto_id: string,
): Promise<Financiamiento[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyecto_id)}/financiamientos-recursos`);
};

export const actualizarFinanciamiento = async (
  id_financiamiento: string,
  request: UpdateFinanciamientoPayload,
): Promise<Financiamiento> => {
  return apiFetch(`/financiamientos/${encodeURIComponent(id_financiamiento)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarFinanciamiento = async (id_financiamiento: string): Promise<void> => {
  await apiFetch(`/financiamientos/${encodeURIComponent(id_financiamiento)}`, { method: "DELETE" });
};
