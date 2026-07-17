use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::publicaciones::dto::{
    CreatePublicacionRequest, PublicacionCientificaDto, UpdatePublicacionRequest,
};
use crate::publicaciones::models::PublicacionCientifica;
use crate::shared::error::AppError;
use crate::shared::time;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<PublicacionCientificaDto, AppError> {
    mongodb::bson::from_document::<PublicacionCientificaDto>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar publicación desde BSON: {e}"
        ))
    })
}

fn dto_to_model(dto: PublicacionCientificaDto) -> PublicacionCientifica {
    PublicacionCientifica {
        id: dto.id,
        id_publicacion: dto.id_publicacion,
        titulo: dto.titulo,
        autores_ids: dto.autores_ids,
        revista: dto.revista,
        doi: dto.doi,
        issn: dto.issn,
        anio: dto.anio,
        cuartil: dto.cuartil,
        tipo: dto.tipo,
        url: dto.url,
        resumen: dto.resumen,
        palabras_clave: dto.palabras_clave,
        pure_id: dto.pure_id,
        created_at: dto.created_at,
        updated_at: dto.updated_at,
        activo: dto.activo,
    }
}

fn model_to_dto(m: &PublicacionCientifica) -> PublicacionCientificaDto {
    PublicacionCientificaDto {
        id: m.id.clone(),
        id_publicacion: m.id_publicacion.clone(),
        titulo: m.titulo.clone(),
        autores_ids: m.autores_ids.clone(),
        revista: m.revista.clone(),
        doi: m.doi.clone(),
        issn: m.issn.clone(),
        anio: m.anio,
        cuartil: m.cuartil.clone(),
        tipo: m.tipo.clone(),
        url: m.url.clone(),
        resumen: m.resumen.clone(),
        palabras_clave: m.palabras_clave.clone(),
        pure_id: m.pure_id.clone(),
        created_at: m.created_at,
        updated_at: m.updated_at,
        activo: m.activo,
    }
}

pub async fn create(
    db: &Database,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let pub_entity = PublicacionCientifica::new(gen_uuid(), request)?;
    let dto = model_to_dto(&pub_entity);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar publicación a BSON: {e}"))
    })?;
    db.collection::<Document>("publicaciones_cientificas")
        .insert_one(doc)
        .await?;
    Ok(pub_entity)
}

pub async fn get_all(db: &Database) -> Result<Vec<PublicacionCientifica>, AppError> {
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn get_by_id(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    let doc_opt = db
        .collection::<Document>("publicaciones_cientificas")
        .find_one(doc! { "id_publicacion": id, "activo": 1 })
        .await?;
    let doc =
        doc_opt.ok_or_else(|| AppError::NotFound("Publicación no encontrada.".to_string()))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn get_by_investigador(
    db: &Database,
    investigador_id: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "autores_ids": investigador_id, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn get_by_anio(db: &Database, anio: i32) -> Result<Vec<PublicacionCientifica>, AppError> {
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "anio": anio, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn update(
    db: &Database,
    id: &str,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let now = time::now_ms();
    let mut set = doc! { "updated_at": now };

    if let Some(v) = request.titulo {
        set.insert("titulo", v);
    }
    if let Some(v) = request.autores_ids {
        set.insert("autores_ids", v);
    }
    if let Some(v) = request.revista {
        set.insert("revista", v);
    }
    if let Some(v) = request.doi {
        set.insert("doi", v);
    }
    if let Some(v) = request.issn {
        set.insert("issn", v);
    }
    if let Some(v) = request.anio {
        set.insert("anio", v);
    }
    if let Some(v) = request.cuartil {
        set.insert("cuartil", v);
    }
    if let Some(v) = request.tipo {
        set.insert("tipo", v);
    }
    if let Some(v) = request.url {
        set.insert("url", v);
    }
    if let Some(v) = request.resumen {
        set.insert("resumen", v);
    }
    if let Some(v) = request.palabras_clave {
        set.insert("palabras_clave", v);
    }

    db.collection::<Document>("publicaciones_cientificas")
        .update_one(doc! { "id_publicacion": id }, doc! { "$set": set })
        .await?;
    get_by_id(db, id).await
}

pub async fn delete(db: &Database, id: &str) -> Result<(), AppError> {
    db.collection::<Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 0, "updated_at": time::now_ms() } },
        )
        .await?;
    Ok(())
}

pub async fn reactivate(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    db.collection::<Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 1, "updated_at": time::now_ms() } },
        )
        .await?;
    get_by_id(db, id).await
}
