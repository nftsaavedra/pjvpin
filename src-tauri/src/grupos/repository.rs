use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::grupos::dto::{
    CreateGrupoInvestigacionRequest, GrupoInvestigacionDto, UpdateGrupoInvestigacionRequest,
};
use crate::grupos::models::GrupoInvestigacion;
use crate::shared::error::AppError;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<GrupoInvestigacionDto, AppError> {
    mongodb::bson::from_document::<GrupoInvestigacionDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar grupo desde BSON: {e}"))
    })
}

fn dto_to_model(dto: GrupoInvestigacionDto) -> GrupoInvestigacion {
    GrupoInvestigacion {
        id_grupo: dto.id_grupo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        coordinador_id: dto.coordinador_id,
        lineas_investigacion: dto.lineas_investigacion,
        activo: dto.activo,
        created_at: dto.created_at,
        updated_at: dto.updated_at,
    }
}

fn model_to_dto(m: &GrupoInvestigacion) -> GrupoInvestigacionDto {
    GrupoInvestigacionDto {
        id_grupo: m.id_grupo.clone(),
        nombre: m.nombre.clone(),
        descripcion: m.descripcion.clone(),
        coordinador_id: m.coordinador_id.clone(),
        lineas_investigacion: m.lineas_investigacion.clone(),
        activo: m.activo,
        created_at: m.created_at,
        updated_at: m.updated_at,
    }
}

pub async fn get_all_grupos(db: &Database) -> Result<Vec<GrupoInvestigacion>, AppError> {
    let cursor = db
        .collection::<Document>("grupos_investigacion")
        .find(doc! {})
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let items: Vec<GrupoInvestigacion> = docs
        .into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
}

pub async fn create_grupo(
    db: &Database,
    request: CreateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    let grupo = GrupoInvestigacion::new(gen_uuid(), request)?;
    let dto = model_to_dto(&grupo);
    let doc = mongodb::bson::to_document(&dto)
        .map_err(|e| AppError::InternalError(format!("No se pudo serializar grupo a BSON: {e}")))?;
    db.collection::<Document>("grupos_investigacion")
        .insert_one(doc)
        .await?;
    Ok(grupo)
}

pub async fn get_grupo_by_id(
    db: &Database,
    id_grupo: &str,
) -> Result<GrupoInvestigacion, AppError> {
    let doc_opt = db
        .collection::<Document>("grupos_investigacion")
        .find_one(doc! { "id_grupo": id_grupo })
        .await?;
    let doc = doc_opt
        .ok_or_else(|| AppError::NotFound(format!("Grupo con ID {id_grupo} no encontrado")))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn update_grupo(
    db: &Database,
    id_grupo: &str,
    request: UpdateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    db.collection::<Document>("grupos_investigacion")
        .update_one(
            doc! { "id_grupo": id_grupo },
            doc! {
                "$set": {
                    "nombre": request.nombre,
                    "descripcion": request.descripcion,
                    "coordinador_id": request.coordinador_id,
                    "lineas_investigacion": request.lineas_investigacion,
                    "updated_at": crate::shared::time::now_ms(),
                }
            },
        )
        .await?;
    get_grupo_by_id(db, id_grupo).await
}

pub async fn delete_grupo(db: &Database, id_grupo: &str) -> Result<(), AppError> {
    db.collection::<Document>("grupos_investigacion")
        .delete_one(doc! { "id_grupo": id_grupo })
        .await?;
    Ok(())
}

/// Carga todos los grupos en un `HashMap` indexado por `id_grupo`.
pub async fn load_all_map(db: &Database) -> Result<HashMap<String, GrupoInvestigacion>, AppError> {
    let grupos = get_all_grupos(db).await?;
    Ok(grupos
        .into_iter()
        .map(|g| (g.id_grupo.clone(), g))
        .collect())
}
