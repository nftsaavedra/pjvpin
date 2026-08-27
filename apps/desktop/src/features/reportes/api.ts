export {
  getDataExportacionAgrupada,
  getDataExportacionPlana,
  getReporteProyectoIntegral,
  getReporteInvestigadorIntegral,
  getReportesInvestigadoresIntegral,
} from "@/shared/tauri/reportes";

export { getTauriErrorMessage } from "@/shared/tauri/error";

// PeruCRIS (push + validacion contra API publica)
export {
  enviarAPeruCris,
  validarAPeruCris,
  validarOrgUnitPeruCris,
  validarPublicacionPeruCris,
  importarInicialesPeruCris,
} from "@/shared/tauri/perucris";

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
} from "@/shared/tauri/types";

export type {
  PeruCrisImportResult,
  PeruCrisProyectosImportResult,
  PeruCrisPublicacionesImportResult,
  PeruCrisPushResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  PeruCrisValidationScope,
  ValidationTipo,
} from "@/shared/tauri/types/perucris.types";
