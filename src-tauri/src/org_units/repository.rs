//! Repository de OrgUnit. Maneja jerarquias autoreferenciales (parent_id) y
//! validacion de FK contra catalogos SKOS y geo/ubigeo.

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::options::IndexOptions;
use mongodb::{Database, IndexModel};

use crate::org_units::dto::{CreateOrgUnitRequest, OrgUnitDoc, OrgUnitDto, UpdateOrgUnitRequest};
use crate::org_units::models::OrgUnit;
use crate::shared::error::AppError;
use crate::shared::refs;
use crate::shared::time::now_ms;

fn doc_to_model(d: Document) -> Result<OrgUnit, AppError> {
    let parsed = mongodb::bson::from_document::<OrgUnitDoc>(d)
        .map_err(|e| AppError::InternalError(format!("No se pudo deserializar org_unit: {e}")))?;
    Ok(OrgUnit {
        id_org_unit: parsed.id_org_unit,
        nombre: parsed.nombre,
        ubigeo_codigo: parsed.ubigeo_codigo,
        ruc: parsed.ruc,
        ror_id: parsed.ror_id,
        isni_id: parsed.isni_id,
        scopus_id: parsed.scopus_id,
        sector_institucional: parsed.sector_institucional,
        tipo_organizacion: parsed.tipo_organizacion,
        tipo_dependencia: parsed.tipo_dependencia,
        tipo_educacion_superior: parsed.tipo_educacion_superior,
        ciiu_codigo: parsed.ciiu_codigo,
        es_publica: parsed.es_publica,
        parent_id: parsed.parent_id,
        activo: parsed.activo,
        created_at: parsed.created_at,
        updated_at: parsed.updated_at,
    })
}

fn model_to_doc(m: &OrgUnit) -> Result<OrgUnitDoc, AppError> {
    Ok(OrgUnitDoc {
        id_org_unit: m.id_org_unit.clone(),
        nombre: m.nombre.clone(),
        ubigeo_codigo: m.ubigeo_codigo.clone(),
        ruc: m.ruc.clone(),
        ror_id: m.ror_id.clone(),
        isni_id: m.isni_id.clone(),
        scopus_id: m.scopus_id.clone(),
        sector_institucional: m.sector_institucional.clone(),
        tipo_organizacion: m.tipo_organizacion.clone(),
        tipo_dependencia: m.tipo_dependencia.clone(),
        tipo_educacion_superior: m.tipo_educacion_superior.clone(),
        ciiu_codigo: m.ciiu_codigo.clone(),
        es_publica: m.es_publica,
        parent_id: m.parent_id.clone(),
        activo: m.activo,
        created_at: m.created_at,
        updated_at: m.updated_at,
    })
}

fn model_to_dto(m: &OrgUnit) -> OrgUnitDto {
    OrgUnitDto {
        id_org_unit: m.id_org_unit.clone(),
        nombre: m.nombre.clone(),
        ubigeo_codigo: m.ubigeo_codigo.clone(),
        ruc: m.ruc.clone(),
        ror_id: m.ror_id.clone(),
        isni_id: m.isni_id.clone(),
        scopus_id: m.scopus_id.clone(),
        sector_institucional: m.sector_institucional.clone(),
        tipo_organizacion: m.tipo_organizacion.clone(),
        tipo_dependencia: m.tipo_dependencia.clone(),
        tipo_educacion_superior: m.tipo_educacion_superior.clone(),
        ciiu_codigo: m.ciiu_codigo.clone(),
        es_publica: m.es_publica,
        parent_id: m.parent_id.clone(),
        updated_at: m.updated_at,
    }
}

/// Crea una unidad organizativa. Aplica validaciones FK contra ubigeo y
/// vocabularios CONCYTEC. El id lo proporciona el caller (UUID esperado).
pub async fn create_org_unit(
    db: &Database,
    request: CreateOrgUnitRequest,
) -> Result<OrgUnit, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let model = OrgUnit::new(id, request)?;
    // FK checks (solo si proceden).
    if let Some(ubigeo) = model.ubigeo_codigo.as_ref() {
        crate::geo::repository::validate_ubigeo_fk(db, ubigeo).await?;
    }
    if let Some(tipo) = model.tipo_dependencia.as_ref() {
        if !tipo.is_empty() {
            refs::ensure_vocab_active(db, "concytec_tipo_subunidad", tipo).await?;
        }
    }
    if let Some(sector) = model.sector_institucional.as_ref() {
        if !sector.is_empty() {
            refs::ensure_vocab_active(db, "ocde_sector_institucional", sector).await?;
        }
    }
    if let Some(tes) = model.tipo_educacion_superior.as_ref() {
        if !tes.is_empty() {
            refs::ensure_vocab_active(db, "sunedu_tipo_institucion", tes).await?;
        }
    }
    // FK parent_id: debe ser distinto de si mismo y apuntar a una unidad activa.
    if let Some(parent) = model.parent_id.as_ref() {
        crate::shared::hierarchy::assert_not_self_parent(&model.id_org_unit, parent)?;
        refs::ensure_active(db, "org_units", parent).await?;
        crate::shared::hierarchy::assert_no_cycle(db, "org_units", &model.id_org_unit, "parent_id")
            .await?;
    }
    upsert_org_unit(db, &model).await?;
    Ok(model)
}

pub async fn upsert_org_unit(db: &Database, m: &OrgUnit) -> Result<(), AppError> {
    let doc_struct = model_to_doc(m)?;
    let doc = mongodb::bson::to_document(&doc_struct)
        .map_err(|e| AppError::InternalError(format!("No se pudo serializar org_unit: {e}")))?;
    db.collection::<Document>("org_units")
        .replace_one(doc! { "id_org_unit": &m.id_org_unit }, doc)
        .upsert(true)
        .await?;
    Ok(())
}

/// Aplica un update parcial preservando campos no incluidos.
pub async fn update_org_unit(
    db: &Database,
    id_org_unit: &str,
    request: UpdateOrgUnitRequest,
) -> Result<OrgUnit, AppError> {
    if id_org_unit.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el id de la unidad organizativa.".to_string(),
        ));
    }
    let current = get_org_unit(db, id_org_unit).await?;
    let mut updated = current.clone();
    if let Some(n) = request.nombre {
        updated.nombre = n.trim().to_string();
    }
    if let Some(u) = request.ubigeo_codigo {
        let v = u.trim().to_string();
        updated.ubigeo_codigo = if v.is_empty() { None } else { Some(v.clone()) };
        if let Some(ref ubi) = updated.ubigeo_codigo {
            crate::geo::repository::validate_ubigeo_fk(db, ubi).await?;
        }
    }
    if let Some(r) = request.ror_id {
        let v = r.trim().to_string();
        updated.ror_id = if v.is_empty() { None } else { Some(v) };
    }
    if let Some(i) = request.isni_id {
        let v = i.trim().to_string();
        updated.isni_id = if v.is_empty() { None } else { Some(v) };
    }
    if let Some(s) = request.scopus_id {
        let v = s.trim().to_string();
        updated.scopus_id = if v.is_empty() { None } else { Some(v) };
    }
    if let Some(s) = request.sector_institucional {
        let v = s.trim().to_string();
        updated.sector_institucional = if v.is_empty() { None } else { Some(v.clone()) };
        if !v.is_empty() {
            refs::ensure_vocab_active(db, "ocde_sector_institucional", &v).await?;
        }
    }
    if let Some(t) = request.tipo_dependencia {
        let v = t.trim().to_string();
        updated.tipo_dependencia = if v.is_empty() { None } else { Some(v.clone()) };
        if !v.is_empty() {
            refs::ensure_vocab_active(db, "concytec_tipo_subunidad", &v).await?;
        }
    }
    if let Some(t) = request.tipo_educacion_superior {
        let v = t.trim().to_string();
        updated.tipo_educacion_superior = if v.is_empty() { None } else { Some(v.clone()) };
        if !v.is_empty() {
            refs::ensure_vocab_active(db, "sunedu_tipo_institucion", &v).await?;
        }
    }
    if let Some(c) = request.ciiu_codigo {
        let v = c.trim().to_string();
        updated.ciiu_codigo = if v.is_empty() { None } else { Some(v) };
    }
    if let Some(p) = request.es_publica {
        updated.es_publica = p;
    }
    if let Some(p) = request.parent_id {
        let v = p.trim().to_string();
        if v.is_empty() {
            updated.parent_id = None;
        } else {
            crate::shared::hierarchy::assert_not_self_parent(id_org_unit, &v)?;
            refs::ensure_active(db, "org_units", &v).await?;
            updated.parent_id = Some(v.clone());
            crate::shared::hierarchy::assert_no_cycle(db, "org_units", id_org_unit, "parent_id")
                .await?;
        }
    }
    updated.updated_at = Some(now_ms());
    upsert_org_unit(db, &updated).await?;
    Ok(updated)
}

pub async fn get_org_unit(db: &Database, id: &str) -> Result<OrgUnit, AppError> {
    if id.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el id de la unidad organizativa.".to_string(),
        ));
    }
    let doc_opt = db
        .collection::<Document>("org_units")
        .find_one(doc! { "id_org_unit": id })
        .await?;
    let d = doc_opt.ok_or_else(|| AppError::NotFound(format!("org_unit '{id}' no encontrada.")))?;
    doc_to_model(d)
}

pub async fn listar_org_units_por_padre(
    db: &Database,
    parent_id: Option<&str>,
) -> Result<Vec<OrgUnitDto>, AppError> {
    let filter = match parent_id {
        None => doc! { "parent_id": null, "activo": 1i64 },
        Some(p) => doc! { "parent_id": p, "activo": 1i64 },
    };
    let cursor = db.collection::<Document>("org_units").find(filter).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let items: Vec<OrgUnitDto> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|m| model_to_dto(&m))
        .collect();
    Ok(items)
}

/// Garantiza indices UNIQUE sobre `id_org_unit` y `ruc` (sparse),
/// ademas del jerarquico (parent_id) y busqueda por nombre.
pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    let id_opts = IndexOptions::builder().unique(true).build();
    db.collection::<Document>("org_units")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_org_unit": 1 })
                .options(Some(id_opts))
                .build(),
        )
        .await?;
    let ruc_opts = IndexOptions::builder().unique(true).sparse(true).build();
    db.collection::<Document>("org_units")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "ruc": 1 })
                .options(Some(ruc_opts))
                .build(),
        )
        .await?;
    db.collection::<Document>("org_units")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "parent_id": 1, "tipo_dependencia": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("org_units")
        .create_index(IndexModel::builder().keys(doc! { "nombre": 1 }).build())
        .await?;
    Ok(())
}
