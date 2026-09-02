/**
 * Constantes SKOS y mappers de vocabulario para el exportador CERIF.
 *
 * Port de `apps/desktop/src-tauri/src/shared/vocab_mapper.rs` (subconjunto
 * usado por cerif.rs). Los mappers se aplican en la capa DTO al exportar;
 * NO se persisten en el modelo.
 */

// ─── Entity types (entity_ocde_fields.entity_type) ──────────────────────────

export const ENTITY_TYPE_PROJECT = "PROJECT";
export const ENTITY_TYPE_EQUIPMENT = "EQUIPMENT";
export const ENTITY_TYPE_ORG_UNIT = "ORG_UNIT";
export const ENTITY_TYPE_PATENT = "PATENT";

// ─── Holder types (patente_titulares) ───────────────────────────────────────

export const HOLDER_TYPE_ORG_UNIT = "ORG_UNIT";
export const HOLDER_TYPE_PERSON = "PERSON";

// ─── SKOS mappers ───────────────────────────────────────────────────────────

/**
 * Mapea `Persona.sexo` (valores libres: "M"/"F", "Masculino"/"Femenino",
 * "hombre"/"mujer", "1"/"2") al término SKOS `concytec_terminos`.
 * Devuelve `undefined` si el valor no se reconoce.
 */
export function generoToSkos(sexo: string | null | undefined): string | undefined {
  if (!sexo) return undefined;
  const s = sexo.trim().toLowerCase();
  if (s === "m" || s === "1" || s === "masculino" || s === "hombre") return "masculino";
  if (s === "f" || s === "2" || s === "femenino" || s === "mujer") return "femenino";
  return undefined;
}

/**
 * Mapea `OrgUnit.es_publica` (boolean) al código SKOS
 * `ocde_naturaleza_institucion` ("publica" | "privada").
 */
export function naturalezaToSkos(esPublica: boolean): string {
  return esPublica ? "publica" : "privada";
}
