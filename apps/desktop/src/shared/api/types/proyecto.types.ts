export interface Proyecto {
  id_proyecto: string;
  titulo_proyecto: string;
}

export interface ProyectoDetalle {
  id_proyecto: string;
  titulo_proyecto: string;
  cantidad_investigadores: number;
  investigador_responsable?: string | null;
  investigadores: string | null;
  participantes_json?: string | null;
  activo: boolean;
}

export interface ProyectoParticipanteResumen {
  id_investigador: string;
  nombre: string;
  grado: string;
  renacyt_nivel: string;
  es_responsable: boolean;
}

export interface EliminarProyectoResultado {
  accion: string;
  mensaje: string;
}

export interface CreateProyectoConParticipantesArgs {
  titulo_proyecto: string;
  investigadores_ids: string[];
  investigador_responsable_id?: string | null;
}

export interface UpdateProyectoConParticipantesArgs {
  titulo_proyecto: string;
  investigadores_ids: string[];
  investigador_responsable_id?: string | null;
}

export interface InvestigadorProyectosCount {
  nombre: string;
  cantidad: number;
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

export interface KpisDashboard {
  total_proyectos: number;
  total_investigadores: number;
  investigadores_con_1_proyecto: number;
  investigadores_multiples_proyectos: number;
}

export interface ExportDataConProyectos {
  investigador: string;
  dni: string;
  grado: string;
  renacyt_nivel: string;
  grupo_investigacion?: string | null;
  cantidad_proyectos: number;
  proyectos?: string | null;
}

export interface ExportDataPlana {
  proyecto: string;
  grado: string;
  renacyt_nivel: string;
  investigador: string;
  dni: string;
}

export interface ExportDataGrupo {
  grupo: string;
  descripcion?: string | null;
  coordinador?: string | null;
  cantidad_miembros: number;
  miembros?: string | null;
  lineas_investigacion: string[];
  cantidad_proyectos: number;
  proyectos?: string | null;
}

export interface ExportDataRecurso {
  tipo_recurso: string;
  titulo_o_nombre: string;
  proyecto?: string | null;
  investigador?: string | null;
  tipo?: string | null;
  estado?: string | null;
  moneda?: string | null;
  monto?: number | null;
}

export interface ExportDataInvestigadorPerfil {
  dni: string;
  nombres_apellidos: string;
  grado: string;
  renacyt_nivel?: string | null;
  renacyt_grupo?: string | null;
  renacyt_condicion?: string | null;
  renacyt_orcid?: string | null;
  grupo_investigacion?: string | null;
  cantidad_proyectos: number;
  cantidad_publicaciones: number;
  proyectos?: string | null;
  activo: boolean;
}

export interface ExportDataProyectoArea {
  area: string;
  cantidad_proyectos: number;
  proyectos?: string | null;
  cantidad_investigadores: number;
}
