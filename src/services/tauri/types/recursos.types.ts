export interface Patente {
  id_patente: string;
  proyecto_id?: string | null;
  docente_id?: string | null;
  titulo: string;
  numero_patente?: string | null;
  tipo?: string | null;
  fecha_solicitud?: number | null;
  fecha_concesion?: number | null;
  pais?: string | null;
  entidad_concedente?: string | null;
  descripcion?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface Producto {
  id_producto: string;
  proyecto_id?: string | null;
  docente_id?: string | null;
  nombre: string;
  tipo?: string | null;
  descripcion?: string | null;
  fecha_registro?: number | null;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface Equipamiento {
  id_equipamiento: string;
  proyecto_id?: string | null;
  nombre: string;
  descripcion?: string | null;
  valor_estimado?: number | null;
  moneda?: string | null;
  proveedor?: string | null;
  fecha_adquisicion?: number | null;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface Financiamiento {
  id_financiamiento: string;
  proyecto_id?: string | null;
  entidad_financiadora: string;
  tipo?: string | null;
  monto?: number | null;
  moneda?: string | null;
  fecha_inicio?: number | null;
  fecha_fin?: number | null;
  descripcion?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface PatenteConEtiquetas {
  id_patente: string;
  titulo: string;
  numero_patente?: string | null;
  tipo_codigo?: string | null;
  tipo_nombre?: string | null;
  estado_codigo?: string | null;
  estado_nombre?: string | null;
  fecha_solicitud?: number | null;
  fecha_concesion?: number | null;
  pais?: string | null;
  entidad_concedente?: string | null;
  descripcion?: string | null;
}

export interface ProductoConEtiquetas {
  id_producto: string;
  nombre: string;
  tipo_codigo?: string | null;
  tipo_nombre?: string | null;
  etapa_codigo?: string | null;
  etapa_nombre?: string | null;
  descripcion?: string | null;
  fecha_registro?: number | null;
}

export interface EquipamientoConEtiquetas {
  id_equipamiento: string;
  nombre: string;
  descripcion?: string | null;
  especificaciones?: string | null;
  valor_estimado?: number | null;
  moneda_codigo?: string | null;
  moneda_nombre?: string | null;
  proveedor?: string | null;
  fecha_adquisicion?: number | null;
}

export interface FinanciamientoConEtiquetas {
  id_financiamiento: string;
  entidad_financiadora: string;
  tipo_codigo?: string | null;
  tipo_nombre?: string | null;
  monto?: number | null;
  moneda_codigo?: string | null;
  moneda_nombre?: string | null;
  fecha_inicio?: number | null;
  fecha_fin?: number | null;
  descripcion?: string | null;
  estado_financiero_codigo?: string | null;
  estado_financiero_nombre?: string | null;
}
