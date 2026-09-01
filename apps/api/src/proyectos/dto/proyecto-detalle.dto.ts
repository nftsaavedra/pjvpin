/**
 * Resumen de un participante de proyecto, embebido en `ProyectoDetalleDto`
 * serializado como JSON string (compatibilidad con el shape Rust que envia
 * `participantes_json: Option<String>` al frontend). 1:1 con
 * `ProyectoParticipanteResumenDto` (apps/desktop/src-tauri/src/proyectos/dto.rs` L5-13).
 */
export interface ProyectoParticipanteResumen {
  id_investigador: string;
  nombre: string;
  grado: string;
  renacyt_nivel: string;
  es_responsable: boolean;
}

export interface ProyectoDetalleDto {
  id_proyecto: string;
  titulo_proyecto: string;
  cantidad_investigadores: number;
  investigador_responsable: string | null;
  /** String con la lista join `nombre (grado · nivel) | nombre2 (...)`. */
  investigadores: string | null;
  /** JSON.stringify de `ProyectoParticipanteResumen[]`. */
  participantes_json: string | null;
  activo: boolean;
}
