import { apiFetch } from "../http/client";
import type {
  PeruCrisImportResult,
  PeruCrisPushResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  PeruCrisValidationScope,
} from "./types/perucris.types";

export const enviarAPeruCris = async (): Promise<PeruCrisPushResult> => {
  return apiFetch("/perucris/push", { method: "POST" });
};

export const validarAPeruCris = async (
  scope: PeruCrisValidationScope = "todo",
): Promise<PeruCrisValidationReport> => {
  return apiFetch("/perucris/validacion", { method: "POST", body: { scope } });
};

export const validarOrgUnitPeruCris = async (
  id_org_unit: string,
): Promise<PeruCrisValidationItem> => {
  return apiFetch(`/perucris/validacion/org-unit/${encodeURIComponent(id_org_unit)}`);
};

export const validarPublicacionPeruCris = async (
  id_publicacion: string,
): Promise<PeruCrisValidationItem> => {
  return apiFetch(`/perucris/validacion/publicacion/${encodeURIComponent(id_publicacion)}`);
};

export const importarInicialesPeruCris = async (): Promise<PeruCrisImportResult> => {
  return apiFetch("/perucris/import/iniciales", { method: "POST" });
};
