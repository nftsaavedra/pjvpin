/**
 * Vocabularios del dominio `recursos` (patentes/equipamientos/financiamientos).
 *
 * Single source of truth para los enums cerrados consumidos por class-validator
 * (DTOS), por el repositorio (validaciones MongoDB) y por el servicio (reglas
 * de negocio). Mantener sincronizado con `apps/desktop/src-tauri/src/recursos/`
 * — divergencias rompen validaciones de entrada o el UNIQUE index de patentes.
 */

export const PATENTES_TIPOS_VALIDOS = [
  "invencion",
  "modelo_utilidad",
  "diseno_industrial",
] as const;
export type PatenteTipo = (typeof PATENTES_TIPOS_VALIDOS)[number];

export const TITULAR_HOLDER_TYPES_VALIDOS = ["ORG_UNIT", "PERSON"] as const;
export type TitularHolderType = (typeof TITULAR_HOLDER_TYPES_VALIDOS)[number];

/** Tipos de entidad OCDE para patentes. Coexisten ambos formatos en BD durante
 *  la transicion (NestJS lowercase vs Rust legacy uppercase). El cascade los
 *  borra con `$or` defensivo, mismo patron que proyectos (D5/D7). */
export const OCDE_ENTITY_TYPE_PATENTE_NESTJS = "patente";
export const OCDE_ENTITY_TYPE_PATENTE_RUST = "PATENT";
export const OCDE_ENTITY_TYPES_PATENTE: readonly string[] = [
  OCDE_ENTITY_TYPE_PATENTE_NESTJS,
  OCDE_ENTITY_TYPE_PATENTE_RUST,
];

export const ROL_RECURSOS_RESPONSABLE = "responsable_proyecto";

export const MAX_CODIGO_LENGTH = 64;
export const MAX_TITULO_LENGTH = 500;
export const MAX_NOMBRE_LENGTH = 255;
export const MAX_PAIS_LENGTH = 64;
export const MAX_ENTIDAD_LENGTH = 255;
export const MAX_DESCRIPCION_LENGTH = 2000;
export const MAX_ESTADO_LENGTH = 64;
export const MAX_CLASIFICACION_LENGTH = 64;
export const MAX_NUMERO_PATENTE_LENGTH = 64;
export const MAX_MODALIDAD_LENGTH = 64;

export function esPatenteTipoValido(tipo: string): tipo is PatenteTipo {
  return (PATENTES_TIPOS_VALIDOS as readonly string[]).includes(tipo);
}

export function esTitularHolderTypeValido(
  holderType: string,
): holderType is TitularHolderType {
  return (TITULAR_HOLDER_TYPES_VALIDOS as readonly string[]).includes(holderType);
}
