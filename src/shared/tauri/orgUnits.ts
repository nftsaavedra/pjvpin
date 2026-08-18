import { invoke } from "./client";
import type { CreateOrgUnitRequest, OrgUnit, UpdateOrgUnitRequest } from "./types";

export const crearOrgUnit = async (request: CreateOrgUnitRequest): Promise<OrgUnit> => {
  return await invoke("crear_org_unit", { request });
};

export const actualizarOrgUnit = async (
  id: string,
  request: UpdateOrgUnitRequest,
): Promise<OrgUnit> => {
  return await invoke("actualizar_org_unit", { id, request });
};

export const obtenerOrgUnit = async (id: string): Promise<OrgUnit> => {
  return await invoke("obtener_org_unit", { id });
};

export const listarOrgUnits = async (parentId?: string | null): Promise<OrgUnit[]> => {
  return await invoke("listar_org_units", { parentId: parentId ?? null });
};

export const eliminarOrgUnit = async (id: string): Promise<void> => {
  await invoke("eliminar_org_unit", { id });
};
