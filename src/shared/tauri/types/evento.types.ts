// Mirror de PublicacionDto (investigadores/dto.rs). camelCase porque el
// struct Rust ahora tiene #[serde(rename_all = "camelCase")].
//
// NOTA: el campo `personaId` del struct Rust se desnormaliza desde la query
// BSON `publicaciones.investigador_id` (legacy). El campo Rust se llama
// `persona_id` por consistencia con otros modelos de dominio, pero la
// realidad es que apunta a un investigador.
export interface Publicacion {
  idPublicacion: string;
  pureUuid: string;
  personaId: string;
  proyectoId?: string | null;
  titulo: string;
  tipoPublicacion?: string | null;
  doi?: string | null;
  scopusEid?: string | null;
  anioPublicacion?: number | null;
  autoresJson?: string | null;
  estadoPublicacion?: string | null;
  journalTitulo?: string | null;
  issn?: string | null;
  pureSincronizadoAt?: number | null;
  createdAt?: number | null;
  updatedAt?: number | null;
}

// Mirror de SyncPublicacionesResult (investigadores/dto.rs).
export interface SyncPublicacionesResult {
  personaId: string;
  scopusAuthorId: string;
  purePersonUuid?: string | null;
  totalEncontradas: number;
  nuevas: number;
  actualizadas: number;
}

export interface GrupoInvestigacion {
  id_grupo: string;
  nombre: string;
  descripcion?: string | null;
  coordinador_id?: string | null;
  lineas_investigacion: string[];
  activo: number;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface PublicacionConEtiquetas {
  id_publicacion: string;
  pure_uuid: string;
  titulo: string;
  tipo_publicacion?: string | null;
  doi?: string | null;
  scopus_eid?: string | null;
  anio_publicacion?: number | null;
  autores_json?: string | null;
  estado_publicacion?: string | null;
  journal_titulo?: string | null;
  issn?: string | null;
  pure_sincronizado_at?: number | null;
}

export interface PublicacionCientifica {
  id_publicacion: string;
  titulo: string;
  autores_ids: string[];
  revista?: string | null;
  doi?: string | null;
  issn?: string | null;
  anio?: number | null;
  cuartil?: string | null;
  tipo: string;
  url?: string | null;
  resumen?: string | null;
  palabras_clave: string[];
  pure_id?: string | null;
  activo: number;
}

export interface ParticipanteEvento {
  investigador_id: string;
  rol: string;
}

export interface EventoAcademico {
  id_evento: string;
  nombre: string;
  tipo: string;
  fecha_inicio?: number | null;
  fecha_fin?: number | null;
  lugar?: string | null;
  descripcion?: string | null;
  participantes: ParticipanteEvento[];
  activo: number;
}
