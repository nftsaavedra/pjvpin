use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto, GradoAcademicoDoc};
use crate::grados::models::GradoAcademico;
use crate::shared::error::AppError;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_model(doc: Document) -> Result<GradoAcademico, AppError> {
    let parsed = mongodb::bson::from_document::<GradoAcademicoDoc>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar grado desde BSON: {e}"))
    })?;
    Ok(GradoAcademico::from(parsed))
}

pub async fn create_grado(
    db: &Database,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let grado = GradoAcademico::new(gen_uuid(), request)?;
    let doc_struct: GradoAcademicoDoc = grado.clone().into();
    let doc = mongodb::bson::to_document(&doc_struct)
        .map_err(|e| AppError::InternalError(format!("No se pudo serializar grado a BSON: {e}")))?;
    db.collection::<Document>("grados").insert_one(doc).await?;
    Ok(grado)
}

pub async fn get_all_grados(db: &Database) -> Result<Vec<GradoAcademico>, AppError> {
    let cursor = db.collection::<Document>("grados").find(doc! {}).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut grados: Vec<GradoAcademico> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?;
    grados.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
    Ok(grados)
}

pub async fn get_grado_by_id(db: &Database, id_grado: &str) -> Result<GradoAcademico, AppError> {
    let doc_opt = db
        .collection::<Document>("grados")
        .find_one(doc! { "id_grado": id_grado })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Grado no encontrado.".to_string()))?;
    doc_to_model(doc)
}

pub async fn update_grado(
    db: &Database,
    id_grado: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let now = crate::shared::time::now_ms();
    db.collection::<Document>("grados")
        .update_one(
            doc! { "id_grado": id_grado },
            doc! { "$set": {
                "nombre": request.nombre,
                "descripcion": request.descripcion,
                "updated_at": now,
            }},
        )
        .await?;
    get_grado_by_id(db, id_grado).await
}

pub async fn delete_grado(
    db: &Database,
    id_grado: &str,
) -> Result<EliminarGradoResultadoDto, AppError> {
    let investigadores_relacionados = db
        .collection::<Document>("investigadores")
        .count_documents(doc! { "id_grado": id_grado })
        .await?;

    if investigadores_relacionados > 0 {
        db.collection::<Document>("grados")
            .update_one(
                doc! { "id_grado": id_grado },
                doc! { "$set": { "activo": 0i64, "updated_at": crate::shared::time::now_ms() } },
            )
            .await?;
        return Ok(EliminarGradoResultadoDto {
            accion: "desactivado".to_string(),
            mensaje:
                "El grado está relacionado con investigadores. Se desactivó en lugar de eliminarse."
                    .to_string(),
        });
    }

    db.collection::<Document>("grados")
        .delete_one(doc! { "id_grado": id_grado })
        .await?;

    Ok(EliminarGradoResultadoDto {
        accion: "eliminado".to_string(),
        mensaje: "Grado eliminado correctamente.".to_string(),
    })
}

pub async fn reactivar_grado(db: &Database, id_grado: &str) -> Result<GradoAcademico, AppError> {
    db.collection::<Document>("grados")
        .update_one(
            doc! { "id_grado": id_grado },
            doc! { "$set": { "activo": 1i64, "updated_at": crate::shared::time::now_ms() } },
        )
        .await?;
    get_grado_by_id(db, id_grado).await
}

pub async fn get_all_grados_paginated(
    db: &Database,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<GradoAcademico>, AppError> {
    let filter = doc! {};
    let total = db
        .collection::<Document>("grados")
        .count_documents(filter.clone())
        .await?;
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;

    let mut cursor = db
        .collection::<Document>("grados")
        .find(filter)
        .sort(doc! { "nombre": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut grados: Vec<GradoAcademico> = Vec::new();
    while let Some(d) = cursor.try_next().await? {
        grados.push(doc_to_model(d)?);
    }

    let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
    Ok(crate::shared::pagination::PaginatedResult {
        items: grados,
        total,
        page,
        limit,
        total_pages,
    })
}

/// Carga todos los grados en un `HashMap` indexado por `id_grado`.
pub async fn load_all_map(db: &Database) -> Result<HashMap<String, GradoAcademico>, AppError> {
    let cursor = db.collection::<Document>("grados").find(doc! {}).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map = HashMap::new();
    for d in docs {
        let m = doc_to_model(d)?;
        map.insert(m.id_grado.clone(), m);
    }
    Ok(map)
}
