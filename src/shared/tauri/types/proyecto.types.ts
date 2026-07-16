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
