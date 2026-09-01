/**
 * DTO de respuesta 1:1 con `ProyectoDto` del backend Rust
 * (`apps/desktop/src-tauri/src/proyectos/dto.rs` L120-157). snake_case
 * explicito (sin `rename_all`) para preservar contrato con el frontend
 * durante la fase 1 de la migracion.
 */
export interface ProyectoDto {
  id_proyecto: string;
  titulo_proyecto: string;
  codigo: string | null;
  activo: number;
  created_at: number | null;
  updated_at: number | null;
  campo_ocde: string | null;
  programas_relacionados: string[];
  tipo_actividad_ocde: string | null;
  ambito_geografico: string | null;
  estado_concytec: string | null;
  tematica_ambiental: string | null;
  tematica_salud: string | null;
  perucris_uuid: string | null;
}
