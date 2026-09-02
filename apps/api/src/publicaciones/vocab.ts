/**
 * Vocabularios del dominio `publicaciones` (coleccion `publicaciones_cientificas`).
 *
 * Single source of truth para los enums cerrados consumidos por class-validator
 * (DTOs), por el repositorio (validaciones MongoDB) y por el servicio (reglas
 * de negocio). Mantener sincronizado con `apps/desktop/src-tauri/src/publicaciones/`
 * — divergencias rompen validaciones de entrada o el UNIQUE index de la BD.
 *
 * Convencion D3: el vocabulario canónico es union de tipos ES + legacy EN
 * (lectura tolerante; escritura validada contra todo el set).
 */

export const TIPOS_PUBLICACION_VALIDOS = [
  "articulo",
  "articulo_revista",
  "articulo_conferencia",
  "carta",
  "resena",
  "comunicacion_congreso",
  "libro",
  "capitulo_libro",
  "software",
  "tesis",
  // Legacy EN: aceptados para lectura y/o entrada directa (D3).
  "journal article",
  "conference paper",
  "letter",
  "review",
] as const;
export type PublicacionTipo = (typeof TIPOS_PUBLICACION_VALIDOS)[number];

export const CUARTILES_VALIDOS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type PublicacionCuartil = (typeof CUARTILES_VALIDOS)[number];

export const ACCESO_ABIERTO_VALIDOS = [
  "acceso_abierto",
  "solo_metadatos",
  "embargado",
] as const;
export type PublicacionAccesoAbierto = (typeof ACCESO_ABIERTO_VALIDOS)[number];

export const DOMINIOS_ORIGEN_VALIDOS = ["MANUAL", "PURE", "PERUCRIS"] as const;
export type PublicacionDominioOrigen = (typeof DOMINIOS_ORIGEN_VALIDOS)[number];

export const DEFAULT_DOMINIO_ORIGEN: PublicacionDominioOrigen = "MANUAL";

/** Regex ISO 639-1: 2 letras lowercase. */
export const ISO_639_1_REGEX = /^[a-z]{2}$/;

export const MAX_TITULO_LENGTH = 500;
export const MAX_DOI_LENGTH = 255;
export const MAX_ISSN_LENGTH = 32;
export const MAX_ISBN_LENGTH = 32;
export const MAX_REVISTA_TITULO_LENGTH = 500;
export const MAX_HANDLE_URL_LENGTH = 1000;
export const MAX_EDITORIAL_LENGTH = 255;
export const MAX_VOLUMEN_LENGTH = 32;
export const MAX_NUMERO_ISSUE_LENGTH = 32;
export const MAX_PAGINAS_LENGTH = 64;
export const MAX_RESUMEN_LENGTH = 4000;
export const MAX_PALABRA_CLAVE_LENGTH = 128;
export const MAX_PALABRAS_CLAVE = 32;
export const MAX_IDIOMA_LENGTH = 2;
export const MAX_CUARTIL_LENGTH = 4;

export function esTipoPublicacionValido(tipo: string): tipo is PublicacionTipo {
  return (TIPOS_PUBLICACION_VALIDOS as readonly string[]).includes(tipo);
}

export function esCuartilValido(cuartil: string): cuartil is PublicacionCuartil {
  return (CUARTILES_VALIDOS as readonly string[]).includes(cuartil);
}

export function esAccesoAbiertoValido(
  acceso: string,
): acceso is PublicacionAccesoAbierto {
  return (ACCESO_ABIERTO_VALIDOS as readonly string[]).includes(acceso);
}

export function esDominioOrigenValido(
  dominio: string,
): dominio is PublicacionDominioOrigen {
  return (DOMINIOS_ORIGEN_VALIDOS as readonly string[]).includes(dominio);
}