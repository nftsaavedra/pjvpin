export {
  getDataExportacionAgrupada,
  getDataExportacionPlana,
  getReporteProyectoIntegral,
  getReporteInvestigadorIntegral,
  getReportesInvestigadoresIntegral,
} from "@/shared/tauri/reportes";

export { getTauriErrorMessage } from "@/shared/tauri/error";

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
