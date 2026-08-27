/// Cambio atómico detectado por el kardex RENACYT entre dos snapshots.
/// Proyectado al frontend por `InvestigadorDetalle.cambiosRenacytRecientes`
/// (entradas recientes con cambios clasificadorios).
export interface CambioKardex {
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export interface Investigador {
  idInvestigador: string;
  dni: string;
  idGrado: string;
  nombresApellidos: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  activo?: number;
  perfil?: string;
  renacytCodigoRegistro?: string | null;
  renacytIdInvestigador?: string | null;
  renacytNivel?: string | null;
  renacytGrupo?: string | null;
  renacytCondicion?: string | null;
  renacytFechaInformeCalificacion?: number | null;
  renacytFechaRegistro?: number | null;
  renacytFechaUltimaRevision?: number | null;
  renacytOrcid?: string | null;
  renacytScopusAuthorId?: string | null;
  renacytFechaUltimaSincronizacion?: number | null;
  renacytFichaUrl?: string | null;
  renacytFormacionesAcademicasJson?: string | null;
  grupoInvestigacionId?: string | null;
  updatedAt?: number | null;
  personaId?: string;
  /// PersonID del Master List de Pure (PER000X). Sincronizado por
  /// `sincronizar_pure_person_ids` desde la API de pure.unf.edu.pe.
  purePersonId?: string | null;
  /// UUID canonico PeruCRIS (alineamiento N2-G). Permite dedupe en el
  /// importador inicial y ancla el match persona↔PeruCRIS.
  perucrisUuid?: string | null;
  /// Marca temporal (ms epoch) de la ultima revision del kardex RENACYT.
  /// `null` = nunca revisado. Lo setea el handler `marcar_cambios_renacyt_revisados`.
  renacytCambiosRevisadosEn?: number | null;
}

export interface InvestigadorDetalle {
  idInvestigador: string;
  personaId: string;
  dni: string;
  nombresApellidos: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  grado: string;
  cantidadProyectos: number;
  proyectos: string | null;
  activo: number;
  perfil?: string;
  renacytCodigoRegistro?: string | null;
  renacytIdInvestigador?: string | null;
  renacytNivel?: string | null;
  renacytGrupo?: string | null;
  renacytCondicion?: string | null;
  renacytFechaInformeCalificacion?: number | null;
  renacytFechaRegistro?: number | null;
  renacytFechaUltimaRevision?: number | null;
  renacytOrcid?: string | null;
  renacytScopusAuthorId?: string | null;
  renacytFechaUltimaSincronizacion?: number | null;
  renacytFichaUrl?: string | null;
  renacytFormacionesAcademicasJson?: string | null;
  /// Marca temporal (ms epoch) de la ultima revision del kardex RENACYT.
  /// `null` = nunca revisado.
  renacytCambiosRevisadosEn?: number | null;
  /// Cambios RENACYT recientes (ultimas 5 entradas del kardex, filtrados a
  /// campos clasificadorios: nivel, grupo, condicion,
  /// fecha_informe_calificacion, fecha_ultima_revision).
  /// Alimenta el panel de kardex en la ficha y el badge de alerta en la
  /// tabla. Plana, sin `fecha_evento` por entrada; ver
  /// `getKardexInvestigador` para el timeline completo con fecha.
  cambiosRenacytRecientes?: CambioKardex[];
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
  centroEstudios?: string | null;
  gradoAcademico?: string | null;
  titulo?: string | null;
  fechaInicio?: number | null;
  fechaFin?: number | null;
  indicadorImportado: boolean;
  puntajeObtenido?: number | null;
  consideradoParaCc: boolean;
  esCalificado: boolean;
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
