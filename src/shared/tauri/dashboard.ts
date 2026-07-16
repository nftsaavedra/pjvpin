import { invoke } from "./client";
import type {
  InvestigadorProyectosCount,
  KpisDashboard,
  ProyectosTrendItem,
  RenacytDistribucionItem,
} from "./types";

export const getEstadisticasProyectosXInvestigador = async (): Promise<
  InvestigadorProyectosCount[]
> => {
  return await invoke("get_estadisticas_proyectos_x_investigador");
};

export const getKpisDashboard = async (): Promise<KpisDashboard> => {
  return await invoke("get_kpis_dashboard");
};

export const getProyectosTrend = async (): Promise<ProyectosTrendItem[]> => {
  return await invoke("get_proyectos_trend");
};

export const getRenacytDistribucion = async (): Promise<RenacytDistribucionItem[]> => {
  return await invoke("get_renacyt_distribucion");
};
