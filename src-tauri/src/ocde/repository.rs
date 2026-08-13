//! Repository de `ocde` (entity_ocde_fields).
//!
//! Helpers idempotentes para asignar/quitar/listar codigos OCDE a cualquier
//! entidad del modelo. La validacion del FK
//! `ocde_codigo -> catalogos(esquema=ocde_ford)` se hace en
//! `assign_campo_ocde` via `shared::refs::ensure_vocab_active`.

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::ocde::models::{EntidadCampoOcde, EntityOcdeFieldDoc};
use crate::ocde::COLLECTION;
use crate::shared::error::AppError;
use crate::shared::refs;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_model(d: Document) -> Result<EntidadCampoOcde, AppError> {
    let pd = mongodb::bson::from_document::<EntityOcdeFieldDoc>(d).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar entity_ocde_field: {e}"))
    })?;
    Ok(pd.into())
}

/// Asigna un codigo OCDE a una entidad. Valida el FK con `catalogos` y
/// desduplica contra el UNIQUE (entity_type, entity_id, ocde_codigo).
pub async fn assign_campo_ocde(
    db: &Database,
    entity_type: &str,
    entity_id: &str,
    ocde_codigo: &str,
) -> Result<EntidadCampoOcde, AppError> {
    refs::ensure_vocab_active(db, "ocde_ford", ocde_codigo).await?;
    let m = EntidadCampoOcde::new(
        gen_uuid(),
        entity_type.to_string(),
        entity_id.to_string(),
        ocde_codigo.to_string(),
    )?;
    let doc_struct: EntityOcdeFieldDoc = m.clone().into();
    let doc = mongodb::bson::to_document(&doc_struct)
        .map_err(|e| AppError::InternalError(format!("entity_ocde_field -> BSON: {e}")))?;
    db.collection::<Document>(COLLECTION)
        .insert_one(doc)
        .await?;
    Ok(m)
}

/// Quita un codigo OCDE de una entidad. Devuelve true si elimino algo.
pub async fn quitar_campo_ocde(
    db: &Database,
    entity_type: &str,
    entity_id: &str,
    ocde_codigo: &str,
) -> Result<bool, AppError> {
    let res = db
        .collection::<Document>(COLLECTION)
        .delete_one(doc! {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "ocde_codigo": ocde_codigo,
        })
        .await?;
    Ok(res.deleted_count > 0)
}

/// Lista todos los codigos OCDE de una entidad.
pub async fn listar_campos_ocde(
    db: &Database,
    entity_type: &str,
    entity_id: &str,
) -> Result<Vec<EntidadCampoOcde>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION)
        .find(doc! { "entity_type": entity_type, "entity_id": entity_id })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let parsed: Vec<EntidadCampoOcde> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(parsed)
}

/// Helper CASCADE: borra todos los pivotes asociados a una entidad cualquiera.
/// Idempotente.
pub async fn delete_for_entity(
    db: &Database,
    entity_type: &str,
    entity_id: &str,
) -> Result<u64, AppError> {
    let res = db
        .collection::<Document>(COLLECTION)
        .delete_many(doc! { "entity_type": entity_type, "entity_id": entity_id })
        .await?;
    Ok(res.deleted_count)
}

/// Garantiza índices UNIQUE E index secundario por entity_id.
pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    use mongodb::options::IndexOptions;
    use mongodb::IndexModel;
    let opts = IndexOptions::builder().unique(true).build();
    db.collection::<Document>(COLLECTION)
        .create_index(
            IndexModel::builder()
                .keys(doc! { "entity_type": 1, "entity_id": 1, "ocde_codigo": 1 })
                .options(Some(opts))
                .build(),
        )
        .await?;
    db.collection::<Document>(COLLECTION)
        .create_index(
            IndexModel::builder()
                .keys(doc! { "entity_type": 1, "entity_id": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>(COLLECTION)
        .create_index(
            IndexModel::builder()
                .keys(doc! { "ocde_codigo": 1 })
                .build(),
        )
        .await?;
    Ok(())
}
