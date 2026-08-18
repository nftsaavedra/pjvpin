export interface Patente {
  id_patente: string;
  proyecto_id?: string | null;
  titulo: string;
  numero_patente?: string | null;
  tipo?: string | null;
  estado?: string | null;
  fecha_solicitud?: number | null;
  fecha_concesion?: number | null;
  pais?: string | null;
  entidad_concedente?: string | null;
  descripcion?: string | null;
  clasificacion_ipc?: string | null;
  id_org_unit_concedente?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
}

/// D5: los productos tecnologicos ahora viven como `PublicacionCientifica`
/// con `tipo: "software"` e `id_proyecto`. Mantenemos este alias para no
/// romper imports legacy en componentes que ya referencian `Producto`.
export type Producto = import("./evento.types").PublicacionCientifica;

export interface Equipamiento {
  id_equipamiento: string;
  nombre: string;
  descripcion?: string | null;
  especificaciones?: string | null;
  valor_estimado?: number | null;
  moneda?: string | null;
  proveedor?: string | null;
  fecha_adquisicion?: number | null;
  codigo_institucional?: string | null;
  tipo_equipamiento?: string | null;
  uso_equipamiento?: string | null;
  id_org_unit_propietaria?: string | null;
  id_financiamiento?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface Financiamiento {
  id_financiamiento: string;
  codigo?: string | null;
  nombre?: string | null;
  modalidad?: string | null;
  id_org_unit_financiadora?: string | null;
  parent_id?: string | null;
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
