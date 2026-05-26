export interface DocenteProyectosCount {
  nombre: string;
  cantidad: number;
}

export interface KpisDashboard {
  total_proyectos: number;
  total_docentes: number;
  docentes_con_1_proyecto: number;
  docentes_multiples_proyectos: number;
}

export interface ProyectosTrendItem {
  anio: number;
  mes: number;
  cantidad: number;
}

export interface RenacytDistribucionItem {
  nivel: string;
  cantidad_docentes: number;
  con_proyectos: number;
  sin_proyectos: number;
}

export interface ExportData {
  proyecto: string;
  grado: string;
  renacyt_nivel: string;
  docente: string;
  dni: string;
}

export interface DatosExportDocenteAgrupado {
  docente: string;
  dni: string;
  grado: string;
  renacyt_nivel: string;
  cantidad_proyectos: number;
  proyectos: string | null;
}
