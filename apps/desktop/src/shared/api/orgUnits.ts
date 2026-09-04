import { apiFetch } from "../http/client";
import type { CreateOrgUnitRequest, OrgUnit, UpdateOrgUnitRequest } from "./types";

export const crearOrgUnit = async (request: CreateOrgUnitRequest): Promise<OrgUnit> => {
  return apiFetch("/org-units", { method: "POST", body: request });
};

export const actualizarOrgUnit = async (
  id: string,
  request: UpdateOrgUnitRequest,
): Promise<OrgUnit> => {
  return apiFetch(`/org-units/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: request,
  });
};

export const obtenerOrgUnit = async (id: string): Promise<OrgUnit> => {
  return apiFetch(`/org-units/${encodeURIComponent(id)}`);
};

export const listarOrgUnits = async (parent_id?: string | null): Promise<OrgUnit[]> => {
  return apiFetch("/org-units", { query: parent_id ? { parent_id } : undefined });
};

export const eliminarOrgUnit = async (id: string): Promise<void> => {
  await apiFetch(`/org-units/${encodeURIComponent(id)}`, { method: "DELETE" });
};
