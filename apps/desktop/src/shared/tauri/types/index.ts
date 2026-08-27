export type { Usuario, AuthStatus } from "./auth.types";

export type {
  CambioKardex,
  Investigador,
  InvestigadorDetalle,
  RefreshMasivoRenacytResultado,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  EliminarInvestigadorResultado,
  RefreshInvestigadorRenacytFormacionResultado,
  CreateInvestigadorRenacytPayload,
  ImportInvestigadoresResult,
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
  Persona,
} from "./catalogo.types";

export type {
  InvestigadorProyectosCount,
  KpisDashboard,
  ProyectosTrendItem,
  RenacytDistribucionItem,
  ExportData,
  DatosExportInvestigadorAgrupado,
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
  PerfilInvestigadorReporte,
  ColegaProyecto,
  RecursosProyectoResumen,
  ProyectoInvestigadorDetalle,
  RecursosInvestigadorResumen,
  TrazabilidadInvestigador,
  ReporteInvestigadorIntegral,
  SoftwareConEtiquetas,
} from "./reporte.types";

export type {
  SyncPublicacionesResult,
  GrupoInvestigacion,
  PublicacionConEtiquetas,
  PublicacionCientifica,
  ParticipanteEvento,
  EventoAcademico,
} from "./evento.types";

export type {
  PeruCrisPushResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  PeruCrisValidationScope,
  ValidationTipo,
} from "./perucris.types";

export type { PaginatedResult } from "./pagination.types";

export type { Ubigeo } from "./geo.types";

export type { OrgUnit, CreateOrgUnitRequest, UpdateOrgUnitRequest } from "./orgUnit.types";

export type {
  PureMasterlistPersonRow,
  PureMasterlistStaffRow,
  PureMasterlistSummary,
  PureMasterlistData,
  SyncPurePersonIdsResult,
} from "./pureMasterList.types";

export type {
  ItemClasificacion,
  SyncReport,
  SyncReportItem,
  SyncReportResumen,
  SyncReportTipo,
} from "./syncReport.types";
