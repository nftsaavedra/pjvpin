use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::eventos::dto::{CreateEventoRequest, EventoAcademicoDto, UpdateEventoRequest};
use crate::eventos::models::EventoAcademico;
use crate::shared::error::AppError;
use crate::shared::time;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<EventoAcademicoDto, AppError> {
    mongodb::bson::from_document::<EventoAcademicoDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar evento desde BSON: {e}"))
    })
}

fn dto_to_model(dto: EventoAcademicoDto) -> EventoAcademico {
    EventoAcademico {
        id: dto.id,
        id_evento: dto.id_evento,
        nombre: dto.nombre,
        tipo: dto.tipo,
        fecha_inicio: dto.fecha_inicio,
        fecha_fin: dto.fecha_fin,
        lugar: dto.lugar,
        descripcion: dto.descripcion,
        participantes: dto.participantes.into_iter().map(Into::into).collect(),
        created_at: dto.created_at,
        updated_at: dto.updated_at,
        activo: dto.activo,
    }
}

fn model_to_dto(m: &EventoAcademico) -> EventoAcademicoDto {
    EventoAcademicoDto {
        id: m.id.clone(),
        id_evento: m.id_evento.clone(),
        nombre: m.nombre.clone(),
        tipo: m.tipo.clone(),
        fecha_inicio: m.fecha_inicio,
        fecha_fin: m.fecha_fin,
        lugar: m.lugar.clone(),
        descripcion: m.descripcion.clone(),
        participantes: m
            .participantes
            .iter()
            .map(|p| crate::eventos::dto::ParticipanteEventoDto {
                investigador_id: p.investigador_id.clone(),
                rol: p.rol.clone(),
            })
            .collect(),
        created_at: m.created_at,
        updated_at: m.updated_at,
        activo: m.activo,
    }
}

pub async fn create(
    db: &Database,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    let evento = EventoAcademico::new(gen_uuid(), request)?;
    let dto = model_to_dto(&evento);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar evento a BSON: {e}"))
    })?;
    db.collection::<Document>("eventos_academicos")
        .insert_one(doc)
        .await?;
    Ok(evento)
}

pub async fn get_all(db: &Database) -> Result<Vec<EventoAcademico>, AppError> {
    let cursor = db
        .collection::<Document>("eventos_academicos")
        .find(doc! { "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn get_by_id(db: &Database, id: &str) -> Result<EventoAcademico, AppError> {
    let doc_opt = db
        .collection::<Document>("eventos_academicos")
        .find_one(doc! { "id_evento": id, "activo": 1 })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Evento no encontrado.".to_string()))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn get_by_investigador(
    db: &Database,
    investigador_id: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    let cursor = db
        .collection::<Document>("eventos_academicos")
        .find(doc! { "participantes.investigador_id": investigador_id, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
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

    db.collection::<Document>("eventos_academicos")
        .update_one(doc! { "id_evento": id }, doc! { "$set": set })
        .await?;
    get_by_id(db, id).await
}

pub async fn delete(db: &Database, id: &str) -> Result<(), AppError> {
    db.collection::<Document>("eventos_academicos")
        .update_one(
            doc! { "id_evento": id },
            doc! { "$set": { "activo": 0, "updated_at": time::now_ms() } },
        )
        .await?;
    Ok(())
}

pub async fn reactivate(db: &Database, id: &str) -> Result<EventoAcademico, AppError> {
    db.collection::<Document>("eventos_academicos")
        .update_one(
            doc! { "id_evento": id },
            doc! { "$set": { "activo": 1, "updated_at": time::now_ms() } },
        )
        .await?;
    get_by_id(db, id).await
}
