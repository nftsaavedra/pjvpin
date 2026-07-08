import { invoke } from "./client";
import type {
  DatosExportInvestigadorAgrupado,
  ExportData,
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
} from "./types";

export const getDataExportacionPlana = async (): Promise<ExportData[]> => {
  return await invoke("get_data_exportacion_plana");
};

export const getDataExportacionAgrupada = async (): Promise<DatosExportInvestigadorAgrupado[]> => {
  return await invoke("get_data_exportacion_agrupada_investigador");
};

export const getReporteProyectoIntegral = async (
  id_proyecto: string,
): Promise<ReporteProyectoIntegral> =>
  await invoke("get_reporte_proyecto_integral", { idProyecto: id_proyecto });

export const getReporteInvestigadorIntegral = async (
  id_investigador: string,
): Promise<ReporteInvestigadorIntegral> =>
  await invoke("get_reporte_investigador_integral", { id_investigador });

export const getReportesInvestigadoresIntegral = async (): Promise<ReporteInvestigadorIntegral[]> =>
  await invoke("get_reportes_investigadores_integral");
