/**
 * Espejo TS de `src-tauri/src/reportes/sync_reportes.rs`.
 * Cualquier cambio aqui debe reflejarse en el modelo Rust y viceversa.
 */

export type SyncReportTipo = "pure_diff" | "perucris_validacion";

export type ItemClasificacion = "solo_local" | "solo_pure" | "diferente";

export interface SyncReportResumen {
  total: number;
  solo_local: number;
  solo_pure: number;
  diferentes: number;
  tiempo_total_ms: number;
}

export interface SyncReportItem {
  id_local?: string | null;
  id_pure?: string | null;
  doi?: string | null;
  titulo?: string | null;
  anio?: number | null;
  clasificacion: ItemClasificacion;
  diferencias: string[];
  adoptable: boolean;
}

export interface SyncReport {
  id: string;
  tipo: SyncReportTipo;
  ejecutado_at: number;
  resumen: SyncReportResumen;
  items: SyncReportItem[];
}
