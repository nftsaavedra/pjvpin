export {
  getDataExportacionAgrupada,
  getDataExportacionPlana,
  getReporteProyectoIntegral,
  getReporteInvestigadorIntegral,
  getReportesInvestigadoresIntegral,
} from "@/services/tauri/reportes";

export { getTauriErrorMessage } from "@/services/tauri/error";

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
} from "@/services/tauri/types";
