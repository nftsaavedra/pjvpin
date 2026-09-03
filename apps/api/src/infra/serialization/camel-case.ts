/**
 * Utilidades puras de transformación de keys snake_case ↔ camelCase.
 *
 * - Recursivas: manejan objetos anidados y arrays.
 * - Idempotentes: si una key ya está en camelCase, no la dobla-transforma.
 * - Seguras con tipos especiales: `Date`, `ObjectId`, `Buffer`, `null`, `undefined`
 *   se devuelven tal cual (sin transformar sus keys internos).
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function snakeToCamelKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(snakeToCamelKeys);
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[snakeToCamel(key)] = snakeToCamelKeys(val);
  }
  return result;
}

export function camelToSnakeKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(camelToSnakeKeys);
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[camelToSnake(key)] = camelToSnakeKeys(val);
  }
  return result;
}
