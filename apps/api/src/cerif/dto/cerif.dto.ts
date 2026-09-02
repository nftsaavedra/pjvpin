/**
 * DTOs del documento CERIF (`pjvpin/cerif-json/0.1`).
 *
 * Espejo de `apps/desktop/src-tauri/src/reportes/cerif.rs` — los campos
 * son snake_case (payload de datos, no response DTO de app).
 */

// ─── Scope ──────────────────────────────────────────────────────────────────

export type CerifScope =
  | "todo"
  | "organizaciones"
  | "personas"
  | "proyectos"
  | "publicaciones"
  | "patentes";

// ─── Documento raíz ─────────────────────────────────────────────────────────

export interface CerifDocument {
  schema: string;
  generado_en: number;
  organizaciones: CerifOrgUnit[];
  personas: CerifPerson[];
  proyectos: CerifProyecto[];
  publicaciones: CerifPublicacion[];
  patentes: CerifPatente[];
}

// ─── OrgUnit ────────────────────────────────────────────────────────────────

export interface CerifOrgUnit {
  id_org_unit: string;
  nombre: string;
  tipo_organizacion: string | null;
  tipo_dependencia: string | null;
  naturaleza: string | null;
  es_publica: boolean;
  ruc: string | null;
  ror_id: string | null;
  isni_id: string | null;
  scopus_id: string | null;
  ubigeo_codigo: string | null;
  sector_institucional: string | null;
  tipo_educacion_superior: string | null;
  ciiu_codigo: string | null;
  parent_id: string | null;
  campos_ocde: string[];
  perucris_uuid?: string;
  perucris_handle?: string;
}

// ─── Person ─────────────────────────────────────────────────────────────────

export interface CerifPerson {
  id_persona: string;
  id_investigador: string | null;
  dni: string;
  tipo_documento: string | null;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombre_completo: string;
  sexo_skos: string | null;
  orcid: string | null;
  scopus_author_id: string | null;
  renacyt_codigo_registro: string | null;
  renacyt_nivel: string | null;
}

// ─── Proyecto ───────────────────────────────────────────────────────────────

export interface CerifProyecto {
  id_proyecto: string;
  titulo: string;
  codigo: string;
  tipo_actividad_ocde: string | null;
  ambito_geografico: string | null;
  estado_concytec: string | null;
  tematica_ambiental: string | null;
  tematica_salud: string | null;
  campo_ocde: string | null;
  programas_relacionados: string[];
  campos_ocde: string[];
  participantes: CerifParticipante[];
  financiamientos: CerifProyectoFinanciamiento[];
  organizaciones: CerifProyectoOrganizacion[];
  perucris_uuid?: string;
}

export interface CerifParticipante {
  id_investigador: string;
  id_persona: string | null;
  nombre_completo: string | null;
  rol: string;
  es_responsable: boolean;
  id_org_unit_afiliacion: string | null;
  horas_dedicacion_semanal: number | null;
}

export interface CerifProyectoFinanciamiento {
  id_financiamiento: string;
  codigo: string | null;
  nombre: string | null;
  modalidad: string | null;
  id_org_unit_financiadora: string | null;
  monto_asignado: number | null;
  moneda: string;
  monto: number | null;
}

export interface CerifProyectoOrganizacion {
  id_org_unit: string;
  nombre: string | null;
  rol: string;
}

// ─── Publicación ────────────────────────────────────────────────────────────

export interface CerifPublicacion {
  id_publicacion: string;
  titulo: string;
  tipo: string;
  doi: string | null;
  issn: string | null;
  isbn: string | null;
  anio: number | null;
  fecha_publicacion: number | null;
  revista_titulo: string | null;
  editorial: string | null;
  id_org_unit_editora: string | null;
  volumen: string | null;
  numero_issue: string | null;
  paginas: string | null;
  idioma: string | null;
  resumen: string | null;
  palabras_clave: string[];
  acceso_abierto: string | null;
  scimago_cuartil: string | null;
  wos_cuartil: string | null;
  es_revisado_por_pares: boolean;
  handle_url: string | null;
  estado_publicacion: string | null;
  dominio_origen: string;
  pure_uuid: string | null;
  id_proyecto: string | null;
  autores: CerifAutor[];
}

export interface CerifAutor {
  id_persona: string;
  nombre_completo: string;
  orden: number;
  es_autor_correspondiente: boolean;
  id_org_unit_afiliacion: string | null;
}

// ─── Patente ────────────────────────────────────────────────────────────────

export interface CerifPatente {
  id_patente: string;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  id_org_unit_concedente: string | null;
  clasificacion_ipc: string | null;
  descripcion: string | null;
  proyecto_id: string | null;
  inventores: CerifPersonaRef[];
  titulares: CerifTitular[];
  campos_ocde: string[];
}

export interface CerifPersonaRef {
  id_persona: string;
  nombre_completo: string;
}

export interface CerifTitular {
  holder_type: string;
  id_org_unit: string | null;
  id_persona: string | null;
  nombre: string | null;
}
