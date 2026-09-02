import { apiFetch } from "../http/client";
import type {
  Patente,
  Equipamiento,
  Financiamiento,
  PublicacionCientifica,
} from "./types";

// ── Patentes ────────────────────────────────────────────────────────────────

export interface CreatePatentePayload {
  proyectoId?: string;
  titulo: string;
  numeroPatente?: string;
  tipo?: string;
  estado?: string;
  fechaSolicitud?: number;
  fechaConcesion?: number;
  pais?: string;
  entidadConcedente?: string;
  descripcion?: string;
  clasificacionIpc?: string;
  idOrgUnitConcedente?: string;
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
  clasificacionIpc?: string;
  idOrgUnitConcedente?: string;
}

export const crearPatente = async (request: CreatePatentePayload): Promise<Patente> => {
  return apiFetch("/patentes", { method: "POST", body: request });
};

export const getPatentesProyecto = async (proyectoId: string): Promise<Patente[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyectoId)}/patentes`);
};

export const actualizarPatente = async (
  idPatente: string,
  request: UpdatePatentePayload,
): Promise<Patente> => {
  return apiFetch(`/patentes/${encodeURIComponent(idPatente)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarPatente = async (idPatente: string): Promise<void> => {
  await apiFetch(`/patentes/${encodeURIComponent(idPatente)}`, { method: "DELETE" });
};

// ── Software ────────────────────────────────────────────────────────────────

export interface CreateSoftwarePayload {
  titulo: string;
  tipo?: string;
  idProyecto?: string;
  resumen?: string;
  doi?: string;
  fechaPublicacion?: number;
  idioma?: string;
  accesoAbierto?: string;
  palabrasClave?: string[];
}

export interface UpdateSoftwarePayload {
  titulo?: string;
  tipo?: string;
  idProyecto?: string;
  resumen?: string;
  doi?: string;
  fechaPublicacion?: number;
  idioma?: string;
  accesoAbierto?: string;
  palabrasClave?: string[];
}

export const crearSoftware = async (
  request: CreateSoftwarePayload,
): Promise<PublicacionCientifica> => {
  return apiFetch("/publicaciones", { method: "POST", body: request });
};

export const getSoftwareProyecto = async (
  idProyecto: string,
): Promise<PublicacionCientifica[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(idProyecto)}/software`);
};

export const actualizarSoftware = async (
  idPublicacion: string,
  request: UpdateSoftwarePayload,
): Promise<PublicacionCientifica> => {
  return apiFetch(`/publicaciones/${encodeURIComponent(idPublicacion)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarSoftware = async (idPublicacion: string): Promise<void> => {
  await apiFetch(`/publicaciones/${encodeURIComponent(idPublicacion)}`, { method: "DELETE" });
};

// ── Equipamientos ────────────────────────────────────────────────────────────

export interface CreateEquipamientoPayload {
  nombre: string;
  descripcion?: string;
  especificaciones?: string;
  valorEstimado?: number;
  moneda?: string;
  proveedor?: string;
  fechaAdquisicion?: number;
  codigoInstitucional?: string;
  tipoEquipamiento?: string;
  usoEquipamiento?: string;
  idOrgUnitPropietaria?: string;
  idFinanciamiento?: string;
}

export interface UpdateEquipamientoPayload {
  nombre?: string;
  descripcion?: string;
  especificaciones?: string;
  valorEstimado?: number;
  moneda?: string;
  proveedor?: string;
  fechaAdquisicion?: number;
  codigoInstitucional?: string;
  tipoEquipamiento?: string;
  usoEquipamiento?: string;
  idOrgUnitPropietaria?: string;
  idFinanciamiento?: string;
}

export const crearEquipamiento = async (
  request: CreateEquipamientoPayload,
): Promise<Equipamiento> => {
  return apiFetch("/equipamientos", { method: "POST", body: request });
};

export const getEquipamientosProyecto = async (proyectoId: string): Promise<Equipamiento[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyectoId)}/equipamientos`);
};

export const actualizarEquipamiento = async (
  idEquipamiento: string,
  request: UpdateEquipamientoPayload,
): Promise<Equipamiento> => {
  return apiFetch(`/equipamientos/${encodeURIComponent(idEquipamiento)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarEquipamiento = async (idEquipamiento: string): Promise<void> => {
  await apiFetch(`/equipamientos/${encodeURIComponent(idEquipamiento)}`, { method: "DELETE" });
};

// ── Financiamientos ──────────────────────────────────────────────────────────

export interface CreateFinanciamientoPayload {
  codigo: string;
  nombre?: string;
  modalidad?: string;
  idOrgUnitFinanciadora?: string;
  parentId?: string;
  tipo?: string;
  monto?: number;
  moneda?: string;
  fechaInicio?: number;
  fechaFin?: number;
  descripcion?: string;
  estadoFinanciero?: string;
}

export interface UpdateFinanciamientoPayload {
  codigo?: string;
  nombre?: string;
  modalidad?: string;
  idOrgUnitFinanciadora?: string;
  parentId?: string;
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
  return apiFetch("/financiamientos", { method: "POST", body: request });
};

export const getFinanciamientosProyecto = async (
  proyectoId: string,
): Promise<Financiamiento[]> => {
  return apiFetch(`/proyectos/${encodeURIComponent(proyectoId)}/financiamientos-recursos`);
};

export const actualizarFinanciamiento = async (
  idFinanciamiento: string,
  request: UpdateFinanciamientoPayload,
): Promise<Financiamiento> => {
  return apiFetch(`/financiamientos/${encodeURIComponent(idFinanciamiento)}`, {
    method: "PATCH",
    body: request,
  });
};

export const eliminarFinanciamiento = async (idFinanciamiento: string): Promise<void> => {
  await apiFetch(`/financiamientos/${encodeURIComponent(idFinanciamiento)}`, { method: "DELETE" });
};
