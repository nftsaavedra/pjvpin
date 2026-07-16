use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto, GradoAcademicoDto};
use crate::grados::models::GradoAcademico;
use crate::shared::error::AppError;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<GradoAcademicoDto, AppError> {
    mongodb::bson::from_document::<GradoAcademicoDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar grado desde BSON: {e}"))
    })
}

fn dto_to_model(dto: GradoAcademicoDto) -> GradoAcademico {
    GradoAcademico {
        id_grado: dto.id_grado,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        activo: dto.activo,
        updated_at: dto.updated_at,
    }
}

fn model_to_dto(m: &GradoAcademico) -> GradoAcademicoDto {
    GradoAcademicoDto {
        id_grado: m.id_grado.clone(),
        nombre: m.nombre.clone(),
        descripcion: m.descripcion.clone(),
        activo: m.activo,
        updated_at: m.updated_at,
    }
}

pub async fn create_grado(
    db: &Database,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let grado = GradoAcademico::new(gen_uuid(), request)?;
    let dto = model_to_dto(&grado);
    let doc = mongodb::bson::to_document(&dto)
        .map_err(|e| AppError::InternalError(format!("No se pudo serializar grado a BSON: {e}")))?;
    db.collection::<Document>("grados").insert_one(doc).await?;
    Ok(grado)
}

pub async fn get_all_grados(db: &Database) -> Result<Vec<GradoAcademico>, AppError> {
    let cursor = db.collection::<Document>("grados").find(doc! {}).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut grados: Vec<GradoAcademico> = docs
        .into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
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
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn update_grado(
    db: &Database,
    id_grado: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    db.collection::<Document>("grados")
        .update_one(
            doc! { "id_grado": id_grado },
            doc! { "$set": { "nombre": request.nombre, "descripcion": request.descripcion } },
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
                doc! { "$set": { "activo": 0i64 } },
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
            doc! { "$set": { "activo": 1i64 } },
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
        grados.push(dto_to_model(doc_to_dto(d)?));
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
        let m = dto_to_model(doc_to_dto(d)?);
        map.insert(m.id_grado.clone(), m);
    }
    Ok(map)
}
