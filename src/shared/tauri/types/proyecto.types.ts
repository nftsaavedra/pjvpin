export interface Proyecto {
  idProyecto: string;
  tituloProyecto: string;
}

export interface ProyectoDetalle {
  idProyecto: string;
  tituloProyecto: string;
  cantidadInvestigadores: number;
  investigadorResponsable?: string | null;
  investigadores: string | null;
  participantesJson?: string | null;
  activo: boolean;
}

export interface ProyectoParticipanteResumen {
  idInvestigador: string;
  nombre: string;
  grado: string;
  renacytNivel: string;
  esResponsable: boolean;
}

export interface EliminarProyectoResultado {
  accion: string;
  mensaje: string;
}

export interface CreateProyectoConParticipantesArgs {
  tituloProyecto: string;
  investigadoresIds: string[];
  investigadorResponsableId?: string | null;
}

export interface UpdateProyectoConParticipantesArgs {
  tituloProyecto: string;
  investigadoresIds: string[];
  investigadorResponsableId?: string | null;
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
  cantidadInvestigadores: number;
  conProyectos: number;
  sinProyectos: number;
}

export interface KpisDashboard {
  totalProyectos: number;
  totalInvestigadores: number;
  investigadoresCon1Proyecto: number;
  investigadoresMultiplesProyectos: number;
}

export interface ExportDataConProyectos {
  investigador: string;
  dni: string;
  grado: string;
  renacytNivel: string;
  grupoInvestigacion?: string | null;
  cantidadProyectos: number;
  proyectos?: string | null;
}

export interface ExportDataPlana {
  proyecto: string;
  grado: string;
  renacytNivel: string;
  investigador: string;
  dni: string;
}

export interface ExportDataGrupo {
  grupo: string;
  descripcion?: string | null;
  coordinador?: string | null;
  cantidadMiembros: number;
  miembros?: string | null;
  lineasInvestigacion: string[];
  cantidadProyectos: number;
  proyectos?: string | null;
}

export interface ExportDataRecurso {
  tipoRecurso: string;
  tituloONombre: string;
  proyecto?: string | null;
  investigador?: string | null;
  tipo?: string | null;
  estado?: string | null;
  moneda?: string | null;
  monto?: number | null;
}

export interface ExportDataInvestigadorPerfil {
  dni: string;
  nombresApellidos: string;
  grado: string;
  renacytNivel?: string | null;
  renacytGrupo?: string | null;
  renacytCondicion?: string | null;
  renacytOrcid?: string | null;
  grupoInvestigacion?: string | null;
  cantidadProyectos: number;
  cantidadPublicaciones: number;
  proyectos?: string | null;
  activo: boolean;
}

export interface ExportDataProyectoArea {
  area: string;
  cantidadProyectos: number;
  proyectos?: string | null;
  cantidadInvestigadores: number;
}
