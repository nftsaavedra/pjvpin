/**
 * DTOs de respuesta de los 3 reportes integrales
 * (`GET /reportes/integral/proyecto/:id`, `/integral/investigador/:id`,
 * `/integral/investigadores`).
 *
 * Port 1:1 de `apps/desktop/src-tauri/src/reportes/dto.rs` (structs sin
 * `rename_all`, es decir snake_case tanto en Rust como aqui).
 */
import type { ResumenFinanciero } from "./moneda-desglose.dto";

// ═══════════════════════════════════════════════════════════════════
// Etiquetados compartidos (proyecto integral + investigador integral)
// ═══════════════════════════════════════════════════════════════════

export class PatenteConEtiquetas {
  id_patente!: string;
  titulo!: string;
  numero_patente!: string | null;
  tipo_codigo!: string | null;
  tipo_nombre!: string | null;
  estado_codigo!: string | null;
  estado_nombre!: string | null;
  fecha_solicitud!: number | null;
  fecha_concesion!: number | null;
  pais!: string | null;
  entidad_concedente!: string | null;
  descripcion!: string | null;
}

export class SoftwareConEtiquetas {
  id_publicacion!: string;
  titulo!: string;
  tipo!: string;
  doi!: string | null;
  /** Drift documentado: string ISO en el API (ms epoch en el Rust legacy). */
  fecha_publicacion!: string | null;
  descripcion!: string | null;
  idioma!: string | null;
  acceso_abierto!: string | null;
  pure_uuid!: string | null;
}

export class EquipamientoConEtiquetas {
  id_equipamiento!: string;
  nombre!: string;
  descripcion!: string | null;
  especificaciones!: string | null;
  valor_estimado!: number | null;
  moneda_codigo!: string | null;
  moneda_nombre!: string | null;
  proveedor!: string | null;
  fecha_adquisicion!: number | null;
}

export class FinanciamientoConEtiquetas {
  id_financiamiento!: string;
  entidad_financiadora!: string;
  tipo_codigo!: string | null;
  tipo_nombre!: string | null;
  monto!: number | null;
  moneda_codigo!: string | null;
  moneda_nombre!: string | null;
  fecha_inicio!: number | null;
  fecha_fin!: number | null;
  descripcion!: string | null;
  estado_financiero_codigo!: string | null;
  estado_financiero_nombre!: string | null;
}

export class PublicacionConEtiquetas {
  id_publicacion!: string;
  titulo!: string;
  tipo!: string;
  doi!: string | null;
  anio!: number | null;
  revista_titulo!: string | null;
  issn!: string | null;
  estado_publicacion!: string | null;
  pure_uuid!: string | null;
  dominio_origen!: string;
  es_revisado_por_pares!: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ReporteProyectoIntegral
// ═══════════════════════════════════════════════════════════════════

export class ProyectoCabeceraReporte {
  id_proyecto!: string;
  titulo_proyecto!: string;
  activo!: boolean;
  campo_ocde!: string | null;
  programas_relacionados!: string[];
  fecha_creacion!: string | null;
  fecha_actualizacion!: string | null;
}

export class MiembroProyectoReporte {
  id_investigador!: string;
  dni!: string;
  nombres_apellidos!: string;
  nombres!: string | null;
  apellido_paterno!: string | null;
  apellido_materno!: string | null;
  grado_nombre!: string;
  grado_id!: string;
  es_responsable!: boolean;
  renacyt_codigo_registro!: string | null;
  renacyt_nivel!: string | null;
  renacyt_grupo!: string | null;
  renacyt_condicion!: string | null;
  renacyt_orcid!: string | null;
  renacyt_scopus_author_id!: string | null;
  grupo_nombre!: string | null;
  grupo_id!: string | null;
  publicaciones_count!: number;
}

export class ReporteProyectoIntegral {
  cabecera!: ProyectoCabeceraReporte;
  equipo!: MiembroProyectoReporte[];
  total_investigadores!: number;
  patentes!: PatenteConEtiquetas[];
  total_patentes!: number;
  software_publicaciones!: SoftwareConEtiquetas[];
  total_software!: number;
  equipamientos!: EquipamientoConEtiquetas[];
  total_equipamientos!: number;
  financiamientos!: FinanciamientoConEtiquetas[];
  total_financiamientos!: number;
  resumen_financiero!: ResumenFinanciero;
}

// ═══════════════════════════════════════════════════════════════════
// ReporteInvestigadorIntegral
// ═══════════════════════════════════════════════════════════════════

export class PerfilInvestigadorReporte {
  id_investigador!: string;
  dni!: string;
  nombres_apellidos!: string;
  nombres!: string | null;
  apellido_paterno!: string | null;
  apellido_materno!: string | null;
  grado_nombre!: string;
  grado_id!: string;
  renacyt_codigo_registro!: string | null;
  renacyt_id_investigador!: string | null;
  renacyt_nivel!: string | null;
  renacyt_grupo!: string | null;
  renacyt_condicion!: string | null;
  renacyt_fecha_informe_calificacion!: number | null;
  renacyt_fecha_registro!: number | null;
  renacyt_fecha_ultima_revision!: number | null;
  renacyt_orcid!: string | null;
  renacyt_scopus_author_id!: string | null;
  renacyt_ficha_url!: string | null;
  renacyt_formaciones_academicas_json!: string | null;
  grupo_nombre!: string | null;
  grupo_id!: string | null;
}

export class ColegaProyecto {
  id_investigador!: string;
  nombres_apellidos!: string;
  grado_nombre!: string;
  es_responsable!: boolean;
}

export class RecursosProyectoResumen {
  patentes!: number;
  software!: number;
  equipamientos!: number;
  financiamientos!: number;
}

export class ProyectoInvestigadorDetalle {
  id_proyecto!: string;
  titulo_proyecto!: string;
  es_responsable!: boolean;
  activo!: boolean;
  campo_ocde!: string | null;
  programas_relacionados!: string[];
  colegas!: ColegaProyecto[];
  recursos_en_proyecto!: RecursosProyectoResumen;
}

export class RecursosInvestigadorResumen {
  patentes!: PatenteConEtiquetas[];
  software!: SoftwareConEtiquetas[];
  equipamientos!: EquipamientoConEtiquetas[];
  total_patentes!: number;
  total_software!: number;
  total_equipamientos!: number;
}

export class TrazabilidadInvestigador {
  updated_at!: number | null;
  fecha_ultima_sincronizacion_renacyt!: number | null;
  fecha_ultima_sincronizacion_pure!: number | null;
}

export class ReporteInvestigadorIntegral {
  perfil!: PerfilInvestigadorReporte;
  proyectos!: ProyectoInvestigadorDetalle[];
  total_proyectos!: number;
  recursos!: RecursosInvestigadorResumen;
  publicaciones!: PublicacionConEtiquetas[];
  total_publicaciones!: number;
  trazabilidad!: TrazabilidadInvestigador;
}
