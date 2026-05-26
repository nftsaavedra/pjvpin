import type {
  PatenteConEtiquetas,
  ProductoConEtiquetas,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
} from "./recursos.types";
import type { PublicacionConEtiquetas } from "./evento.types";

export interface ProyectoCabeceraReporte {
  id_proyecto: string;
  titulo_proyecto: string;
  activo: boolean;
  campo_ocde?: string | null;
  programas_relacionados: string[];
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
}

export interface MiembroProyectoReporte {
  id_docente: string;
  dni: string;
  nombres_apellidos: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  grado_nombre: string;
  grado_id: string;
  es_responsable: boolean;
  renacyt_codigo_registro?: string | null;
  renacyt_nivel?: string | null;
  renacyt_grupo?: string | null;
  renacyt_condicion?: string | null;
  renacyt_orcid?: string | null;
  renacyt_scopus_author_id?: string | null;
  grupo_nombre?: string | null;
  grupo_id?: string | null;
  publicaciones_count: number;
}

export interface ResumenFinanciero {
  total_financiamientos: number;
  desglose_por_moneda: {
    moneda_codigo: string;
    moneda_nombre: string;
    cantidad: number;
    monto_total: number;
  }[];
  desglose_por_estado: {
    estado_codigo: string;
    estado_nombre: string;
    cantidad: number;
  }[];
}

export interface ReporteProyectoIntegral {
  cabecera: ProyectoCabeceraReporte;
  equipo: MiembroProyectoReporte[];
  total_docentes: number;
  patentes: PatenteConEtiquetas[];
  total_patentes: number;
  productos: ProductoConEtiquetas[];
  total_productos: number;
  equipamientos: EquipamientoConEtiquetas[];
  total_equipamientos: number;
  financiamientos: FinanciamientoConEtiquetas[];
  total_financiamientos: number;
  resumen_financiero: ResumenFinanciero;
}

export interface PerfilDocenteReporte {
  id_docente: string;
  dni: string;
  nombres_apellidos: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  grado_nombre: string;
  grado_id: string;
  renacyt_codigo_registro?: string | null;
  renacyt_id_investigador?: string | null;
  renacyt_nivel?: string | null;
  renacyt_grupo?: string | null;
  renacyt_condicion?: string | null;
  renacyt_fecha_informe_calificacion?: number | null;
  renacyt_fecha_registro?: number | null;
  renacyt_fecha_ultima_revision?: number | null;
  renacyt_orcid?: string | null;
  renacyt_scopus_author_id?: string | null;
  renacyt_ficha_url?: string | null;
  renacyt_formaciones_academicas_json?: string | null;
  grupo_nombre?: string | null;
  grupo_id?: string | null;
}

export interface ColegaProyecto {
  id_docente: string;
  nombres_apellidos: string;
  grado_nombre: string;
  es_responsable: boolean;
}

export interface RecursosProyectoResumen {
  patentes: number;
  productos: number;
  equipamientos: number;
  financiamientos: number;
}

export interface ProyectoDocenteDetalle {
  id_proyecto: string;
  titulo_proyecto: string;
  es_responsable: boolean;
  activo: boolean;
  campo_ocde?: string | null;
  programas_relacionados: string[];
  colegas: ColegaProyecto[];
  recursos_en_proyecto: RecursosProyectoResumen;
}

export interface RecursosDocenteResumen {
  patentes: PatenteConEtiquetas[];
  productos: ProductoConEtiquetas[];
  equipamientos: EquipamientoConEtiquetas[];
  total_patentes: number;
  total_productos: number;
  total_equipamientos: number;
}

export interface TrazabilidadDocente {
  updated_at?: number | null;
  fecha_ultima_sincronizacion_renacyt?: number | null;
  fecha_ultima_sincronizacion_pure?: number | null;
}

export interface ReporteDocenteIntegral {
  perfil: PerfilDocenteReporte;
  proyectos: ProyectoDocenteDetalle[];
  total_proyectos: number;
  recursos: RecursosDocenteResumen;
  publicaciones: PublicacionConEtiquetas[];
  total_publicaciones: number;
  trazabilidad: TrazabilidadDocente;
}
