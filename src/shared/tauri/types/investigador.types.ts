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
