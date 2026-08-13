export interface Patente {
  id_patente: string;
  proyecto_id?: string | null;
  investigador_id?: string | null;
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

/// D5: los productos tecnologicos ahora viven como `Publicacion { tipo:
/// "software", id_proyecto }`. Mantenemos este alias para no romper imports
/// legacy en componentes que ya referencian `Producto` directamente.
export type Producto = import("./evento.types").PublicacionCientifica;

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
  estado_financiero?: string | null;
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

/// D5: el reporte ya no usa `ProductoConEtiquetas`; en su lugar usa
/// `SoftwareConEtiquetas` (definido en `reporte.types.ts`).
export type ProductoConEtiquetas =
  import("./reporte.types").SoftwareConEtiquetas;

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
