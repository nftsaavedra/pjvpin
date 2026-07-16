export interface InvestigadorProyectosCount {
  nombre: string;
  cantidad: number;
}

export interface KpisDashboard {
  total_proyectos: number;
  total_investigadores: number;
  investigadores_con_1_proyecto: number;
  investigadores_multiples_proyectos: number;
}

export interface ProyectosTrendItem {
  anio: number;
  mes: number;
  cantidad: number;
}

export interface RenacytDistribucionItem {
  nivel: string;
  cantidad_investigadores: number;
  con_proyectos: number;
  sin_proyectos: number;
}

export interface ExportData {
  proyecto: string;
  grado: string;
  renacyt_nivel: string;
  investigador: string;
  dni: string;
}

export interface DatosExportInvestigadorAgrupado {
  investigador: string;
  dni: string;
  grado: string;
  renacyt_nivel: string;
  cantidad_proyectos: number;
  proyectos: string | null;
}
