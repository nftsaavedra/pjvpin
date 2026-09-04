import { apiFetch } from "../http/client";
import type {
  DatosExportInvestigadorAgrupado,
  ExportData,
  PureMasterlistData,
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
} from "./types";

export const getDataExportacionPlana = async (): Promise<ExportData[]> => {
  return apiFetch("/reportes/export/plana");
};

export const getDataExportacionAgrupada = async (): Promise<DatosExportInvestigadorAgrupado[]> => {
  return apiFetch("/reportes/export/agrupada");
};

export const getReporteProyectoIntegral = async (
  id_proyecto: string,
): Promise<ReporteProyectoIntegral> =>
  apiFetch(`/reportes/integral/proyecto/${encodeURIComponent(id_proyecto)}`);

export const getReporteInvestigadorIntegral = async (
  id_investigador: string,
): Promise<ReporteInvestigadorIntegral> =>
  apiFetch(`/reportes/integral/investigador/${encodeURIComponent(id_investigador)}`);

export const getReportesInvestigadoresIntegral = async (): Promise<
  ReporteInvestigadorIntegral[]
> => apiFetch("/reportes/integral/investigadores");

export const getDataPureMasterlist = async (
  pure_remote_total?: number,
): Promise<PureMasterlistData> =>
  apiFetch("/reportes/pure/masterlist", {
    query: pure_remote_total ? { pure_remote_total } : undefined,
  });
