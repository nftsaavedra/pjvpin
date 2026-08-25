//! Importador asistido de datos iniciales desde PeruCRIS (Fase 6 del
//! mega-plan).
//!
//! Prereq: haber corrido el validador (`validar_sincronizacion_perucris`)
//! contra los datos reales para entender que existe en PeruCRIS.
//!
//! v1: importa los proyectos de UNF (UUID 97674e53-90f5-4e9c-b9a9-1c2efa766bd5)
//! desde `RELATION.OrgUnit.projects` (recon §3.2: 9 proyectos indexados)
//! y los inserta en `proyectos` con dedupe por `perucris_uuid` (primario)
//! y `titulo_proyecto` normalizado (fallback).
//!
//! v2: importa publicaciones en una pasada dual:
//!   - Phase A: `search_by_query(RUC)` filtradas por `entity_type==Publication`.
//!     Cubre el universo cuya metadata indexada menciona el RUC. Documentado
//!     en recon §1.4: la asociacion orgunit→publications NO esta formalizada.
//!   - Phase B: para cada investigador local, `search_by_query(DNI)` filtrada
//!     por `entity_type==Publication`. Permite vincular autores por DNI
//!     (recon §5.6: perucris.author.dni indexado en search, aunque NO
//!     expuesto en el HAL publico de cada publicacion).
//!
//! Autores: solo se crean pivotes `publicacion_autores` para las
//! publicaciones de Phase B (DNI match). Las de Phase A sin match por
//! nombre contra `Persona.nombre_completo` se reportan en
//! `sin_autor_vinculado` (no se inventan identidades).
//!
//! El `Proyecto.id_proyecto` generado es deterministico por `perucris_uuid`
//! (FNV-1a 64 → hex base32) para permitir re-corridas idempotentes.

use mongodb::bson::{doc, Document};
use mongodb::Database;
use serde::Serialize;
use std::collections::HashSet;

use crate::shared::error::AppError;
use crate::shared::external::perucris_validator::{PeruCrisHit, PeruCrisPublicClient};
use crate::shared::state::AppState;

/// Resultado del importador inicial (proyectos + publicaciones).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeruCrisImportResult {
    pub proyectos: PeruCrisProyectosImportResult,
    pub publicaciones: PeruCrisPublicacionesImportResult,
}

#[derive(Debug, Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PeruCrisProyectosImportResult {
    pub total_evaluados: usize,
    pub importados: usize,
    pub omitidos_duplicado: usize,
    pub errores: Vec<String>,
}

#[derive(Debug, Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PeruCrisPublicacionesImportResult {
    pub total_evaluados: usize,
    pub importados: usize,
    pub omitidos_duplicado: usize,
    pub autores_vinculados: usize,
    pub sin_autor_vinculado: usize,
    pub cobertura_recomendada: usize,
    pub errores: Vec<String>,
    pub avisos: Vec<String>,
}

/// Importa los proyectos de UNF desde PeruCRIS a la tabla `proyectos`
/// local con dedupe por `perucris_uuid` (primario) y `titulo_proyecto`
/// normalizado (fallback).
pub async fn importar_proyectos_unf(state: &AppState) -> Result<PeruCrisImportResult, AppError> {
    let db = state.mongo_db()?;
    let client = PeruCrisPublicClient::new();
    let unf_uuid = "97674e53-90f5-4e9c-b9a9-1c2efa766bd5";
    let hits: Vec<PeruCrisHit> = client
        .search_by_scope("RELATION.OrgUnit.projects", unf_uuid, 100)
        .await?;
    let project_hits: Vec<&PeruCrisHit> = hits
        .iter()
        .filter(|h| h.metadata.entity_type().as_deref() == Some("Project"))
        .collect();
    let total = project_hits.len();
    let mut importados = 0usize;
    let mut omitidos = 0usize;
    let mut errores = Vec::new();

    let existing = load_existing_proyecto_dedupe_keys(db).await?;

    for remote in project_hits {
        let Some(title_remote) = remote.metadata.first_value("dc.title") else {
            errores.push(format!(
                "UUID {} sin dc.title en metadata, omitido",
                remote.uuid
            ));
            continue;
        };
        let title_key = normalize_title(&title_remote);
        if existing.contains_uuid(&remote.uuid) || existing.contains_title(&title_key) {
            omitidos += 1;
            continue;
        }
        let id_proyecto = format!("proj-perucris-{}", short_hash(&remote.uuid));
        let codigo = remote.metadata.first_value("dc.identifier.codigo");
        let now = crate::shared::time::now_ms();
        let mut doc_to_insert = doc! {
            "id_proyecto": &id_proyecto,
            "titulo_proyecto": &title_remote,
            "activo": 1i64,
            "created_at": now,
            "updated_at": now,
            "perucris_uuid": &remote.uuid,
        };
        if let Some(c) = codigo {
            doc_to_insert.insert("codigo", c);
        }
        if let Some(h) = remote.handle.as_ref() {
            doc_to_insert.insert("perucris_handle", h);
        }
        match db
            .collection::<mongodb::bson::Document>("proyectos")
            .insert_one(doc_to_insert)
            .await
        {
            Ok(_) => {
                importados += 1;
            }
            Err(e) => {
                errores.push(format!("insert {} fallo: {}", id_proyecto, e));
            }
        }
    }

    let publicaciones = importar_publicaciones_unf(state).await?;

    Ok(PeruCrisImportResult {
        proyectos: PeruCrisProyectosImportResult {
            total_evaluados: total,
            importados,
            omitidos_duplicado: omitidos,
            errores,
        },
        publicaciones,
    })
}

/// Importa las publicaciones de UNF desde PeruCRIS via busqueda dual
/// (RUC + DNI por investigador). Dedupe global por `perucris_uuid`.
pub async fn importar_publicaciones_unf(
    state: &AppState,
) -> Result<PeruCrisPublicacionesImportResult, AppError> {
    let db = state.mongo_db()?;
    let client = PeruCrisPublicClient::new();
    let ruc = resolve_institucion_ruc(db, state).await?;
    let mut result = PeruCrisPublicacionesImportResult::default();
    result.avisos.push(format!(
        "Cobertura del universo: solo publicaciones indexadas por RUC {} + coincidencias por DNI de investigadores locales. Recon §1.4: la asociacion orgunit→publications no esta formalizada en PeruCRIS; pueden existir publicaciones no indexadas por RUC.",
        ruc
    ));
    let existing = load_existing_publicacion_perucris_uuids(db).await?;
    let investigadores = load_investigadores_with_dni(db).await?;

    // Phase A: busqueda por RUC de la institucion.
    let ruc_hits = client.search_by_query(&ruc, 100).await?;
    let mut seen_uuids: HashSet<String> = HashSet::new();
    for hit in ruc_hits
        .iter()
        .filter(|h| h.metadata.entity_type().as_deref() == Some("Publication"))
    {
        if seen_uuids.insert(hit.uuid.clone()) {
            upsert_publicacion_from_hit(db, &mut result, hit, &existing).await?;
        }
    }

    // Phase B: busqueda por DNI de cada investigador local + vinculacion
    // de autor via pivot publicaciones_autores.
    for inv in &investigadores {
        let dni_norm = match crate::shared::dni::Dni::new(&inv.dni).ok() {
            Some(d) => d.into_string(),
            None => continue,
        };
        let dni_hits = match client.search_by_query(&dni_norm, 100).await {
            Ok(h) => h,
            Err(e) => {
                result
                    .errores
                    .push(format!("search_by_query(DNI {}) fallo: {}", dni_norm, e));
                continue;
            }
        };
        for hit in dni_hits
            .iter()
            .filter(|h| h.metadata.entity_type().as_deref() == Some("Publication"))
        {
            let already_seen = !seen_uuids.insert(hit.uuid.clone());
            let id_publicacion =
                upsert_publicacion_from_hit(db, &mut result, hit, &existing).await?;
            if already_seen {
                // ya contabilizado en Phase A; aun asi, asegura pivot para
                // este investigador si la publicacion existe.
                upsert_autor_pivot(db, &id_publicacion, &inv.id_persona).await?;
                result.autores_vinculados += 1;
            } else {
                upsert_autor_pivot(db, &id_publicacion, &inv.id_persona).await?;
                result.autores_vinculados += 1;
            }
        }
    }

    if result.sin_autor_vinculado > 0 {
        result.avisos.push(format!(
            "{} publicacion(es) importada(s) sin autor local vinculado. Use la vinculacion de autores para resolverlas.",
            result.sin_autor_vinculado
        ));
    }

    Ok(result)
}

/// Resuelve el RUC de la institucion matriz en este orden:
/// 1. OrgUnit con `parent_id=None` (matriz) cuyo `ruc` no este vacio.
async fn resolve_institucion_ruc(db: &Database, state: &AppState) -> Result<String, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<Document>("org_units")
        .find(doc! { "parent_id": { "$in": [null, ""] } })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    for d in docs {
        if let Ok(ruc) = d.get_str("ruc") {
            let trimmed = ruc.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }
    // Fallback: config.perucris.ruc.
    if let Some(ruc) = state.perucris_config.ruc.as_deref() {
        let trimmed = ruc.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    Err(AppError::InternalError(
        "No hay RUC institucional configurado. Configure el RUC del OrgUnit matriz \
         o en el wizard de PeruCRIS antes de importar publicaciones."
            .to_string(),
    ))
}

async fn upsert_publicacion_from_hit(
    db: &Database,
    result: &mut PeruCrisPublicacionesImportResult,
    hit: &PeruCrisHit,
    existing: &HashSet<String>,
) -> Result<String, AppError> {
    result.total_evaluados += 1;
    if existing.contains(&hit.uuid) {
        result.omitidos_duplicado += 1;
        // Recupera el id_publicacion existente para enlazar autores.
        let id = lookup_publicacion_id_by_perucris_uuid(db, &hit.uuid).await?;
        return Ok(id);
    }
    let id_publicacion = format!("pub-perucris-{}", short_hash(&hit.uuid));
    let titulo = match hit.metadata.first_value("dc.title") {
        Some(t) => t,
        None => {
            result
                .errores
                .push(format!("UUID {} sin dc.title, omitido", hit.uuid));
            return Err(AppError::InternalError(format!(
                "PeruCris hit {} sin dc.title",
                hit.uuid
            )));
        }
    };
    let doi = hit
        .metadata
        .first_value("dc.identifier.doi")
        .as_deref()
        .and_then(|d| crate::shared::doi::Doi::new_opt(Some(d)).ok().flatten())
        .map(|d| d.into_string());
    let anio = hit
        .metadata
        .first_value("dc.date.issued")
        .as_deref()
        .and_then(parse_year);
    let fecha_publicacion = hit
        .metadata
        .first_value("dc.date.issued")
        .as_deref()
        .and_then(parse_iso_date_to_epoch_ms);
    let tipo = map_perucris_tipo(hit.metadata.first_value("dc.type").as_deref());
    let resumen = hit.metadata.first_value("dc.description.abstract");
    let handle_url = hit
        .handle
        .as_deref()
        .map(|h| format!("https://hdl.handle.net/{}", h));
    let now = crate::shared::time::now_ms();

    let mut set_doc = doc! {
        "titulo": &titulo,
        "tipo": &tipo,
        "dominio_origen": crate::shared::vocab_mapper::DOMINIO_ORIGEN_PERUCRIS,
        "perucris_uuid": &hit.uuid,
        "updated_at": now,
    };
    if let Some(d) = &doi {
        set_doc.insert("doi", d);
    }
    if let Some(y) = anio {
        set_doc.insert("anio", y);
    }
    if let Some(f) = fecha_publicacion {
        set_doc.insert("fecha_publicacion", f);
    }
    if let Some(r) = &resumen {
        set_doc.insert("resumen", r);
    }
    if let Some(h) = &handle_url {
        set_doc.insert("handle_url", h);
    }

    let set_on_insert = doc! {
        "_id": &id_publicacion,
        "id_publicacion": &id_publicacion,
        "activo": 1i64,
        "created_at": now,
    };

    let update = doc! {
        "$set": &set_doc,
        "$setOnInsert": set_on_insert,
    };
    let opts = mongodb::options::UpdateOptions::builder()
        .upsert(true)
        .build();
    let col = db.collection::<Document>("publicaciones_cientificas");
    match col
        .update_one(doc! { "perucris_uuid": &hit.uuid }, update)
        .with_options(opts)
        .await
    {
        Ok(_) => {
            result.importados += 1;
            Ok(id_publicacion)
        }
        Err(e) => {
            result
                .errores
                .push(format!("upsert publicacion {} fallo: {}", hit.uuid, e));
            Err(AppError::InternalError(format!(
                "upsert publicacion PeruCRIS fallo: {e}"
            )))
        }
    }
}

async fn lookup_publicacion_id_by_perucris_uuid(
    db: &Database,
    perucris_uuid: &str,
) -> Result<String, AppError> {
    let doc = db
        .collection::<Document>("publicaciones_cientificas")
        .find_one(doc! { "perucris_uuid": perucris_uuid })
        .await?;
    match doc {
        Some(d) => d
            .get_str("id_publicacion")
            .map(String::from)
            .map_err(|e| AppError::InternalError(format!("id_publicacion faltante: {e}"))),
        None => Err(AppError::InternalError(format!(
            "PeruCris uuid {perucris_uuid} reportado como duplicado pero no existe en BD"
        ))),
    }
}

/// Vincula un investigador local (via su id_persona) como autor de la
/// publicacion. Idempotente: si el pivot ya existe, no duplica.
async fn upsert_autor_pivot(
    db: &Database,
    id_publicacion: &str,
    id_persona: &str,
) -> Result<(), AppError> {
    use crate::publicaciones::autores::repository as pivot_repo;
    use crate::publicaciones::autores::PublicacionAutor;
    let pivot_id = format!("{}:{}", id_publicacion, id_persona);
    let existing = db
        .collection::<Document>("publicacion_autores")
        .find_one(doc! { "_id": &pivot_id })
        .await?;
    if existing.is_some() {
        return Ok(());
    }
    let pa = PublicacionAutor::new(
        pivot_id,
        id_publicacion.to_string(),
        id_persona.to_string(),
        None,
        1,
        false,
    )?;
    pivot_repo::insert(db, &pa).await
}

async fn load_existing_publicacion_perucris_uuids(
    db: &Database,
) -> Result<HashSet<String>, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "perucris_uuid": { "$exists": true, "$ne": "" } })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut set = HashSet::new();
    for d in docs {
        if let Ok(u) = d.get_str("perucris_uuid") {
            if !u.trim().is_empty() {
                set.insert(u.to_string());
            }
        }
    }
    Ok(set)
}

#[derive(Debug, Clone)]
struct InvestigadorConDni {
    id_persona: String,
    dni: String,
}

async fn load_investigadores_with_dni(db: &Database) -> Result<Vec<InvestigadorConDni>, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<Document>("investigadores")
        .find(doc! { "activo": 1 })
        .await?;
    let inv_docs: Vec<Document> = cursor.try_collect().await?;
    let mut persona_ids: Vec<String> = Vec::new();
    let mut seen_persona: HashSet<String> = HashSet::new();
    for d in &inv_docs {
        if let Ok(persona_id) = d.get_str("persona_id") {
            if !persona_id.is_empty() && seen_persona.insert(persona_id.to_string()) {
                persona_ids.push(persona_id.to_string());
            }
        }
    }
    if persona_ids.is_empty() {
        return Ok(Vec::new());
    }
    let cursor = db
        .collection::<Document>("personas")
        .find(doc! { "_id": { "$in": &persona_ids } })
        .await?;
    let persona_docs: Vec<Document> = cursor.try_collect().await?;
    let mut result = Vec::new();
    for d in persona_docs {
        let id = match d.get_str("_id") {
            Ok(s) => s.to_string(),
            Err(_) => continue,
        };
        let dni = match d.get_str("dni") {
            Ok(s) => s.to_string(),
            Err(_) => continue,
        };
        if crate::shared::dni::Dni::new(&dni).is_ok() {
            result.push(InvestigadorConDni {
                id_persona: id,
                dni,
            });
        }
    }
    Ok(result)
}

/// Mapea el `dc.type` de PeruCRIS a un `tipo` valido local. Si el valor
/// remoto no es reconocible, cae a `articulo` y aniade un aviso.
fn map_perucris_tipo(remote: Option<&str>) -> String {
    use crate::shared::vocab_mapper::{
        PUBLICACION_TIPO_ARTICULO, PUBLICACION_TIPO_ARTICULO_CONFERENCIA,
        PUBLICACION_TIPO_ARTICULO_REVISTA, PUBLICACION_TIPO_CAPITULO_LIBRO, PUBLICACION_TIPO_LIBRO,
        PUBLICACION_TIPO_SOFTWARE, PUBLICACION_TIPO_TESIS,
    };
    let Some(t) = remote else {
        return PUBLICACION_TIPO_ARTICULO.to_string();
    };
    let normalized = t.to_lowercase();
    let normalized = normalized.trim();
    if normalized.contains("book")
        && (normalized.contains("chapter") || normalized.contains("capitulo"))
    {
        return PUBLICACION_TIPO_CAPITULO_LIBRO.to_string();
    }
    if normalized.contains("book") || normalized == "libro" {
        return PUBLICACION_TIPO_LIBRO.to_string();
    }
    if normalized.contains("conference") || normalized.contains("congreso") {
        return PUBLICACION_TIPO_ARTICULO_CONFERENCIA.to_string();
    }
    if normalized.contains("journal") || normalized.contains("revista") {
        return PUBLICACION_TIPO_ARTICULO_REVISTA.to_string();
    }
    if normalized.contains("software") || normalized.contains("codigo") {
        return PUBLICACION_TIPO_SOFTWARE.to_string();
    }
    if normalized.contains("thesis") || normalized.contains("tesis") {
        return PUBLICACION_TIPO_TESIS.to_string();
    }
    if normalized.contains("article") || normalized.contains("articulo") {
        return PUBLICACION_TIPO_ARTICULO.to_string();
    }
    PUBLICACION_TIPO_ARTICULO.to_string()
}

fn parse_year(s: &str) -> Option<i32> {
    let year_str: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
    year_str
        .parse::<i32>()
        .ok()
        .filter(|y| (1900..=2100).contains(y))
}

fn parse_iso_date_to_epoch_ms(s: &str) -> Option<i64> {
    let year_str: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
    let year: i64 = year_str
        .parse()
        .ok()
        .filter(|y| (1900..=2100).contains(y))?;
    // 1 de enero del anio como proxy cuando solo tenemos el anio.
    Some(year * 31_536_000_000)
}

#[derive(Default)]
struct ExistingDedupKeys {
    uuids: HashSet<String>,
    titles: HashSet<String>,
}

impl ExistingDedupKeys {
    fn contains_uuid(&self, uuid: &str) -> bool {
        self.uuids.contains(uuid)
    }
    fn contains_title(&self, title_key: &str) -> bool {
        self.titles.contains(title_key)
    }
}

async fn load_existing_proyecto_dedupe_keys(db: &Database) -> Result<ExistingDedupKeys, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<mongodb::bson::Document>("proyectos")
        .find(doc! {})
        .await?;
    let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
    let mut keys = ExistingDedupKeys::default();
    for d in docs {
        if let Ok(u) = d.get_str("perucris_uuid") {
            if !u.trim().is_empty() {
                keys.uuids.insert(u.to_string());
            }
        }
        if let Ok(t) = d.get_str("titulo_proyecto") {
            keys.titles.insert(normalize_title(t));
        }
    }
    Ok(keys)
}

fn normalize_title(t: &str) -> String {
    t.trim().to_lowercase()
}

/// Hash corto no-crypto (FNV-1a 64 → hex 32 bits) para generar ids
/// deterministicos por `perucris_uuid`. Solo se usa para evitar
/// duplicados por re-corrida del importador.
fn short_hash(s: &str) -> String {
    let mut h: u64 = 1469598103934665603;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(1099511628211);
    }
    format!("{:x}", h & 0xFFFFFFFF)
}

#[allow(dead_code)]
fn _ensure_serde_suppress_unused() {
    let _: fn() = || {
        let _ = serde_json::to_string(&PeruCrisImportResult {
            proyectos: PeruCrisProyectosImportResult::default(),
            publicaciones: PeruCrisPublicacionesImportResult::default(),
        });
    };
}
