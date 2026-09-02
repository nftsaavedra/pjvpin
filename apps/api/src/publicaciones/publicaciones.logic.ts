/**
 * Validaciones puras del dominio `publicaciones`. Sin dependencias de Nest,
 * Mongo o DTOs: funciones exportadas testeadas en `publicaciones.logic.spec.ts`.
 *
 * Mantener alineado con `apps/desktop/src-tauri/src/shared/doi.rs` (port del
 * VO Doi) y con `apps/desktop/src-tauri/src/publicaciones/models.rs`
 * (validaciones de modelo Rust).
 */
import { AppError } from "../infra/errors/app-error";
import {
  CUARTILES_VALIDOS,
  ISO_639_1_REGEX,
  MAX_DOI_LENGTH,
  esAccesoAbiertoValido,
  esCuartilValido,
  esDominioOrigenValido,
  esTipoPublicacionValido,
} from "./vocab";

const DOI_PREFIX = "10.";
const DOI_PREFIX_DIGITS_INDEX = DOI_PREFIX.length;

/**
 * Valida y normaliza un DOI segun el contrato del VO Rust (`shared/doi.rs`).
 * - Trim, no vacio
 * - Longitud <= 255
 * - Prefijo `10.`
 * - Tras `"10."` solo digitos ASCII (>= 1)
 * - Sufijo no vacio y sin espacios
 * Devuelve el DOI normalizado (trim).
 */
export function validarDoi(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_DOI_LENGTH) {
    throw AppError.validation(
      `El DOI excede la longitud maxima de ${MAX_DOI_LENGTH} caracteres.`,
    );
  }
  if (!trimmed.startsWith(DOI_PREFIX)) {
    throw AppError.validation("El DOI debe comenzar con el prefijo '10.'.");
  }
  const digitsAfterPrefix = trimmed.slice(DOI_PREFIX_DIGITS_INDEX);
  if (digitsAfterPrefix.length === 0) {
    throw AppError.validation(
      "El prefijo DOI (despues de '10.') debe incluir al menos un digito.",
    );
  }
  // El primer `/` delimita el fin del prefijo numerico.
  const slashIdx = trimmed.indexOf("/");
  if (slashIdx === -1) {
    throw AppError.validation(
      "El DOI debe contener el separador '/' entre prefijo y sufijo.",
    );
  }
  const prefixDigits = trimmed.slice(DOI_PREFIX_DIGITS_INDEX, slashIdx);
  if (prefixDigits.length === 0) {
    throw AppError.validation(
      "El prefijo DOI (antes del '/') debe tener al menos un digito.",
    );
  }
  if (prefixDigits.split("").some((c) => c < "0" || c > "9")) {
    throw AppError.validation(
      "El prefijo DOI solo admite digitos despues de '10.'.",
    );
  }
  const suffix = trimmed.slice(slashIdx + 1);
  if (suffix.length === 0) {
    throw AppError.validation("El DOI debe incluir un sufijo despues del '/'.");
  }
  if (suffix.split("").some((c) => c === " " || c === "\t" || c === "\n")) {
    throw AppError.validation("El DOI no puede contener espacios en blanco.");
  }
  return trimmed;
}

/** Valida codigo ISO 639-1 (2 letras lowercase). Devuelve el valor normalizado. */
export function validarIdioma(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!ISO_639_1_REGEX.test(trimmed)) {
    throw AppError.validation(
      `El idioma '${trimmed}' no es un codigo ISO 639-1 valido (2 letras lowercase).`,
    );
  }
  return trimmed;
}

/** Valida cuartil Scimago o WOS. Devuelve el valor normalizado. */
export function validarCuartil(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!esCuartilValido(trimmed)) {
    throw AppError.validation(
      `El cuartil '${trimmed}' no esta en los cuartiles validos (${CUARTILES_VALIDOS.join(", ")}).`,
    );
  }
  return trimmed;
}

/** Valida valor de acceso_abierto. Devuelve el valor normalizado. */
export function validarAccesoAbierto(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!esAccesoAbiertoValido(trimmed)) {
    throw AppError.validation(
      `El valor de acceso_abierto '${trimmed}' no es valido.`,
    );
  }
  return trimmed;
}

/** Valida dominio_origen. Devuelve el valor normalizado. */
export function validarDominioOrigen(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    // default se aplica en service (consistente con doc 07 §3.2).
    return "MANUAL";
  }
  if (!esDominioOrigenValido(trimmed)) {
    throw AppError.validation(
      `El dominio_origen '${trimmed}' no esta en los dominios validos.`,
    );
  }
  return trimmed;
}

/** Valida tipo de publicacion. Lanza 400 si no esta en el vocabulario. */
export function validarTipoPublicacion(value: string | null | undefined): string {
  if (value == null) {
    throw AppError.validation("El tipo de publicacion es obligatorio.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw AppError.validation("El tipo de publicacion es obligatorio.");
  }
  if (!esTipoPublicacionValido(trimmed)) {
    throw AppError.validation(
      `El tipo de publicacion '${trimmed}' no esta en los tipos validos.`,
    );
  }
  return trimmed;
}

/** Valida titulo (obligatorio, trim). Devuelve el valor normalizado. */
export function validarTitulo(value: string | null | undefined): string {
  if (value == null) {
    throw AppError.validation("El titulo de la publicacion es obligatorio.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw AppError.validation("El titulo de la publicacion es obligatorio.");
  }
  return trimmed;
}

/**
 * Valida el orden de un autor en el pivot `publicacion_autores`. Segun el
 * modelo Rust: `orden >= 1`.
 */
export function validarOrdenAutor(orden: number | null | undefined): number {
  if (orden == null || !Number.isFinite(orden) || !Number.isInteger(orden)) {
    throw AppError.validation(
      "El orden del autor debe ser un entero mayor o igual a 1.",
    );
  }
  if (orden < 1) {
    throw AppError.validation(
      `El orden del autor debe ser >= 1 (recibido: ${orden}).`,
    );
  }
  return orden;
}

/** Helper de trim que devuelve string|null para campos opcionales. */
export function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}