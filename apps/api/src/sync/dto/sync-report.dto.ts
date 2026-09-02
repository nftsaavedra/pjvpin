/**
 * DTOs del modulo `sync` - `GET /sync/reportes`.
 *
 * Shape canónico unificado de los reportes de sincronizacion persistidos en
 * la coleccion `sync_reportes`. Replica 1:1 el struct Rust
 * `apps/desktop/src-tauri/src/reportes/sync_reportes.rs::SyncReport` (snake_case
 * en BSON, snake_case en la respuesta JSON).
 *
 * Drift documentado: `pure.service.ts` y `perucris.service.ts` ya persisten
 * documentos compatibles con este shape (mismo `tipo` string, mismo `resumen`
 * con 5 campos, mismo `items[]`). La unica diferencia historica eran los
 * discriminantes de `items[].clasificacion`: `pure_diff` usa
 * `solo_local | solo_pure | diferente` y `perucris_validacion` usa
 * `encontrado | no_encontrado | diferente`. Este DTO acepta TODOS los
 * valores via `SyncReportClasificacion` (union exhaustiva) para no requerir
 * normalizacion en el mapper.
 */

export const SYNC_REPORT_TIPO_PURE_DIFF = "pure_diff";
export const SYNC_REPORT_TIPO_PERUCRIS_VALIDACION = "perucris_validacion";

/**
 * Tipo de reporte (subsistema que lo genero). Snake_case literal para
 * preservar el contrato con el BSON serializado por el backend Rust.
 */
export type SyncReportTipo =
  | typeof SYNC_REPORT_TIPO_PURE_DIFF
  | typeof SYNC_REPORT_TIPO_PERUCRIS_VALIDACION;

/**
 * Discriminante de un item divergente. Union exhaustiva de los valores
 * que persisten `pure.service.ts` y `perucris.service.ts`:
 *   - pure_diff:        solo_local | solo_pure | diferente
 *   - perucris_validacion: encontrado | no_encontrado | diferente
 *
 * El frontend discrimina por `tipo` del reporte padre antes de interpretar
 * `clasificacion`. Esta union evita perdida de informacion al cruzar al API.
 */
export type SyncReportClasificacion =
  | "solo_local"
  | "solo_pure"
  | "diferente"
  | "encontrado"
  | "no_encontrado";

/** Contadores agregados del reporte. */
export class SyncReportResumenDocument {
  total!: number;
  solo_local!: number;
  solo_pure!: number;
  diferentes!: number;
  tiempo_total_ms!: number;
}

/** Entidad divergente detectada por la verificacion. */
export class SyncReportItemDocument {
  id_local!: string | null;
  id_pure!: string | null;
  doi!: string | null;
  titulo!: string | null;
  anio!: number | null;
  clasificacion!: SyncReportClasificacion;
  /** Campos con divergencia o mensajes de diagnostico del validador remoto. */
  diferencias!: string[];
  /** `true` cuando el item esta listo para publicarse (fase futura). */
  adoptable!: boolean;
}

/** Reporte persistido de una verificacion de doble via. */
export class SyncReportDocument {
  id!: string;
  tipo!: SyncReportTipo;
  /** Timestamp ms epoch en que se ejecuto la verificacion. */
  ejecutado_at!: number;
  resumen!: SyncReportResumenDocument;
  items!: SyncReportItemDocument[];
}
