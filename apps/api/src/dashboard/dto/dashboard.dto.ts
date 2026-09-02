/**
 * DTOs de respuesta del módulo `dashboard` (4 endpoints GET read-only).
 *
 * Shapes 1:1 con la salida del backend Rust
 * (`apps/desktop/src-tauri/src/proyectos/dto.rs` L265-296) y replicados a su
 * vez por el JSON que consume el frontend. snake_case explicito (sin
 * `rename_all`) para preservar el contrato durante la fase 1 de la
 * migración.
 */
export class InvestigadorProyectosCountDto {
  nombre!: string;
  cantidad!: number;
}

export class ProyectosTrendItemDto {
  anio!: number;
  mes!: number;
  cantidad!: number;
}

export class RenacytDistribucionItemDto {
  nivel!: string;
  cantidad_investigadores!: number;
  con_proyectos!: number;
  sin_proyectos!: number;
}

export class KpisDashboardDto {
  total_proyectos!: number;
  total_investigadores!: number;
  investigadores_con_1_proyecto!: number;
  investigadores_multiples_proyectos!: number;
}
