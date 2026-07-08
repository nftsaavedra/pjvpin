export type { Usuario, AuthStatus } from "./auth.types";

export type {
  Investigador,
  InvestigadorDetalle,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  EliminarInvestigadorResultado,
  RefreshInvestigadorRenacytFormacionResultado,
} from "./investigador.types";

export type {
  Proyecto,
  ProyectoDetalle,
  ProyectoParticipanteResumen,
  EliminarProyectoResultado,
} from "./proyecto.types";

export type {
  GradoAcademico,
  EliminarGradoResultado,
  CatalogoItem,
  EliminarCatalogoResultado,
} from "./catalogo.types";

export type {
  InvestigadorProyectosCount,
  KpisDashboard,
  ProyectosTrendItem,
  RenacytDistribucionItem,
  ExportData,
  DatosExportDocenteAgrupado,
} from "./dashboard.types";

export type {
  Patente,
  Producto,
  Equipamiento,
  Financiamiento,
  PatenteConEtiquetas,
  ProductoConEtiquetas,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
} from "./recursos.types";

export type {
  ProyectoCabeceraReporte,
  MiembroProyectoReporte,
  ResumenFinanciero,
  ReporteProyectoIntegral,
  PerfilDocenteReporte,
  ColegaProyecto,
  RecursosProyectoResumen,
  ProyectoDocenteDetalle,
  RecursosDocenteResumen,
  TrazabilidadDocente,
  ReporteDocenteIntegral,
} from "./reporte.types";

export type {
  Publicacion,
  SyncPublicacionesResult,
  GrupoInvestigacion,
  PublicacionConEtiquetas,
  PublicacionCientifica,
  ParticipanteEvento,
  EventoAcademico,
} from "./evento.types";

export type { PaginatedResult } from "./pagination.types";
