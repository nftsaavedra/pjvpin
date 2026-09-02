/**
 * Espejo TS de `src-tauri/src/reportes/sync_reportes.rs`.
 * Cualquier cambio aqui debe reflejarse en el modelo Rust y viceversa.
 */

export type SyncReportTipo = "pure_diff" | "perucris_validacion";

export type ItemClasificacion = "solo_local" | "solo_pure" | "diferente";

export interface SyncReportResumen {
  total: number;
  soloLocal: number;
  soloPure: number;
  diferentes: number;
  tiempoTotalMs: number;
}

export interface SyncReportItem {
  idLocal?: string | null;
  idPure?: string | null;
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
  ejecutadoAt: number;
  resumen: SyncReportResumen;
  items: SyncReportItem[];
}
