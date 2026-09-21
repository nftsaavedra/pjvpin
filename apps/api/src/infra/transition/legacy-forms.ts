/**
 * Tolerancia transitoria de la doble forma heredada mientras el backend Rust
 * sigue siendo dueno de la BD hasta la fase H. Centralizar aqui los valores
 * legacy / nuevos para evitar literales dispersos.
 *
 * Ver docs/backend/03-shared-infraestructura.md §4 y
 * docs/backend/07-inventario-rust-bloque-e.md §5 D5.
 */

export const ENTITY_TYPE = {
  /** Forma canonical NestJS. */
  PROJECT: "proyecto",
  /** Forma legacy Rust (aceptada en lectura hasta fase H). */
  PROJECT_LEGACY: "PROJECT",
} as const;

export const ENTITY_TYPE_VALUES: ReadonlyArray<string> = [
  ENTITY_TYPE.PROJECT,
  ENTITY_TYPE.PROJECT_LEGACY,
];

/**
 * Filtro MongoDB que acepta ambas formas en la misma operacion. Usar donde
 * un servicio necesita leer o borrar campos OCDE / pivotes que pueden
 * existir con la forma legacy.
 */
export function entityTypeVariants(type: string): string[] {
  switch (type) {
    case ENTITY_TYPE.PROJECT:
      return [ENTITY_TYPE.PROJECT, ENTITY_TYPE.PROJECT_LEGACY];
    case ENTITY_TYPE.PROJECT_LEGACY:
      return [ENTITY_TYPE.PROJECT_LEGACY, ENTITY_TYPE.PROJECT];
    default:
      return [type];
  }
}

/**
 * Vocabularios del codigo: NestJS lowercase canonico, Rust legacy uppercase.
 * Usar al leer valores antiguos o al migrar docs.
 */
export function normalizeVocabCode(code: string): string {
  return code.trim();
}
