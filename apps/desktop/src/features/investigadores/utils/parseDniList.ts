/**
 * Parsea el contenido de un textarea de DNIs en una lista deduplicada y
 * normalizada (8 dígitos, sin espacios). Devuelve por separado los DNIs
 * válidos y los inválidos para que la UI muestre un contador al usuario.
 *
 * Separadores aceptados: salto de línea, coma, espacio.
 * Vacíos / repetidos se descartan silenciosamente (la UI informa el conteo
 * para que el admin entienda qué se procesó).
 */
export interface ParseDniListResult {
  validos: string[];
  invalidos: string[];
}

export const parseDniList = (raw: string): ParseDniListResult => {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const validos: string[] = [];
  const invalidos: string[] = [];

  for (const token of tokens) {
    if (!/^\d{8}$/.test(token)) {
      invalidos.push(token);
      continue;
    }
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    validos.push(token);
  }

  return { validos, invalidos };
};
