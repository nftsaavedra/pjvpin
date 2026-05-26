export interface Publicacion {
  id_publicacion: string;
  pure_uuid: string;
  docente_id: string;
  proyecto_id?: string | null;
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
  created_at?: number | null;
  updated_at?: number | null;
}

export interface SyncPublicacionesResult {
  docente_id: string;
  scopus_author_id: string;
  pure_person_uuid?: string | null;
  total_encontradas: number;
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
  docente_id: string;
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
