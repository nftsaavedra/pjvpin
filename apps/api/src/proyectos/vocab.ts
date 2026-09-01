/**
 * Vocabularios del dominio `proyectos`.
 *
 * Single source of truth para los enums cerrados consumidos por class-validator
 * (DTOS), por el repositorio (validaciones MongoDB) y por el servicio (reglas
 * de negocio). Mantener sincronizado con `apps/desktop/src-tauri/src/shared/vocab_mapper.rs`
 * — divergencias rompen validaciones de entrada o el UNIQUE index de `codigo`.
 */

export const ROLES_PARTICIPACION_VALIDOS = [
  "INVESTIGADOR_PRINCIPAL",
  "CO_INVESTIGADOR",
  "TESISTA",
  "ASISTENTE_INVESTIGACION",
  "ASISTENTE_ADMINISTRATIVO",
] as const;
export type RolParticipacion = (typeof ROLES_PARTICIPACION_VALIDOS)[number];

/** Constantes runtime para asignar `participaciones.rol` en transacciones. */
export const ROLE_INVESTIGADOR_PRINCIPAL = "INVESTIGADOR_PRINCIPAL";
export const ROLE_CO_INVESTIGADOR = "CO_INVESTIGADOR";

export const ORG_ROLES_VALIDOS = [
  "EJECUTORA",
  "CO_EJECUTORA",
  "PATROCINADORA",
  "COLABORADORA",
] as const;
export type OrgRol = (typeof ORG_ROLES_VALIDOS)[number];

/**
 * Regex ISO 4217: 3 letras ASCII uppercase. No se enumeran los ~180 codigos
 * validos (mantenible + locality): el codigo se acepta si tiene el formato
 * canonico. La validacion semantica contra el listado oficial queda como
 * integracion externa si en el futuro se requiere.
 */
const ISO_4217_REGEX = /^[A-Z]{3}$/;
export function isIso4217(code: string): boolean {
  return ISO_4217_REGEX.test(code);
}

export const DEFAULT_MONEDA = "PEN";

export const MAX_CODIGO_LENGTH = 64;
export const MAX_TITULO_LENGTH = 500;
export const MAX_ROL_LENGTH = 64;
export const PROYECTO_CODIGO_AUTOGEN_PREFIX = "PROJ";
/**
 * Hex chars randomicos del sufijo autogenerado (`PROJ-YYYY-XXXXXX`). 24 bits
 * de entropia son suficientes para unicidad dentro del set activo de proyectos
 * (el UNIQUE index de MongoDB protege contra colision residual).
 */
export const AUTOGEN_HEX_LENGTH = 6;

export function esRolParticipacionValido(rol: string): rol is RolParticipacion {
  return (ROLES_PARTICIPACION_VALIDOS as readonly string[]).includes(rol);
}

export function esOrgRolValido(rol: string): rol is OrgRol {
  return (ORG_ROLES_VALIDOS as readonly string[]).includes(rol);
}
