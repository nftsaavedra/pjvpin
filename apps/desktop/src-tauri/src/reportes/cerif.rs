//! Exportador CERIF/PeruCRIS (formato JSON).
//!
//! # Decision de formato (v0.1.0)
//!
//! El formato de salida es **JSON alineado a la estructura de entidades
//! CERIF/PeruCRIS** (`OrgUnit`, `Person`, `ResultProject`,
//! `ResultPublication`, `ResultPatent`) en lugar de CERIF XML real
//! (serializacion XML tipada con namespaces). Motivos:
//!
//! - El conector HTTP de PeruCRIS (B3) consume JSON (`application/json`),
//!   por lo que el payload de push reutiliza este serializador sin
//!   conversion extra.
//! - Para una desktop app v0.1.0 un unico contrato JSON es mas simple,
//!   testeable y suficiente para intercambiar el modelo consolidado.
//!
//! **Deuda tecnica**: CERIF XML real (estructura `<CERIF>` con
//! `cfProject`/`cfResPubl`/etc.) queda como fase futura si PeruCRIS llega a
//! exigir XML en el endpoint de ingesta.
//!
//! Los mappers dominio -> SKOS (`genero_to_skos`, `naturaleza_to_skos`) se
//! aplican aqui (capa DTO al exportar), no se persisten en el modelo.
//! Los `campos_ocde` se leen del pivot polimorfico `entity_ocde_fields`.

use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;
use serde::Serialize;

use crate::org_units::models::OrgUnit;
use crate::proyectos::models::{ParticipacionRecord, Proyecto};
use crate::recursos::models::{Financiamiento, Patente};
use crate::shared::error::AppError;
use crate::shared::time;
use crate::shared::vocab_mapper;

// ─── Alcance del exportador ───────────────────────────────────────────────────

/// Entidad (o conjunto) a exportar. `Todo` genera el documento completo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CerifScope {
    Todo,
    Organizaciones,
    Personas,
    Proyectos,
    Publicaciones,
    Patentes,
}

/// Parsea el argumento opcional `entidad` del command `exportar_cerif`.
/// Acepta nombres en singular/plural y variantes snake/camel.
pub fn parse_scope(entidad: Option<&str>) -> Result<CerifScope, AppError> {
    match entidad.map(|s| s.trim().to_lowercase()).as_deref() {
        None | Some("") | Some("todo") | Some("all") => Ok(CerifScope::Todo),
        Some("organizaciones") | Some("organizacion") | Some("org_units") | Some("orgunits") => {
            Ok(CerifScope::Organizaciones)
        }
        Some("personas") | Some("persona") | Some("investigadores") | Some("investigador") => {
            Ok(CerifScope::Personas)
        }
        Some("proyectos") | Some("proyecto") => Ok(CerifScope::Proyectos),
        Some("publicaciones") | Some("publicacion") => Ok(CerifScope::Publicaciones),
        Some("patentes") | Some("patente") => Ok(CerifScope::Patentes),
        Some(other) => Err(AppError::InternalError(format!(
            "Entidad CERIF desconocida: '{other}'. Valores permitidos: \
             todo, organizaciones, personas, proyectos, publicaciones, patentes."
        ))),
    }
}

// ─── Documento raiz ───────────────────────────────────────────────────────────

/// Documento CERIF de salida (snake_case, `serde::Serialize`).
#[derive(Debug, Serialize)]
pub struct CerifDocument {
    /// Identificador de esquema del payload.
    pub schema: String,
    /// Timestamp de generacion (epoch ms, `shared::time::now_ms`).
    pub generado_en: i64,
    pub organizaciones: Vec<CerifOrgUnit>,
    pub personas: Vec<CerifPerson>,
    pub proyectos: Vec<CerifProyecto>,
    pub publicaciones: Vec<CerifPublicacion>,
    pub patentes: Vec<CerifPatente>,
}

impl CerifDocument {
    pub fn new() -> Self {
        Self {
            schema: "pjvpin/cerif-json/0.1".to_string(),
            generado_en: time::now_ms(),
            organizaciones: Vec::new(),
            personas: Vec::new(),
            proyectos: Vec::new(),
            publicaciones: Vec::new(),
            patentes: Vec::new(),
        }
    }
}

impl Default for CerifDocument {
    fn default() -> Self {
        Self::new()
    }
}

/// Resultado resumido devuelto al frontend tras exportar.
#[derive(Debug, Serialize)]
pub struct CerifExportResult {
    pub entidad: String,
    pub total_organizaciones: usize,
    pub total_personas: usize,
    pub total_proyectos: usize,
    pub total_publicaciones: usize,
    pub total_patentes: usize,
    pub bytes: usize,
}

impl CerifExportResult {
    pub fn from_document(entidad: &str, doc: &CerifDocument, bytes: usize) -> Self {
        Self {
            entidad: entidad.to_string(),
            total_organizaciones: doc.organizaciones.len(),
            total_personas: doc.personas.len(),
            total_proyectos: doc.proyectos.len(),
            total_publicaciones: doc.publicaciones.len(),
            total_patentes: doc.patentes.len(),
            bytes,
        }
    }
}

/// Serializa el documento a JSON (pretty) como bytes para escritura en disco.
pub fn cerif_to_json_bytes(doc: &CerifDocument) -> Result<Vec<u8>, AppError> {
    serde_json::to_vec_pretty(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo serializar el documento CERIF a JSON: {e}"
        ))
    })
}

// ─── Entidades CERIF ──────────────────────────────────────────────────────────

/// OrgUnit (estructura institucional CERIF, jerarquica por `parent_id`).
#[derive(Debug, Serialize)]
pub struct CerifOrgUnit {
    pub id_org_unit: String,
    pub nombre: String,
    /// Codigo SKOS del vocab `concytec_tipo_subunidad`/`tipo_organizacion`.
    pub tipo_organizacion: Option<String>,
    pub tipo_dependencia: Option<String>,
    /// Codigo SKOS del vocab `ocde_naturaleza_institucion` (publica/privada).
    pub naturaleza: Option<String>,
    pub es_publica: bool,
    pub ruc: Option<String>,
    pub ror_id: Option<String>,
    pub isni_id: Option<String>,
    pub scopus_id: Option<String>,
    pub ubigeo_codigo: Option<String>,
    pub sector_institucional: Option<String>,
    pub tipo_educacion_superior: Option<String>,
    pub ciiu_codigo: Option<String>,
    pub parent_id: Option<String>,
    pub campos_ocde: Vec<String>,
    /// Alineamiento N2-G: UUID canonico PeruCRIS (se usa para sync/validacion).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub perucris_uuid: Option<String>,
    /// Alineamiento N2-G: handle persistente PeruCRIS (ej: 123456789/53485).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub perucris_handle: Option<String>,
}

/// Person con identidad de investigacion (Investigador + Persona).
#[derive(Debug, Serialize)]
pub struct CerifPerson {
    pub id_persona: String,
    pub id_investigador: Option<String>,
    pub dni: String,
    /// DNI | CE | PASAPORTE (`vocab_mapper::DOC_TYPE_*`).
    pub tipo_documento: Option<String>,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub nombre_completo: String,
    /// Codigo SKOS `concytec_terminos` (masculino/femenino).
    pub sexo_skos: Option<String>,
    pub orcid: Option<String>,
    pub scopus_author_id: Option<String>,
    pub renacyt_codigo_registro: Option<String>,
    pub renacyt_nivel: Option<String>,
}

/// ResultProject con participantes, financiamientos, organizaciones y OCDE.
#[derive(Debug, Serialize)]
pub struct CerifProyecto {
    pub id_proyecto: String,
    pub titulo: String,
    pub codigo: String,
    /// Codigos SKOS (`ocde_tipo_proyecto`, `concytec_terminos`,
    /// `concytec_estado_proyecto`, `minam_tematicas_ambientales`,
    /// `ins_tematicas_salud`).
    pub tipo_actividad_ocde: Option<String>,
    pub ambito_geografico: Option<String>,
    pub estado_concytec: Option<String>,
    pub tematica_ambiental: Option<String>,
    pub tematica_salud: Option<String>,
    pub campo_ocde: Option<String>,
    pub programas_relacionados: Vec<String>,
    /// Codigos `ocde_ford` del pivot `entity_ocde_fields`.
    pub campos_ocde: Vec<String>,
    pub participantes: Vec<CerifParticipante>,
    pub financiamientos: Vec<CerifProyectoFinanciamiento>,
    pub organizaciones: Vec<CerifProyectoOrganizacion>,
    /// UUID canónico PeruCRIS. Permite re-vincular la entidad en una
    /// importación posterior o un push incremental.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub perucris_uuid: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CerifParticipante {
    pub id_investigador: String,
    pub id_persona: Option<String>,
    pub nombre_completo: Option<String>,
    /// Rol canonico (`vocab_mapper::ROLE_*`).
    pub rol: String,
    pub es_responsable: bool,
    pub id_org_unit_afiliacion: Option<String>,
    pub horas_dedicacion_semanal: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct CerifProyectoFinanciamiento {
    pub id_financiamiento: String,
    pub codigo: Option<String>,
    pub nombre: Option<String>,
    pub modalidad: Option<String>,
    pub id_org_unit_financiadora: Option<String>,
    /// Monto asignado en el pivot `proyecto_financiamientos`.
    pub monto_asignado: Option<f64>,
    pub moneda: String,
    /// Monto declarado en el Financiamiento.
    pub monto: Option<f64>,
}

/// Proyecto-organizacion (pivot `proyecto_organizaciones`).
#[derive(Debug, Clone, Serialize)]
pub struct CerifProyectoOrganizacion {
    pub id_org_unit: String,
    pub nombre: Option<String>,
    /// Rol (`vocab_mapper::ORG_ROL_*`).
    pub rol: String,
}

/// ResultPublication (modelo consolidado `publicaciones_cientificas`).
#[derive(Debug, Serialize)]
pub struct CerifPublicacion {
    pub id_publicacion: String,
    pub titulo: String,
    /// Subconjunto `concytec_terminos`/CERIF EN (`vocab_mapper`).
    pub tipo: String,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub isbn: Option<String>,
    pub anio: Option<i32>,
    pub fecha_publicacion: Option<i64>,
    pub revista_titulo: Option<String>,
    pub editorial: Option<String>,
    pub id_org_unit_editora: Option<String>,
    pub volumen: Option<String>,
    pub numero_issue: Option<String>,
    pub paginas: Option<String>,
    /// ISO 639-1 (2 letras lowercase).
    pub idioma: Option<String>,
    pub resumen: Option<String>,
    pub palabras_clave: Vec<String>,
    /// Codigo SKOS (`vocab_mapper::ACCESO_ABIERTO_*`).
    pub acceso_abierto: Option<String>,
    pub scimago_cuartil: Option<String>,
    pub wos_cuartil: Option<String>,
    pub es_revisado_por_pares: bool,
    pub handle_url: Option<String>,
    pub estado_publicacion: Option<String>,
    /// MANUAL | PURE.
    pub dominio_origen: String,
    pub pure_uuid: Option<String>,
    /// FK denormalizada a proyectos (D5: software/publicacion producto).
    pub id_proyecto: Option<String>,
    pub autores: Vec<CerifAutor>,
}

#[derive(Debug, Serialize)]
pub struct CerifAutor {
    pub id_persona: String,
    pub nombre_completo: String,
    pub orden: i32,
    pub es_autor_correspondiente: bool,
    pub id_org_unit_afiliacion: Option<String>,
}

/// ResultPatent con inventores, titulares y OCDE.
#[derive(Debug, Serialize)]
pub struct CerifPatente {
    pub id_patente: String,
    pub titulo: String,
    pub numero_patente: Option<String>,
    /// `vocab_mapper::PATENTE_TIPO_*`.
    pub tipo: Option<String>,
    pub estado: Option<String>,
    pub fecha_solicitud: Option<i64>,
    pub fecha_concesion: Option<i64>,
    pub pais: Option<String>,
    pub entidad_concedente: Option<String>,
    pub id_org_unit_concedente: Option<String>,
    pub clasificacion_ipc: Option<String>,
    pub descripcion: Option<String>,
    pub proyecto_id: Option<String>,
    pub inventores: Vec<CerifPersonaRef>,
    pub titulares: Vec<CerifTitular>,
    pub campos_ocde: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CerifPersonaRef {
    pub id_persona: String,
    pub nombre_completo: String,
}

#[derive(Debug, Serialize)]
pub struct CerifTitular {
    /// `vocab_mapper::HOLDER_TYPE_*` (ORG_UNIT | PERSON).
    pub holder_type: String,
    pub id_org_unit: Option<String>,
    pub id_persona: Option<String>,
    pub nombre: Option<String>,
}

// ─── Carga desde Mongo ────────────────────────────────────────────────────────

/// Construye el documento CERIF leyendo el modelo consolidado + pivots +
/// `entity_ocde_fields`, segun el alcance pedido.
pub async fn build_cerif_document(
    db: &Database,
    scope: CerifScope,
) -> Result<CerifDocument, AppError> {
    let mut doc = CerifDocument::new();
    match scope {
        CerifScope::Todo => {
            doc.organizaciones = load_org_units(db).await?;
            doc.personas = load_personas(db).await?;
            doc.proyectos = load_proyectos(db).await?;
            doc.publicaciones = load_publicaciones(db).await?;
            doc.patentes = load_patentes(db).await?;
        }
        CerifScope::Organizaciones => doc.organizaciones = load_org_units(db).await?,
        CerifScope::Personas => doc.personas = load_personas(db).await?,
        CerifScope::Proyectos => doc.proyectos = load_proyectos(db).await?,
        CerifScope::Publicaciones => doc.publicaciones = load_publicaciones(db).await?,
        CerifScope::Patentes => doc.patentes = load_patentes(db).await?,
    }
    Ok(doc)
}

async fn ocde_codigos(
    db: &Database,
    entity_type: &str,
    entity_id: &str,
) -> Result<Vec<String>, AppError> {
    let fields = crate::ocde::repository::listar_campos_ocde(db, entity_type, entity_id).await?;
    Ok(fields.into_iter().map(|f| f.ocde_codigo).collect())
}

async fn load_org_units(db: &Database) -> Result<Vec<CerifOrgUnit>, AppError> {
    let map = load_org_units_map(db).await?;
    let mut out = Vec::with_capacity(map.len());
    for (id, org) in map {
        let ocde = ocde_codigos(db, vocab_mapper::ENTITY_TYPE_ORG_UNIT, &id).await?;
        out.push(cerif_org_unit_from(&org, &ocde));
    }
    out.sort_by(|a, b| a.id_org_unit.cmp(&b.id_org_unit));
    Ok(out)
}

async fn load_org_units_map(db: &Database) -> Result<HashMap<String, OrgUnit>, AppError> {
    use crate::org_units::dto::OrgUnitDoc;
    let cursor = db
        .collection::<Document>("org_units")
        .find(doc! { "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map = HashMap::with_capacity(docs.len());
    for d in docs {
        let od: OrgUnitDoc = mongodb::bson::from_document(d)
            .map_err(|e| AppError::InternalError(format!("BSON->OrgUnitDoc: {e}")))?;
        map.insert(
            od.id_org_unit.clone(),
            OrgUnit {
                id_org_unit: od.id_org_unit,
                nombre: od.nombre,
                ubigeo_codigo: od.ubigeo_codigo,
                ruc: od.ruc,
                ror_id: od.ror_id,
                isni_id: od.isni_id,
                scopus_id: od.scopus_id,
                sector_institucional: od.sector_institucional,
                tipo_organizacion: od.tipo_organizacion,
                tipo_dependencia: od.tipo_dependencia,
                tipo_educacion_superior: od.tipo_educacion_superior,
                ciiu_codigo: od.ciiu_codigo,
                es_publica: od.es_publica,
                parent_id: od.parent_id,
                activo: od.activo,
                created_at: od.created_at,
                updated_at: od.updated_at,
                legal_name: od.legal_name,
                acronimo: od.acronimo,
                web_site: od.web_site,
                direccion: od.direccion,
                pais: od.pais,
                descripcion: od.descripcion,
                rin_id: od.rin_id,
                sunedu_clasificacion: od.sunedu_clasificacion,
                sunedu_estado: od.sunedu_estado,
                sunedu_resolucion: od.sunedu_resolucion,
                perucris_uuid: od.perucris_uuid,
                perucris_handle: od.perucris_handle,
            },
        );
    }
    Ok(map)
}

async fn load_personas(db: &Database) -> Result<Vec<CerifPerson>, AppError> {
    let personas = crate::personas::repository::load_all_map(db).await?;
    let investigadores = crate::investigadores::repository::get_all_investigadores(db).await?;
    let mut out = Vec::with_capacity(investigadores.len());
    for inv in investigadores {
        let Some(persona) = personas.get(&inv.persona_id) else {
            continue;
        };
        out.push(cerif_person_from(persona, &inv));
    }
    out.sort_by(|a, b| a.id_persona.cmp(&b.id_persona));
    Ok(out)
}

async fn load_proyectos(db: &Database) -> Result<Vec<CerifProyecto>, AppError> {
    use crate::proyectos::dto::ProyectoDto;
    let cursor = db
        .collection::<Document>("proyectos")
        .find(doc! { "activo": true })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;

    let personas = crate::personas::repository::load_all_map(db).await?;
    let investigadores = crate::investigadores::repository::get_all_investigadores(db).await?;
    let investigadores_map: HashMap<String, crate::investigadores::models::Investigador> =
        investigadores
            .into_iter()
            .map(|i| (i.id_investigador.clone(), i))
            .collect();
    let org_units_map = load_org_units_map(db).await?;

    let mut out = Vec::with_capacity(docs.len());
    for d in docs {
        let pd: ProyectoDto = mongodb::bson::from_document(d)
            .map_err(|e| AppError::InternalError(format!("BSON->ProyectoDto: {e}")))?;
        let proyecto = Proyecto::try_from(pd)?;
        let participaciones = load_participaciones(db, &proyecto.id_proyecto).await?;
        let financiamientos = load_financiamientos_for(db, &proyecto.id_proyecto).await?;
        let organizaciones =
            load_organizaciones_for(db, &proyecto.id_proyecto, &org_units_map).await?;
        let ocde =
            ocde_codigos(db, vocab_mapper::ENTITY_TYPE_PROJECT, &proyecto.id_proyecto).await?;
        out.push(cerif_proyecto_from(
            &proyecto,
            &participaciones,
            &personas,
            &investigadores_map,
            &financiamientos,
            &organizaciones,
            &ocde,
        ));
    }
    out.sort_by(|a, b| a.id_proyecto.cmp(&b.id_proyecto));
    Ok(out)
}

async fn load_participaciones(
    db: &Database,
    id_proyecto: &str,
) -> Result<Vec<ParticipacionRecord>, AppError> {
    use crate::proyectos::dto::ParticipacionRecordDto;
    let cursor = db
        .collection::<Document>("participaciones")
        .find(doc! { "id_proyecto": id_proyecto })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| {
            let dto: ParticipacionRecordDto = mongodb::bson::from_document(d).map_err(|e| {
                AppError::InternalError(format!("BSON->ParticipacionRecordDto: {e}"))
            })?;
            ParticipacionRecord::try_from(dto)
        })
        .collect()
}

async fn load_financiamientos_for(
    db: &Database,
    id_proyecto: &str,
) -> Result<
    Vec<(
        crate::proyectos::proyecto_financiamientos::ProyectoFinanciamiento,
        Financiamiento,
    )>,
    AppError,
> {
    use crate::proyectos::proyecto_financiamientos::repository as pf_repo;
    use crate::recursos::dto::FinanciamientoDto;
    let pivots = pf_repo::list_by_proyecto(db, id_proyecto).await?;
    if pivots.is_empty() {
        return Ok(Vec::new());
    }
    let ids: Vec<String> = pivots.iter().map(|p| p.id_financiamiento.clone()).collect();
    let cursor = db
        .collection::<Document>("financiamientos")
        .find(doc! { "id_financiamiento": { "$in": &ids }, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map: HashMap<String, Financiamiento> = HashMap::with_capacity(docs.len());
    for d in docs {
        let fd: FinanciamientoDto = mongodb::bson::from_document(d)
            .map_err(|e| AppError::InternalError(format!("BSON->FinanciamientoDto: {e}")))?;
        let m = Financiamiento::try_from(fd)?;
        map.insert(m.id_financiamiento.clone(), m);
    }
    Ok(pivots
        .into_iter()
        .filter_map(|p| map.get(&p.id_financiamiento).map(|f| (p, f.clone())))
        .collect())
}

async fn load_organizaciones_for(
    db: &Database,
    id_proyecto: &str,
    org_units_map: &HashMap<String, OrgUnit>,
) -> Result<Vec<CerifProyectoOrganizacion>, AppError> {
    let pivots =
        crate::proyectos::proyecto_organizaciones::repository::list_by_proyecto(db, id_proyecto)
            .await?;
    Ok(pivots
        .into_iter()
        .map(|p| CerifProyectoOrganizacion {
            id_org_unit: p.id_org_unit.clone(),
            nombre: org_units_map.get(&p.id_org_unit).map(|o| o.nombre.clone()),
            rol: p.rol,
        })
        .collect())
}

async fn load_publicaciones(db: &Database) -> Result<Vec<CerifPublicacion>, AppError> {
    let publicaciones = crate::publicaciones::repository::get_all(db).await?;
    let personas = crate::personas::repository::load_all_map(db).await?;
    let mut out = Vec::with_capacity(publicaciones.len());
    for pub_model in publicaciones {
        let autores = crate::publicaciones::autores::repository::list_by_publicacion(
            db,
            &pub_model.id_publicacion,
        )
        .await?;
        out.push(cerif_publicacion_from(&pub_model, &autores, &personas));
    }
    out.sort_by(|a, b| a.id_publicacion.cmp(&b.id_publicacion));
    Ok(out)
}

async fn load_patentes(db: &Database) -> Result<Vec<CerifPatente>, AppError> {
    use crate::recursos::dto::PatenteDto;
    let cursor = db
        .collection::<Document>("patentes")
        .find(doc! { "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let personas = crate::personas::repository::load_all_map(db).await?;
    let org_units = load_org_units_map(db).await?;
    let mut out = Vec::with_capacity(docs.len());
    for d in docs {
        let pd: PatenteDto = mongodb::bson::from_document(d)
            .map_err(|e| AppError::InternalError(format!("BSON->PatenteDto: {e}")))?;
        let patente = Patente::try_from(pd)?;
        let inventores = crate::recursos::patente_inventores::repository::list_by_patente(
            db,
            &patente.id_patente,
        )
        .await?;
        let titulares = crate::recursos::patente_titulares::repository::list_by_patente(
            db,
            &patente.id_patente,
        )
        .await?;
        let ocde = ocde_codigos(db, vocab_mapper::ENTITY_TYPE_PATENT, &patente.id_patente).await?;
        out.push(cerif_patente_from(
            &patente,
            &inventores,
            &titulares,
            &personas,
            &org_units,
            &ocde,
        ));
    }
    out.sort_by(|a, b| a.id_patente.cmp(&b.id_patente));
    Ok(out)
}

// ─── Mappers modelo -> entidad CERIF (puros, testeables sin Mongo) ───────────

pub(crate) fn cerif_org_unit_from(org: &OrgUnit, ocde: &[String]) -> CerifOrgUnit {
    CerifOrgUnit {
        id_org_unit: org.id_org_unit.clone(),
        nombre: org.nombre.clone(),
        tipo_organizacion: Some(org.tipo_organizacion.clone()),
        tipo_dependencia: org.tipo_dependencia.clone(),
        naturaleza: Some(vocab_mapper::naturaleza_to_skos(org.es_publica).to_string()),
        es_publica: org.es_publica,
        ruc: org.ruc.clone(),
        ror_id: org.ror_id.clone(),
        isni_id: org.isni_id.clone(),
        scopus_id: org.scopus_id.clone(),
        ubigeo_codigo: org.ubigeo_codigo.clone(),
        sector_institucional: org.sector_institucional.clone(),
        tipo_educacion_superior: org.tipo_educacion_superior.clone(),
        ciiu_codigo: org.ciiu_codigo.clone(),
        parent_id: org.parent_id.clone(),
        campos_ocde: ocde.to_vec(),
        perucris_uuid: org.perucris_uuid.clone(),
        perucris_handle: org.perucris_handle.clone(),
    }
}

fn cerif_person_from(
    persona: &crate::personas::models::Persona,
    inv: &crate::investigadores::models::Investigador,
) -> CerifPerson {
    CerifPerson {
        id_persona: persona.id_persona.clone(),
        id_investigador: Some(inv.id_investigador.clone()),
        dni: persona.dni.clone(),
        tipo_documento: inv.tipo_documento.clone(),
        nombres: persona.nombres.clone(),
        apellido_paterno: persona.apellido_paterno.clone(),
        apellido_materno: persona.apellido_materno.clone(),
        nombre_completo: persona.nombre_completo.clone(),
        sexo_skos: vocab_mapper::genero_to_skos(persona.sexo.as_deref()),
        orcid: inv.renacyt_orcid.clone(),
        scopus_author_id: inv.renacyt_scopus_author_id.clone(),
        renacyt_codigo_registro: inv.renacyt_codigo_registro.clone(),
        renacyt_nivel: inv.renacyt_nivel.clone(),
    }
}

fn cerif_proyecto_from(
    proyecto: &Proyecto,
    participaciones: &[ParticipacionRecord],
    personas: &HashMap<String, crate::personas::models::Persona>,
    investigadores_map: &HashMap<String, crate::investigadores::models::Investigador>,
    financiamientos: &[(
        crate::proyectos::proyecto_financiamientos::ProyectoFinanciamiento,
        Financiamiento,
    )],
    organizaciones: &[CerifProyectoOrganizacion],
    ocde: &[String],
) -> CerifProyecto {
    let participantes = participaciones
        .iter()
        .map(|p| {
            let (id_persona, nombre_completo) = investigadores_map
                .get(&p.id_investigador)
                .and_then(|inv| personas.get(&inv.persona_id))
                .map(|per| {
                    (
                        Some(per.id_persona.clone()),
                        Some(per.nombre_completo.clone()),
                    )
                })
                .unwrap_or((None, None));
            CerifParticipante {
                id_investigador: p.id_investigador.clone(),
                id_persona,
                nombre_completo,
                rol: p.rol.clone(),
                es_responsable: p.es_responsable,
                id_org_unit_afiliacion: p.id_org_unit_afiliacion.clone(),
                horas_dedicacion_semanal: p.horas_dedicacion_semanal,
            }
        })
        .collect();

    let financiamientos_cerif = financiamientos
        .iter()
        .map(|(pivot, f)| CerifProyectoFinanciamiento {
            id_financiamiento: f.id_financiamiento.clone(),
            codigo: f.codigo.clone(),
            nombre: f.nombre.clone(),
            modalidad: f.modalidad.clone(),
            id_org_unit_financiadora: f.id_org_unit_financiadora.clone(),
            monto_asignado: pivot.monto_asignado,
            moneda: pivot.moneda.clone(),
            monto: f.monto,
        })
        .collect();

    CerifProyecto {
        id_proyecto: proyecto.id_proyecto.clone(),
        titulo: proyecto.titulo_proyecto.clone(),
        codigo: proyecto.codigo.clone(),
        tipo_actividad_ocde: proyecto.tipo_actividad_ocde.clone(),
        ambito_geografico: proyecto.ambito_geografico.clone(),
        estado_concytec: proyecto.estado_concytec.clone(),
        tematica_ambiental: proyecto.tematica_ambiental.clone(),
        tematica_salud: proyecto.tematica_salud.clone(),
        campo_ocde: proyecto.campo_ocde.clone(),
        programas_relacionados: proyecto.programas_relacionados.clone(),
        campos_ocde: ocde.to_vec(),
        participantes,
        financiamientos: financiamientos_cerif,
        organizaciones: organizaciones.to_vec(),
        perucris_uuid: proyecto.perucris_uuid.clone(),
    }
}

pub(crate) fn cerif_publicacion_from(
    pub_model: &crate::publicaciones::models::PublicacionCientifica,
    autores: &[crate::publicaciones::autores::PublicacionAutor],
    personas: &HashMap<String, crate::personas::models::Persona>,
) -> CerifPublicacion {
    let mut autores_sorted: Vec<&crate::publicaciones::autores::PublicacionAutor> =
        autores.iter().collect();
    autores_sorted.sort_by_key(|a| a.orden);

    let autores_cerif = autores_sorted
        .into_iter()
        .map(|a| CerifAutor {
            id_persona: a.id_persona.clone(),
            nombre_completo: personas
                .get(&a.id_persona)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
            orden: a.orden,
            es_autor_correspondiente: a.es_autor_correspondiente,
            id_org_unit_afiliacion: a.id_org_unit_afiliacion.clone(),
        })
        .collect();

    CerifPublicacion {
        id_publicacion: pub_model.id_publicacion.clone(),
        titulo: pub_model.titulo.clone(),
        tipo: pub_model.tipo.clone(),
        doi: pub_model.doi.clone(),
        issn: pub_model.issn.clone(),
        isbn: pub_model.isbn.clone(),
        anio: pub_model.anio,
        fecha_publicacion: pub_model.fecha_publicacion,
        revista_titulo: pub_model.revista_titulo.clone(),
        editorial: pub_model.editorial.clone(),
        id_org_unit_editora: pub_model.id_org_unit_editora.clone(),
        volumen: pub_model.volumen.clone(),
        numero_issue: pub_model.numero_issue.clone(),
        paginas: pub_model.paginas.clone(),
        idioma: pub_model.idioma.clone(),
        resumen: pub_model.resumen.clone(),
        palabras_clave: pub_model.palabras_clave.clone(),
        acceso_abierto: pub_model.acceso_abierto.clone(),
        scimago_cuartil: pub_model.scimago_cuartil.clone(),
        wos_cuartil: pub_model.wos_cuartil.clone(),
        es_revisado_por_pares: pub_model.es_revisado_por_pares,
        handle_url: pub_model.handle_url.clone(),
        estado_publicacion: pub_model.estado_publicacion.clone(),
        dominio_origen: pub_model.dominio_origen.clone(),
        pure_uuid: pub_model.pure_uuid.clone(),
        id_proyecto: pub_model.id_proyecto.clone(),
        autores: autores_cerif,
    }
}

fn cerif_patente_from(
    patente: &Patente,
    inventores: &[crate::recursos::patente_inventores::PatenteInventor],
    titulares: &[crate::recursos::patente_titulares::PatenteTitular],
    personas: &HashMap<String, crate::personas::models::Persona>,
    org_units: &HashMap<String, OrgUnit>,
    ocde: &[String],
) -> CerifPatente {
    let mut inventores_sorted: Vec<&crate::recursos::patente_inventores::PatenteInventor> =
        inventores.iter().collect();
    inventores_sorted.sort_by_key(|i| i.orden);

    let inventores_cerif = inventores_sorted
        .into_iter()
        .map(|i| CerifPersonaRef {
            id_persona: i.id_persona.clone(),
            nombre_completo: personas
                .get(&i.id_persona)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
        })
        .collect();

    let titulares_cerif = titulares
        .iter()
        .map(|t| {
            let nombre = if t.holder_type == vocab_mapper::HOLDER_TYPE_ORG_UNIT {
                t.id_org_unit
                    .as_ref()
                    .and_then(|id| org_units.get(id))
                    .map(|o| o.nombre.clone())
            } else {
                t.id_persona
                    .as_ref()
                    .and_then(|id| personas.get(id))
                    .map(|p| p.nombre_completo.clone())
            };
            CerifTitular {
                holder_type: t.holder_type.clone(),
                id_org_unit: t.id_org_unit.clone(),
                id_persona: t.id_persona.clone(),
                nombre,
            }
        })
        .collect();

    CerifPatente {
        id_patente: patente.id_patente.clone(),
        titulo: patente.titulo.clone(),
        numero_patente: patente.numero_patente.clone(),
        tipo: patente.tipo.clone(),
        estado: patente.estado.clone(),
        fecha_solicitud: patente.fecha_solicitud,
        fecha_concesion: patente.fecha_concesion,
        pais: patente.pais.clone(),
        entidad_concedente: patente.entidad_concedente.clone(),
        id_org_unit_concedente: patente.id_org_unit_concedente.clone(),
        clasificacion_ipc: patente.clasificacion_ipc.clone(),
        descripcion: patente.descripcion.clone(),
        proyecto_id: patente.proyecto_id.clone(),
        inventores: inventores_cerif,
        titulares: titulares_cerif,
        campos_ocde: ocde.to_vec(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn persona(sexo: Option<&str>) -> crate::personas::models::Persona {
        use crate::personas::dto::CreatePersonaRequest;
        crate::personas::models::Persona::new(
            "persona-1".to_string(),
            CreatePersonaRequest {
                dni: "12345678".to_string(),
                nombres: "Juan".to_string(),
                apellido_paterno: "Perez".to_string(),
                apellido_materno: Some("Gomez".to_string()),
                correo: None,
                telefono: None,
                direccion: None,
                sexo: sexo.map(str::to_string),
                fecha_nacimiento: None,
            },
        )
        .unwrap()
    }

    #[test]
    fn parse_scope_acepta_valores_validos() {
        assert_eq!(parse_scope(None).unwrap(), CerifScope::Todo);
        assert_eq!(parse_scope(Some("todo")).unwrap(), CerifScope::Todo);
        assert_eq!(
            parse_scope(Some("ORG_UNITS")).unwrap(),
            CerifScope::Organizaciones
        );
        assert_eq!(parse_scope(Some("personas")).unwrap(), CerifScope::Personas);
        assert_eq!(
            parse_scope(Some("Proyectos")).unwrap(),
            CerifScope::Proyectos
        );
        assert_eq!(
            parse_scope(Some("publicacion")).unwrap(),
            CerifScope::Publicaciones
        );
        assert_eq!(parse_scope(Some("patente")).unwrap(), CerifScope::Patentes);
    }

    #[test]
    fn parse_scope_rechaza_entidad_desconocida() {
        let err = parse_scope(Some("vehiculos")).unwrap_err();
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn org_unit_mapea_naturaleza_y_ocde() {
        use crate::org_units::dto::CreateOrgUnitRequest;
        let org = OrgUnit::new(
            "org-1".to_string(),
            CreateOrgUnitRequest {
                nombre: "Universidad Nacional X".to_string(),
                ubigeo_codigo: Some("150101".to_string()),
                ruc: Some("20123456789".to_string()),
                ror_id: None,
                isni_id: None,
                scopus_id: None,
                sector_institucional: None,
                tipo_organizacion: "tipo_org_universidad".to_string(),
                tipo_dependencia: None,
                tipo_educacion_superior: None,
                ciiu_codigo: None,
                es_publica: true,
                parent_id: None,
                legal_name: None,
                acronimo: None,
                web_site: None,
                direccion: None,
                pais: None,
                descripcion: None,
                rin_id: None,
                sunedu_clasificacion: None,
                sunedu_estado: None,
                sunedu_resolucion: None,
                perucris_uuid: None,
                perucris_handle: None,
            },
        )
        .unwrap();
        let c = cerif_org_unit_from(&org, &["1.1".to_string(), "1.2".to_string()]);
        assert_eq!(c.naturaleza.as_deref(), Some("publica"));
        assert_eq!(c.campos_ocde, vec!["1.1".to_string(), "1.2".to_string()]);
        assert_eq!(c.es_publica, true);
        assert_eq!(c.ruc.as_deref(), Some("20123456789"));
    }

    #[test]
    fn person_mapea_genero_a_skos() {
        let p = persona(Some("F"));
        let inv = crate::investigadores::models::Investigador::new(
            "inv-1".to_string(),
            &crate::investigadores::dto::CreateInvestigadorRequest {
                dni: "12345678".to_string(),
                id_grado: "g-1".to_string(),
                nombres: "Juan".to_string(),
                apellido_paterno: "Perez".to_string(),
                apellido_materno: Some("Gomez".to_string()),
                correo: None,
                telefono: None,
                direccion: None,
                sexo: Some("F".to_string()),
                fecha_nacimiento: None,
                perfil: "docente".to_string(),
                renacyt: None,
                tipo_documento: Some("DNI".to_string()),
                pure_person_id: None,
                perucris_uuid: None,
            },
        )
        .unwrap();
        let c = cerif_person_from(&p, &inv);
        assert_eq!(c.dni, "12345678");
        assert_eq!(c.sexo_skos.as_deref(), Some("femenino"));
        assert_eq!(c.tipo_documento.as_deref(), Some("DNI"));
        assert_eq!(c.id_investigador.as_deref(), Some("inv-1"));
    }

    #[test]
    fn publicacion_ordena_autores_y_resuelve_nombres() {
        use crate::publicaciones::autores::PublicacionAutor;
        use crate::publicaciones::dto::CreatePublicacionRequest;
        use crate::publicaciones::models::PublicacionCientifica;
        let pub_model = PublicacionCientifica::new(
            "pub-1".to_string(),
            CreatePublicacionRequest {
                titulo: "Estudio CERIF".to_string(),
                tipo: vocab_mapper::PUBLICACION_TIPO_ARTICULO.to_string(),
                doi: None,
                issn: None,
                anio: Some(2024),
                cuartil: None,
                resumen: None,
                palabras_clave: vec!["cerif".to_string()],
                handle_url: None,
                fecha_publicacion: None,
                editorial: None,
                id_org_unit_editora: None,
                revista_titulo: None,
                isbn: None,
                scimago_cuartil: None,
                wos_cuartil: None,
                es_revisado_por_pares: true,
                acceso_abierto: None,
                idioma: Some("es".to_string()),
                volumen: None,
                numero_issue: None,
                paginas: None,
                dominio_origen: Some(vocab_mapper::DOMINIO_ORIGEN_MANUAL.to_string()),
                pure_uuid: None,
                estado_publicacion: None,
                id_proyecto: None,
                perucris_uuid: None,
            },
        )
        .unwrap();
        let a1 = PublicacionAutor::new(
            "a-1".to_string(),
            "pub-1".to_string(),
            "persona-1".to_string(),
            None,
            2,
            false,
        )
        .unwrap();
        let a2 = PublicacionAutor::new(
            "a-2".to_string(),
            "pub-1".to_string(),
            "persona-1".to_string(),
            None,
            1,
            true,
        )
        .unwrap();
        let mut personas = HashMap::new();
        personas.insert("persona-1".to_string(), persona(Some("M")));
        let c = cerif_publicacion_from(&pub_model, &[a1, a2], &personas);
        assert_eq!(c.autores.len(), 2);
        assert_eq!(c.autores[0].orden, 1);
        assert!(c.autores[0].es_autor_correspondiente);
        assert_eq!(c.autores[0].nombre_completo, "Juan Perez Gomez");
        assert_eq!(c.tipo, vocab_mapper::PUBLICACION_TIPO_ARTICULO);
        assert_eq!(c.idioma.as_deref(), Some("es"));
    }

    #[test]
    fn patente_mapea_inventores_y_titulares() {
        use crate::recursos::dto::CreatePatenteRequest;
        use crate::recursos::patente_inventores::PatenteInventor;
        use crate::recursos::patente_titulares::PatenteTitular;
        let patente = Patente::new(
            "pat-1".to_string(),
            CreatePatenteRequest {
                proyecto_id: Some("proy-1".to_string()),
                titulo: "Sistema X".to_string(),
                numero_patente: Some("PE-001".to_string()),
                tipo: Some(vocab_mapper::PATENTE_TIPO_INVENCION.to_string()),
                estado: None,
                fecha_solicitud: None,
                fecha_concesion: None,
                pais: Some("PE".to_string()),
                entidad_concedente: None,
                descripcion: None,
                clasificacion_ipc: Some("A01B 1/00".to_string()),
                id_org_unit_concedente: None,
            },
        )
        .unwrap();
        let inv = PatenteInventor::new(
            "i-1".to_string(),
            "pat-1".to_string(),
            "persona-1".to_string(),
            1,
        )
        .unwrap();
        let tit = PatenteTitular::new(
            "t-1".to_string(),
            "pat-1".to_string(),
            vocab_mapper::HOLDER_TYPE_ORG_UNIT.to_string(),
            Some("org-1".to_string()),
            None,
            1,
        )
        .unwrap();
        let mut personas = HashMap::new();
        personas.insert("persona-1".to_string(), persona(Some("M")));
        let mut orgs = HashMap::new();
        orgs.insert(
            "org-1".to_string(),
            OrgUnit {
                id_org_unit: "org-1".to_string(),
                nombre: "UNFV".to_string(),
                ubigeo_codigo: None,
                ruc: None,
                ror_id: None,
                isni_id: None,
                scopus_id: None,
                sector_institucional: None,
                tipo_organizacion: "universidad".to_string(),
                tipo_dependencia: None,
                tipo_educacion_superior: None,
                ciiu_codigo: None,
                es_publica: true,
                parent_id: None,
                activo: 1,
                created_at: None,
                updated_at: None,
                legal_name: None,
                acronimo: None,
                web_site: None,
                direccion: None,
                pais: None,
                descripcion: None,
                rin_id: None,
                sunedu_clasificacion: None,
                sunedu_estado: None,
                sunedu_resolucion: None,
                perucris_uuid: None,
                perucris_handle: None,
            },
        );
        let c = cerif_patente_from(
            &patente,
            &[inv],
            &[tit],
            &personas,
            &orgs,
            &["2.3".to_string()],
        );
        assert_eq!(c.inventores.len(), 1);
        assert_eq!(c.inventores[0].nombre_completo, "Juan Perez Gomez");
        assert_eq!(c.titulares[0].nombre.as_deref(), Some("UNFV"));
        assert_eq!(
            c.titulares[0].holder_type,
            vocab_mapper::HOLDER_TYPE_ORG_UNIT
        );
        assert_eq!(c.campos_ocde, vec!["2.3".to_string()]);
        assert_eq!(c.proyecto_id.as_deref(), Some("proy-1"));
    }

    #[test]
    fn cerif_to_json_bytes_serializa_documento() {
        let doc = CerifDocument::new();
        let bytes = cerif_to_json_bytes(&doc).unwrap();
        let text = String::from_utf8(bytes).unwrap();
        assert!(text.contains("\"schema\""));
        assert!(text.contains("pjvpin/cerif-json/0.1"));
        assert!(text.contains("\"proyectos\""));
    }
}
