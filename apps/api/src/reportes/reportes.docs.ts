/**
 * Shapes de documento MongoDB consumidos por el modulo `reportes`.
 *
 * Los 9 endpoints del modulo son read-only y cruzan 13 colecciones. Declarar
 * los shapes en un unico archivo evita duplicar interfaces entre
 * `repository-export.ts`, `repository-integral.ts` y `reportes.logic.ts`
 * (DRY) y mantiene los repositorios enfocados en el acceso a datos (SRP).
 *
 * Convenciones:
 *   - snake_case explicito: los documentos persistidos por el API NestJS y
 *     por el backend Rust legacy usan snake_case en BD.
 *   - Solo se declaran los campos que el modulo `reportes` realmente lee
 *     (proyeccion logica); NO son los shapes canonicos completos de cada
 *     dominio (esos viven en el repositorio de su feature).
 *   - `activo` se persiste como `number` (0/1), replicando el patron de
 *     `proyectos/proyectos.repository.ts`.
 */

export interface CatalogoReporteDoc {
  tipo: string;
  codigo: string;
  nombre: string;
}

export interface GradoReporteDoc {
  id_grado: string;
  nombre: string;
}

export interface GrupoReporteDoc {
  id_grupo: string;
  nombre: string;
  descripcion: string | null;
  coordinador_id: string | null;
  /**
   * El shape canonico del API (`grupos/grupos.repository.ts`) todavia no
   * expone este campo (drift documentado frente al modelo Rust
   * `GrupoInvestigacionDto.lineas_investigacion`). Se lee de forma tolerante
   * y se normaliza a `[]` cuando falta.
   */
  lineas_investigacion: string[] | null;
}

export interface PersonaReporteDoc {
  id_persona: string;
  dni: string;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombre_completo: string;
}

export interface InvestigadorReporteDoc {
  id_investigador: string;
  id_persona: string;
  id_grado: string | null;
  activo: number;
  updated_at: number | null;
  /**
   * Campos de identidad desnormalizados en la coleccion `investigadores`
   * por el API NestJS. Se usan como fallback cuando la `Persona` referenciada
   * por `id_persona` no existe (el port Rust solo leia `personas`).
   */
  dni: string | null;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombre_completo: string | null;
  grupo_investigacion_id: string | null;
  renacyt_codigo_registro: string | null;
  renacyt_id_investigador: string | null;
  renacyt_nivel: string | null;
  renacyt_grupo: string | null;
  renacyt_condicion: string | null;
  renacyt_fecha_informe_calificacion: number | null;
  renacyt_fecha_registro: number | null;
  renacyt_fecha_ultima_revision: number | null;
  renacyt_fecha_ultima_sincronizacion: number | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
  renacyt_ficha_url: string | null;
  renacyt_formaciones_academicas_json: string | null;
}

export interface ProyectoReporteDoc {
  id_proyecto: string;
  titulo_proyecto: string;
  activo: number;
  campo_ocde: string | null;
  /** Documentos legacy pueden no traer el array; se normaliza a `[]`. */
  programas_relacionados: string[] | null;
  updated_at: number | null;
}

export interface ParticipacionReporteDoc {
  id_proyecto: string;
  id_investigador: string;
  es_responsable: boolean;
}

export interface PatenteReporteDoc {
  id_patente: string;
  proyecto_id: string | null;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  descripcion: string | null;
}

export interface EquipamientoReporteDoc {
  id_equipamiento: string;
  nombre: string;
  descripcion: string | null;
  especificaciones: string | null;
  valor_estimado: number | null;
  moneda: string | null;
  proveedor: string | null;
  fecha_adquisicion: number | null;
  id_financiamiento: string | null;
}

export interface FinanciamientoReporteDoc {
  id_financiamiento: string;
  nombre: string | null;
  tipo: string | null;
  monto: number | null;
  moneda: string | null;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  descripcion: string | null;
  estado_financiero: string | null;
  id_org_unit_financiadora: string | null;
}

export interface PublicacionReporteDoc {
  id_publicacion: string;
  titulo: string;
  tipo: string;
  doi: string | null;
  anio: number | null;
  revista_titulo: string | null;
  issn: string | null;
  estado_publicacion: string | null;
  pure_uuid: string | null;
  dominio_origen: string;
  es_revisado_por_pares: boolean;
  resumen: string | null;
  idioma: string | null;
  acceso_abierto: string | null;
  /**
   * Drift documentado: el modelo Rust tipa `fecha_publicacion` como ms epoch
   * (`Option<i64>`); el API NestJS la persiste como string ISO
   * (`publicaciones/publicaciones.repository.ts`). Se respeta el shape del
   * API, que es quien escribe hoy la coleccion.
   */
  fecha_publicacion: string | null;
  /** FK desnormalizada a `proyectos` (D5a: software vive en publicaciones). */
  id_proyecto: string | null;
}

export interface PatenteInventorReporteDoc {
  id_patente: string;
  id_persona: string;
}

export interface PublicacionAutorReporteDoc {
  id_publicacion: string;
  id_persona: string;
}

export interface ProyectoFinanciamientoReporteDoc {
  id_proyecto: string;
  id_financiamiento: string;
}

export interface OrgUnitReporteDoc {
  id_org_unit: string;
  nombre: string;
}
