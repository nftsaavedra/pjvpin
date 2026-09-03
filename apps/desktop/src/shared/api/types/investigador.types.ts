/// Cambio atómico detectado por el kardex RENACYT entre dos snapshots.
/// Proyectado al frontend por `InvestigadorDetalle.cambios_renacyt_recientes`
/// (entradas recientes con cambios clasificadorios).
export interface CambioKardex {
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

export interface Investigador {
  id_investigador: string;
  dni: string;
  id_grado: string;
  nombres_apellidos: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  activo?: number;
  perfil?: string;
  renacyt_codigo_registro?: string | null;
  renacyt_id_investigador?: string | null;
  renacyt_nivel?: string | null;
  renacyt_grupo?: string | null;
  renacyt_condicion?: string | null;
  renacyt_fecha_informe_calificacion?: number | null;
  renacyt_fecha_registro?: number | null;
  renacyt_fecha_ultima_revision?: number | null;
  renacyt_orcid?: string | null;
  renacyt_scopus_author_id?: string | null;
  renacyt_fecha_ultima_sincronizacion?: number | null;
  renacyt_ficha_url?: string | null;
  renacyt_formaciones_academicas_json?: string | null;
  grupo_investigacion_id?: string | null;
  updated_at?: number | null;
  persona_id?: string;
  /// PersonID del Master List de Pure (PER000X). Sincronizado por
  /// `sincronizar_pure_person_ids` desde la API de pure.unf.edu.pe.
  pure_person_id?: string | null;
  /// UUID canonico PeruCRIS (alineamiento N2-G). Permite dedupe en el
  /// importador inicial y ancla el match persona↔PeruCRIS.
  perucris_uuid?: string | null;
  /// Marca temporal (ms epoch) de la ultima revision del kardex RENACYT.
  /// `null` = nunca revisado. Lo setea el handler `marcar_cambios_renacyt_revisados`.
  renacyt_cambios_revisados_en?: number | null;
}

export interface InvestigadorDetalle {
  id_investigador: string;
  persona_id: string;
  dni: string;
  nombres_apellidos: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  grado: string;
  cantidad_proyectos: number;
  proyectos: string | null;
  activo: number;
  perfil?: string;
  renacyt_codigo_registro?: string | null;
  renacyt_id_investigador?: string | null;
  renacyt_nivel?: string | null;
  renacyt_grupo?: string | null;
  renacyt_condicion?: string | null;
  renacyt_fecha_informe_calificacion?: number | null;
  renacyt_fecha_registro?: number | null;
  renacyt_fecha_ultima_revision?: number | null;
  renacyt_orcid?: string | null;
  renacyt_scopus_author_id?: string | null;
  renacyt_fecha_ultima_sincronizacion?: number | null;
  renacyt_ficha_url?: string | null;
  renacyt_formaciones_academicas_json?: string | null;
  /// Marca temporal (ms epoch) de la ultima revision del kardex RENACYT.
  /// `null` = nunca revisado.
  renacyt_cambios_revisados_en?: number | null;
  /// Cambios RENACYT recientes (ultimas 5 entradas del kardex, filtrados a
  /// campos clasificadorios: nivel, grupo, condicion,
  /// fecha_informe_calificacion, fecha_ultima_revision).
  /// Alimenta el panel de kardex en la ficha y el badge de alerta en la
  /// tabla. Plana, sin `fecha_evento` por entrada; ver
  /// `getKardexInvestigador` para el timeline completo con fecha.
  cambios_renacyt_recientes?: CambioKardex[];
}

/// Resultado agregado del comando `refrescar_renacyt_todos` (RBAC
/// `InvestigadoresManage`).
export interface RefreshMasivoRenacytResultado {
  procesados: number;
  errores: number;
  kardexGenerados: number;
  erroresDetalle: string[];
  mensaje: string;
}

export interface RenacytFormacionAcademicaResumen {
  id: number;
  centro_estudios?: string | null;
  grado_academico?: string | null;
  titulo?: string | null;
  fecha_inicio?: number | null;
  fecha_fin?: number | null;
  indicador_importado: boolean;
  puntaje_obtenido?: number | null;
  considerado_para_cc: boolean;
  es_calificado: boolean;
}

export interface RenacytLookupResult {
  codigoRegistro: string;
  idInvestigador: string;
  nombreCompleto?: string | null;
  numeroDocumento?: string | null;
  nivel?: string | null;
  grupo?: string | null;
  condicion?: string | null;
  fechaInformeCalificacion?: number | null;
  fechaRegistro?: number | null;
  fechaUltimaRevision?: number | null;
  orcid?: string | null;
  scopusAuthorId?: string | null;
  fichaUrl: string;
  solicitudId: number | null;
  formacionesAcademicasJson?: string | null;
}

export interface ReniecDniLookupResult {
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  fullName: string;
  documentNumber: string;
}

export interface EliminarInvestigadorResultado {
  accion: string;
  mensaje: string;
}

export interface RefreshInvestigadorRenacytFormacionResultado {
  investigador: InvestigadorDetalle;
  actualizada: boolean;
  mensaje: string;
}

export interface CreateInvestigadorRenacytPayload {
  codigoRegistro: string;
  idInvestigador: string;
  nivel?: string | null;
  grupo?: string | null;
  condicion?: string | null;
  fechaInformeCalificacion?: number | null;
  fechaRegistro?: number | null;
  fechaUltimaRevision?: number | null;
  orcid?: string | null;
  scopusAuthorId?: string | null;
  fichaUrl: string;
  formacionesAcademicasJson?: string | null;
}

/// Resultado del comando `importar_investigadores`. Refleja el contract
/// camelCase del backend (`ImportInvestigadoresResult`).
export interface ImportInvestigadoresResult {
  totalEvaluados: number;
  importados: number;
  autocompletadosReniec: number;
  omitidosDuplicado: number;
  omitidosSinReniec: number;
  omitidosInvalidos: number;
  renacytEncontrados: number;
  renacytNoEncontrados: number;
  renacytFallos: number;
  perucrisEnlazados: number;
  perucrisFallos: number;
  pureEnlazados: number;
  pureFallos: number;
  errores: string[];
}
