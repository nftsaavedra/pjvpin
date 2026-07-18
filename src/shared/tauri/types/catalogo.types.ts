export interface GradoAcademico {
  id_grado: string;
  nombre: string;
  descripcion?: string;
  activo: number;
  updated_at?: number | null;
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
  updated_at?: number | null;
}

export interface EliminarCatalogoResultado {
  accion: string;
  mensaje: string;
}

export interface Persona {
  id_persona: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  nombre_completo: string;
}
