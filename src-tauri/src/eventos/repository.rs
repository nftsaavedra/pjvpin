use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::Database;

use crate::eventos::models::{CreateEventoRequest, EventoAcademico, UpdateEventoRequest};
use crate::shared::error::AppError;
use crate::shared::time;

pub async fn create(
    db: &Database,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    let evento = EventoAcademico::new(request);
    db.collection::<EventoAcademico>("eventos_academicos")
        .insert_one(&evento)
        .await?;
    Ok(evento)
}

pub async fn get_all(db: &Database) -> Result<Vec<EventoAcademico>, AppError> {
    db.collection::<EventoAcademico>("eventos_academicos")
        .find(doc! { "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn get_by_id(db: &Database, id: &str) -> Result<EventoAcademico, AppError> {
    db.collection::<EventoAcademico>("eventos_academicos")
        .find_one(doc! { "id_evento": id, "activo": 1 })
        .await?
        .ok_or_else(|| AppError::NotFound("Evento no encontrado.".to_string()))
}

pub async fn get_by_investigador(
    db: &Database,
    investigador_id: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    db.collection::<EventoAcademico>("eventos_academicos")
        .find(doc! { "participantes.investigador_id": investigador_id, "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn update(
    db: &Database,
    id: &str,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    let now = time::now_ms();
    let mut set = doc! { "updated_at": now };

    if let Some(ref v) = request.nombre {
        set.insert("nombre", v);
    }
    if let Some(ref v) = request.tipo {
        set.insert("tipo", v);
    }
    if let Some(v) = request.fecha_inicio {
        set.insert("fecha_inicio", v);
    }
    if let Some(v) = request.fecha_fin {
        set.insert("fecha_fin", v);
    }
    if let Some(ref v) = request.lugar {
        set.insert("lugar", v);
    }
    if let Some(ref v) = request.descripcion {
        set.insert("descripcion", v);
    }
    if let Some(ref v) = request.participantes {
        set.insert(
            "participantes",
            mongodb::bson::to_bson(v).unwrap_or_default(),
        );
    }

    db.collection::<mongodb::bson::Document>("eventos_academicos")
        .update_one(doc! { "id_evento": id }, doc! { "$set": set })
        .await?;
    get_by_id(db, id).await
}

pub async fn delete(db: &Database, id: &str) -> Result<(), AppError> {
    db.collection::<mongodb::bson::Document>("eventos_academicos")
        .update_one(
            doc! { "id_evento": id },
            doc! { "$set": { "activo": 0, "updated_at": time::now_ms() } },
        )
        .await?;
    Ok(())
}

pub async fn reactivate(db: &Database, id: &str) -> Result<EventoAcademico, AppError> {
    db.collection::<mongodb::bson::Document>("eventos_academicos")
        .update_one(
            doc! { "id_evento": id },
            doc! { "$set": { "activo": 1, "updated_at": time::now_ms() } },
        )
        .await?;
    get_by_id(db, id).await
}
