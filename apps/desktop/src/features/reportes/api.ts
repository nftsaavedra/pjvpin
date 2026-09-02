export {
  getDataExportacionAgrupada,
  getDataExportacionPlana,
  getReporteProyectoIntegral,
  getReporteInvestigadorIntegral,
  getReportesInvestigadoresIntegral,
} from "@/shared/api/reportes";

export { getErrorMessage } from "@/shared/http/error";

// PeruCRIS (push + validacion contra API publica)
export {
  enviarAPeruCris,
  validarAPeruCris,
  validarOrgUnitPeruCris,
  validarPublicacionPeruCris,
  importarInicialesPeruCris,
} from "@/shared/api/perucris";

export type {
  DatosExportInvestigadorAgrupado,
  ExportData,
  ColegaProyecto,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
  MiembroProyectoReporte,
  PatenteConEtiquetas,
  PerfilInvestigadorReporte,
  ProductoConEtiquetas,
  ProyectoCabeceraReporte,
  ProyectoInvestigadorDetalle,
  PublicacionConEtiquetas,
  RecursosInvestigadorResumen,
  RecursosProyectoResumen,
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
  ResumenFinanciero,
  TrazabilidadInvestigador,
} from "@/shared/api/types";

export type {
  PeruCrisImportResult,
  PeruCrisProyectosImportResult,
  PeruCrisPublicacionesImportResult,
  PeruCrisPushResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  PeruCrisValidationScope,
  ValidationTipo,
} from "@/shared/api/types/perucris.types";
