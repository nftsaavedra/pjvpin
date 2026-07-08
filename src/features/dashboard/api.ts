export {
  getEstadisticasProyectosXInvestigador,
  getKpisDashboard,
  getProyectosTrend,
  getRenacytDistribucion,
} from "@/services/tauri/dashboard";

export type {
  InvestigadorProyectosCount,
  KpisDashboard,
  ProyectosTrendItem,
  RenacytDistribucionItem,
} from "@/services/tauri/types";
