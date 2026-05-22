use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::Database;

use crate::publicaciones::models::{
    CreatePublicacionRequest, PublicacionCientifica, UpdatePublicacionRequest,
};
use crate::shared::error::AppError;
use crate::shared::time;

pub async fn create(
    db: &Database,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let pub_entity = PublicacionCientifica::new(request);
    db.collection::<PublicacionCientifica>("publicaciones_cientificas")
        .insert_one(&pub_entity)
        .await?;
    Ok(pub_entity)
}

pub async fn get_all(db: &Database) -> Result<Vec<PublicacionCientifica>, AppError> {
    db.collection::<PublicacionCientifica>("publicaciones_cientificas")
        .find(doc! { "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn get_by_id(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    db.collection::<PublicacionCientifica>("publicaciones_cientificas")
        .find_one(doc! { "id_publicacion": id, "activo": 1 })
        .await?
        .ok_or_else(|| AppError::NotFound("Publicacion no encontrada.".to_string()))
}

pub async fn get_by_docente(
    db: &Database,
    docente_id: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    db.collection::<PublicacionCientifica>("publicaciones_cientificas")
        .find(doc! { "autores_ids": docente_id, "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn get_by_anio(db: &Database, anio: i32) -> Result<Vec<PublicacionCientifica>, AppError> {
    db.collection::<PublicacionCientifica>("publicaciones_cientificas")
        .find(doc! { "anio": anio, "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
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

    db.collection::<mongodb::bson::Document>("publicaciones_cientificas")
        .update_one(doc! { "id_publicacion": id }, doc! { "$set": set })
        .await?;
    get_by_id(db, id).await
}

pub async fn delete(db: &Database, id: &str) -> Result<(), AppError> {
    db.collection::<mongodb::bson::Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 0, "updated_at": time::now_ms() } },
        )
        .await?;
    Ok(())
}

pub async fn reactivate(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    db.collection::<mongodb::bson::Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 1, "updated_at": time::now_ms() } },
        )
        .await?;
    get_by_id(db, id).await
}
