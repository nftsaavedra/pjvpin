import { apiFetch } from "../http/client";
import type {
  InvestigadorProyectosCount,
  KpisDashboard,
  ProyectosTrendItem,
  RenacytDistribucionItem,
} from "./types";

export const getEstadisticasProyectosXInvestigador = async (): Promise<
  InvestigadorProyectosCount[]
> => {
  return apiFetch("/dashboard/estadisticas-proyectos-investigador");
};

export const getKpisDashboard = async (): Promise<KpisDashboard> => {
  return apiFetch("/dashboard/kpis");
};

export const getProyectosTrend = async (): Promise<ProyectosTrendItem[]> => {
  return apiFetch("/dashboard/proyectos-trend");
};

export const getRenacytDistribucion = async (): Promise<RenacytDistribucionItem[]> => {
  return apiFetch("/dashboard/renacyt-distribucion");
};
