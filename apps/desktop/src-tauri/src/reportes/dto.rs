use serde::Serialize;

// ═══════════════════════════════════════════════════════════════════════════════
// ReporteProyectoIntegral — Scenario: "Un proyecto, TODA su información"
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct ReporteProyectoIntegral {
    pub cabecera: ProyectoCabeceraReporte,
    pub equipo: Vec<MiembroProyectoReporte>,
    pub total_investigadores: usize,
    pub patentes: Vec<PatenteConEtiquetas>,
    pub total_patentes: usize,
    pub software_publicaciones: Vec<SoftwareConEtiquetas>,
    pub total_software: usize,
    pub equipamientos: Vec<EquipamientoConEtiquetas>,
    pub total_equipamientos: usize,
    pub financiamientos: Vec<FinanciamientoConEtiquetas>,
    pub total_financiamientos: usize,
    pub resumen_financiero: ResumenFinanciero,
}

#[derive(Debug, Serialize)]
pub struct ProyectoCabeceraReporte {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    pub activo: bool,
    pub campo_ocde: Option<String>,
    pub programas_relacionados: Vec<String>,
    pub fecha_creacion: Option<String>,
    pub fecha_actualizacion: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MiembroProyectoReporte {
    pub id_investigador: String,
    pub dni: String,
    pub nombres_apellidos: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub grado_nombre: String,
    pub grado_id: String,
    pub es_responsable: bool,
    pub renacyt_codigo_registro: Option<String>,
    pub renacyt_nivel: Option<String>,
    pub renacyt_grupo: Option<String>,
    pub renacyt_condicion: Option<String>,
    pub renacyt_orcid: Option<String>,
    pub renacyt_scopus_author_id: Option<String>,
    pub grupo_nombre: Option<String>,
    pub grupo_id: Option<String>,
    pub publicaciones_count: i64,
}

#[derive(Debug, Serialize)]
pub struct PatenteConEtiquetas {
    pub id_patente: String,
    pub titulo: String,
    pub numero_patente: Option<String>,
    pub tipo_codigo: Option<String>,
    pub tipo_nombre: Option<String>,
    pub estado_codigo: Option<String>,
    pub estado_nombre: Option<String>,
    pub fecha_solicitud: Option<i64>,
    pub fecha_concesion: Option<i64>,
    pub pais: Option<String>,
    pub entidad_concedente: Option<String>,
    pub descripcion: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SoftwareConEtiquetas {
    pub id_publicacion: String,
    pub titulo: String,
    pub tipo: String,
    pub doi: Option<String>,
    pub fecha_publicacion: Option<i64>,
    pub descripcion: Option<String>,
    pub idioma: Option<String>,
    pub acceso_abierto: Option<String>,
    pub pure_uuid: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EquipamientoConEtiquetas {
    pub id_equipamiento: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub especificaciones: Option<String>,
    pub valor_estimado: Option<f64>,
    pub moneda_codigo: Option<String>,
    pub moneda_nombre: Option<String>,
    pub proveedor: Option<String>,
    pub fecha_adquisicion: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct FinanciamientoConEtiquetas {
    pub id_financiamiento: String,
    pub entidad_financiadora: String,
    pub tipo_codigo: Option<String>,
    pub tipo_nombre: Option<String>,
    pub monto: Option<f64>,
    pub moneda_codigo: Option<String>,
    pub moneda_nombre: Option<String>,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub descripcion: Option<String>,
    pub estado_financiero_codigo: Option<String>,
    pub estado_financiero_nombre: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ResumenFinanciero {
    pub total_financiamientos: usize,
    pub desglose_por_moneda: Vec<MonedaDesglose>,
    pub desglose_por_estado: Vec<EstadoDesglose>,
}

#[derive(Debug, Serialize)]
pub struct MonedaDesglose {
    pub moneda_codigo: String,
    pub moneda_nombre: String,
    pub cantidad: usize,
    pub monto_total: f64,
}

#[derive(Debug, Serialize)]
pub struct EstadoDesglose {
    pub estado_codigo: String,
    pub estado_nombre: String,
    pub cantidad: usize,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReporteInvestigadorIntegral — Scenario: "Un investigador, TODA su información"
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct ReporteInvestigadorIntegral {
    pub perfil: PerfilInvestigadorReporte,
    pub proyectos: Vec<ProyectoInvestigadorDetalle>,
    pub total_proyectos: usize,
    pub recursos: RecursosInvestigadorResumen,
    pub publicaciones: Vec<PublicacionConEtiquetas>,
    pub total_publicaciones: usize,
    pub trazabilidad: TrazabilidadInvestigador,
}

#[derive(Debug, Serialize)]
pub struct PerfilInvestigadorReporte {
    pub id_investigador: String,
    pub dni: String,
    pub nombres_apellidos: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub grado_nombre: String,
    pub grado_id: String,
    pub renacyt_codigo_registro: Option<String>,
    pub renacyt_id_investigador: Option<String>,
    pub renacyt_nivel: Option<String>,
    pub renacyt_grupo: Option<String>,
    pub renacyt_condicion: Option<String>,
    pub renacyt_fecha_informe_calificacion: Option<i64>,
    pub renacyt_fecha_registro: Option<i64>,
    pub renacyt_fecha_ultima_revision: Option<i64>,
    pub renacyt_orcid: Option<String>,
    pub renacyt_scopus_author_id: Option<String>,
    pub renacyt_ficha_url: Option<String>,
    pub renacyt_formaciones_academicas_json: Option<String>,
    pub grupo_nombre: Option<String>,
    pub grupo_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProyectoInvestigadorDetalle {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    pub es_responsable: bool,
    pub activo: bool,
    pub campo_ocde: Option<String>,
    pub programas_relacionados: Vec<String>,
    pub colegas: Vec<ColegaProyecto>,
    pub recursos_en_proyecto: RecursosProyectoResumen,
}

#[derive(Debug, Serialize)]
pub struct ColegaProyecto {
    pub id_investigador: String,
    pub nombres_apellidos: String,
    pub grado_nombre: String,
    pub es_responsable: bool,
}

#[derive(Debug, Serialize)]
pub struct RecursosProyectoResumen {
    pub patentes: usize,
    pub software: usize,
    pub equipamientos: usize,
    pub financiamientos: usize,
}

#[derive(Debug, Serialize)]
pub struct RecursosInvestigadorResumen {
    pub patentes: Vec<PatenteConEtiquetas>,
    pub software: Vec<SoftwareConEtiquetas>,
    pub equipamientos: Vec<EquipamientoConEtiquetas>,
    pub total_patentes: usize,
    pub total_software: usize,
    pub total_equipamientos: usize,
}

#[derive(Debug, Serialize)]
pub struct TrazabilidadInvestigador {
    pub updated_at: Option<i64>,
    pub fecha_ultima_sincronizacion_renacyt: Option<i64>,
    pub fecha_ultima_sincronizacion_pure: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PublicacionConEtiquetas {
    pub id_publicacion: String,
    pub titulo: String,
    pub tipo: String,
    pub doi: Option<String>,
    pub anio: Option<i32>,
    pub revista_titulo: Option<String>,
    pub issn: Option<String>,
    pub estado_publicacion: Option<String>,
    pub pure_uuid: Option<String>,
    pub dominio_origen: String,
    pub es_revisado_por_pares: bool,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pure Master List (Elsevier Pure) — export para `pure.unf.edu.pe`
//
// Genera las filas de las hojas `Persons` y `Stafforganisationrelations`
// del master list template V8 a partir de los investigadores activos de
// PJVPIN. Los nombres de campos coinciden EXACTAMENTE con las columnas de
// la plantilla para que Pure reconozca el workbook.
// ═══════════════════════════════════════════════════════════════════════════════

/// Una fila de la hoja `Persons` (26 columnas en plantilla V8; solo se
/// emiten los campos que PJVPIN puede poblar — el resto va vacio).
#[derive(Debug, Serialize)]
pub struct PureMasterlistPersonRow {
    pub person_id: String,
    pub profiled: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub title: Option<String>,
    pub title_translated: Option<String>,
    pub post_nominals: Option<String>,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub firstname_translated: Option<String>,
    pub lastname_translated: Option<String>,
    pub first_name_known_as: Option<String>,
    pub last_name_known_as: Option<String>,
    pub first_name_sorting: Option<String>,
    pub last_name_sorting: Option<String>,
    pub former_last_name: Option<String>,
    pub prior_affiliations: Option<String>,
    pub nationality: Option<String>,
    pub gender: String,
    pub visibility: String,
    pub orcid: Option<String>,
    pub profile_photo: Option<String>,
    pub client_id_1: Option<String>,
    pub client_id_2: Option<String>,
    pub client_id_3: Option<String>,
    pub externally_authenticated: String,
}

/// Una fila de la hoja `Stafforganisationrelations` (18 columnas).
#[derive(Debug, Serialize)]
pub struct PureMasterlistStaffRow {
    pub person_id: String,
    pub organisation_id: String,
    pub contract_type: Option<String>,
    pub job_title: Option<String>,
    pub job_description: Option<String>,
    pub job_description_translated: Option<String>,
    pub employed_as: String,
    pub fte: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub direct_phone_nr: Option<String>,
    pub mobile_phone_nr: Option<String>,
    pub fax_nr: Option<String>,
    pub email: Option<String>,
    pub website_url_en: Option<String>,
    pub website_url_translated: Option<String>,
    pub primary: String,
    pub staff_type: String,
}

/// Resumen no-bloqueante para mostrar en el panel antes del export.
#[derive(Debug, Serialize)]
pub struct PureMasterlistSummary {
    pub total: usize,
    pub actualizaciones_pure: usize,
    pub altas_nuevas: usize,
    pub sin_correo: usize,
    pub sin_orcid: usize,
    pub pure_remoto_total: usize,
}

/// Payload que devuelve `get_data_pure_masterlist`.
#[derive(Debug, Serialize)]
pub struct PureMasterlistData {
    pub persons: Vec<PureMasterlistPersonRow>,
    pub staff_relations: Vec<PureMasterlistStaffRow>,
    pub summary: PureMasterlistSummary,
}

/// Resultado de `sincronizar_pure_person_ids` — el contrato IPC vive en
/// `crate::shared::external::pure_cmd::SyncPurePersonIdsResultDto`.

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

impl PatenteConEtiquetas {
    pub fn from_patente(
        p: &crate::recursos::models::Patente,
        catalogo_map: &std::collections::HashMap<
            (String, String),
            crate::catalogos::models::CatalogoItem,
        >,
    ) -> Self {
        let tipo_lbl = p.tipo.as_ref().and_then(|c| {
            catalogo_map
                .get(&("tipo_patente".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        let estado_lbl = p.estado.as_ref().and_then(|c| {
            catalogo_map
                .get(&("estado_patente".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        Self {
            id_patente: p.id_patente.clone(),
            titulo: p.titulo.clone(),
            numero_patente: p.numero_patente.clone(),
            tipo_codigo: p.tipo.clone(),
            tipo_nombre: tipo_lbl,
            estado_codigo: p.estado.clone(),
            estado_nombre: estado_lbl,
            fecha_solicitud: p.fecha_solicitud,
            fecha_concesion: p.fecha_concesion,
            pais: p.pais.clone(),
            entidad_concedente: p.entidad_concedente.clone(),
            descripcion: p.descripcion.clone(),
        }
    }
}

impl SoftwareConEtiquetas {
    /// Construye un `SoftwareConEtiquetas` a partir de una `PublicacionCientifica`
    /// de tipo Software (D5: productos -> publicaciones Software).
    pub fn from_publicacion(p: &crate::publicaciones::models::PublicacionCientifica) -> Self {
        Self {
            id_publicacion: p.id_publicacion.clone(),
            titulo: p.titulo.clone(),
            tipo: p.tipo.clone(),
            doi: p.doi.clone(),
            fecha_publicacion: p.fecha_publicacion,
            descripcion: p.resumen.clone(),
            idioma: p.idioma.clone(),
            acceso_abierto: p.acceso_abierto.clone(),
            pure_uuid: p.pure_uuid.clone(),
        }
    }
}

impl PublicacionConEtiquetas {
    /// Construye el etiquetado de reporte a partir del modelo consolidado
    /// `PublicacionCientifica` (B1: el sync Pure y los reportes comparten la
    /// coleccion `publicaciones_cientificas`).
    pub fn from_publicacion(p: &crate::publicaciones::models::PublicacionCientifica) -> Self {
        Self {
            id_publicacion: p.id_publicacion.clone(),
            titulo: p.titulo.clone(),
            tipo: p.tipo.clone(),
            doi: p.doi.clone(),
            anio: p.anio,
            revista_titulo: p.revista_titulo.clone(),
            issn: p.issn.clone(),
            estado_publicacion: p.estado_publicacion.clone(),
            pure_uuid: p.pure_uuid.clone(),
            dominio_origen: p.dominio_origen.clone(),
            es_revisado_por_pares: p.es_revisado_por_pares,
        }
    }
}

impl EquipamientoConEtiquetas {
    pub fn from_equipamiento(
        e: &crate::recursos::models::Equipamiento,
        catalogo_map: &std::collections::HashMap<
            (String, String),
            crate::catalogos::models::CatalogoItem,
        >,
    ) -> Self {
        let moneda_lbl = e.moneda.as_ref().and_then(|c| {
            catalogo_map
                .get(&("moneda".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        Self {
            id_equipamiento: e.id_equipamiento.clone(),
            nombre: e.nombre.clone(),
            descripcion: e.descripcion.clone(),
            especificaciones: e.especificaciones.clone(),
            valor_estimado: e.valor_estimado,
            moneda_codigo: e.moneda.clone(),
            moneda_nombre: moneda_lbl,
            proveedor: e.proveedor.clone(),
            fecha_adquisicion: e.fecha_adquisicion,
        }
    }
}

impl FinanciamientoConEtiquetas {
    pub fn from_financiamiento(
        f: &crate::recursos::models::Financiamiento,
        catalogo_map: &std::collections::HashMap<
            (String, String),
            crate::catalogos::models::CatalogoItem,
        >,
    ) -> Self {
        let tipo_lbl = f.tipo.as_ref().and_then(|c| {
            catalogo_map
                .get(&("tipo_financiamiento".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        let moneda_lbl = f.moneda.as_ref().and_then(|c| {
            catalogo_map
                .get(&("moneda".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        let estado_lbl = f.estado_financiero.as_ref().and_then(|c| {
            catalogo_map
                .get(&("estado_financiero".to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        });
        Self {
            id_financiamiento: f.id_financiamiento.clone(),
            // Display name sourced from `f.nombre` (el campo legacy
            // `entidad_financiadora` String fue eliminado en F3/D10; el
            // nombre visible del fondo ahora vive en `Financiamiento.nombre`).
            entidad_financiadora: f.nombre.clone().unwrap_or_default(),
            tipo_codigo: f.tipo.clone(),
            tipo_nombre: tipo_lbl,
            monto: f.monto,
            moneda_codigo: f.moneda.clone(),
            moneda_nombre: moneda_lbl,
            fecha_inicio: f.fecha_inicio,
            fecha_fin: f.fecha_fin,
            descripcion: f.descripcion.clone(),
            estado_financiero_codigo: f.estado_financiero.clone(),
            estado_financiero_nombre: estado_lbl,
        }
    }
}
