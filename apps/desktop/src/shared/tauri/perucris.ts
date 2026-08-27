import { invoke } from "./client";
import type {
  PeruCrisImportResult,
  PeruCrisPushResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  PeruCrisValidationScope,
} from "./types/perucris.types";

/**
 * Envia el modelo consolidado (CerifDocument) al endpoint de ingesta de
 * PeruCRIS (POST /cerif/ingest). Requiere api-key configurada
 * (PJVPIN_PERUCRIS_API_KEY). Sin api-key, retorna error canonico.
 */
export const enviarAPeruCris = async (): Promise<PeruCrisPushResult> => {
  return await invoke<PeruCrisPushResult>("enviar_a_perucris");
};

/**
 * Valida la sincronizacion del modelo consolidado contra la API PUBLICA
 * de PeruCRIS (HAL root, sin api-key).
 *
 * @param scope Limita la validacion a un subset ("todo" por default).
 */
export const validarAPeruCris = async (
  scope: PeruCrisValidationScope = "todo",
): Promise<PeruCrisValidationReport> => {
  return await invoke<PeruCrisValidationReport>("validar_sincronizacion_perucris", { scope });
};

/** Valida una sola org_unit por id interno. */
export const validarOrgUnitPeruCris = async (
  idOrgUnit: string,
): Promise<PeruCrisValidationItem> => {
  return await invoke<PeruCrisValidationItem>("validar_org_unit_perucris", { idOrgUnit });
};

/** Valida una sola publicacion por id interno. */
export const validarPublicacionPeruCris = async (
  idPublicacion: string,
): Promise<PeruCrisValidationItem> => {
  return await invoke<PeruCrisValidationItem>("validar_publicacion_perucris", { idPublicacion });
};

/**
 * Importa los proyectos y publicaciones de UNF desde PeruCRIS. Requiere
 * RUC configurado (en el orgunit matriz o en el wizard) para Phase A;
 * los DNIs de investigadores locales alimentan Phase B (vinculacion
 * de autores). Dedupe global por perucris_uuid. Sin api-key.
 */
export const importarInicialesPeruCris = async (): Promise<PeruCrisImportResult> => {
  return await invoke<PeruCrisImportResult>("importar_iniciales_perucris");
};
