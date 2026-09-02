/**
 * Logica pura del modulo `sync` (1 endpoint GET read-only).
 *
 * Sin acceso a MongoDB: cada funcion recibe los parametros crudos del query
 * y devuelve el valor normalizado o lanza `AppError.validation` para los
 * casos invalidos. Esto permite testearla sin red ni fixtures.
 *
 * Port 1:1 de `sync_reportes.rs`:
 *   - `parseTipo` replica `SyncReportTipo::parse`.
 *   - `clampLimit` replica el clamp 1..100 + default 10 del comportamiento
 *     esperado del endpoint (el Rust acepta cualquier `i64`; en el API se
 *     acota por contrato UI).
 */
import { AppError } from "../infra/errors/app-error";
import {
  SYNC_REPORT_TIPO_PERUCRIS_VALIDACION,
  SYNC_REPORT_TIPO_PURE_DIFF,
  type SyncReportTipo,
} from "./dto/sync-report.dto";

export const SYNC_REPORT_DEFAULT_LIMIT = 10;
export const SYNC_REPORT_MIN_LIMIT = 1;
export const SYNC_REPORT_MAX_LIMIT = 100;

/**
 * Parsea el discriminante canonico del query `tipo`. Devuelve `null` cuando
 * el parametro llega vacio o ausente (filtro sin tipo). Lanza
 * `AppError.validation` cuando el valor no es uno de los discriminantes
 * canonicos del enum Rust.
 */
export function parseTipo(raw: string | null | undefined): SyncReportTipo | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  switch (trimmed) {
    case SYNC_REPORT_TIPO_PURE_DIFF:
      return SYNC_REPORT_TIPO_PURE_DIFF;
    case SYNC_REPORT_TIPO_PERUCRIS_VALIDACION:
      return SYNC_REPORT_TIPO_PERUCRIS_VALIDACION;
    default:
      throw AppError.validation(
        `Tipo de reporte de sincronizacion desconocido: '${trimmed}'.`,
      );
  }
}

/**
 * Normaliza el parametro `limit`. Acepta strings (formato query NestJS) o
 * `number`. Aplica clamp al rango [MIN_LIMIT, MAX_LIMIT] y usa
 * `DEFAULT_LIMIT` cuando llega vacio, ausente, no numerico o no positivo.
 *
 * Empty string (`""`): `Number("")` es `0` (NO `NaN`), asi que se trata
 * explicitamente como ausente.
 */
export function clampLimit(
  raw: string | number | null | undefined,
): number {
  if (raw == null) return SYNC_REPORT_DEFAULT_LIMIT;
  if (typeof raw === "string" && raw.trim().length === 0) {
    return SYNC_REPORT_DEFAULT_LIMIT;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return SYNC_REPORT_DEFAULT_LIMIT;
  if (n < SYNC_REPORT_MIN_LIMIT) return SYNC_REPORT_MIN_LIMIT;
  if (n > SYNC_REPORT_MAX_LIMIT) return SYNC_REPORT_MAX_LIMIT;
  return Math.trunc(n);
}
