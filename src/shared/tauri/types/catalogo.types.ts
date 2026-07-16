export interface GradoAcademico {
  id_grado: string;
  nombre: string;
  descripcion?: string;
  activo?: number;
}

export interface EliminarGradoResultado {
  accion: string;
  mensaje: string;
}

export interface CatalogoItem {
  id_catalogo: string;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  orden?: number | null;
  activo: number;
}

export interface EliminarCatalogoResultado {
  accion: string;
  mensaje: string;
}
