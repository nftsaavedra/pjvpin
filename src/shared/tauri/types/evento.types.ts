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

// Mirror de `reportes::PublicacionConEtiquetas` (reportes/dto.rs). B1: el
// reporte de investigador ahora se nutre de `publicaciones_cientificas`
// (modelo consolidado), no de la coleccion legacy `publicaciones`.
export interface PublicacionConEtiquetas {
  id_publicacion: string;
  titulo: string;
  tipo: string;
  doi?: string | null;
  anio?: number | null;
  revista_titulo?: string | null;
  issn?: string | null;
  estado_publicacion?: string | null;
  pure_uuid?: string | null;
  perucris_uuid?: string | null;
  dominio_origen: string;
  es_revisado_por_pares?: boolean;
}

export interface PublicacionCientifica {
  id_publicacion: string;
  titulo: string;
  doi?: string | null;
  issn?: string | null;
  anio?: number | null;
  cuartil?: string | null;
  tipo: string;
  resumen?: string | null;
  palabras_clave: string[];
  activo: number;
  handle_url?: string | null;
  fecha_publicacion?: number | null;
  editorial?: string | null;
  id_org_unit_editora?: string | null;
  revista_titulo?: string | null;
  isbn?: string | null;
  scimago_cuartil?: string | null;
  wos_cuartil?: string | null;
  es_revisado_por_pares?: boolean;
  acceso_abierto?: string | null;
  idioma?: string | null;
  volumen?: string | null;
  numero_issue?: string | null;
  paginas?: string | null;
  dominio_origen?: string;
  pure_uuid?: string | null;
  perucris_uuid?: string | null;
  estado_publicacion?: string | null;
  id_proyecto?: string | null;
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
