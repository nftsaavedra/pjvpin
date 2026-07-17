use crate::investigadores::dto::InvestigadorDto;
use crate::investigadores::models::Investigador;
use crate::proyectos::models::ParticipacionRecord;
use crate::proyectos::models::{
    CreateProyectoConParticipantesRequest, CreateProyectoRequest, EliminarProyectoResultado,
    Proyecto, UpdateProyectoConParticipantesRequest,
};
use crate::proyectos::service;
use crate::shared::error::AppError;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

pub async fn es_responsable_del_proyecto(
    db: &Database,
    investigador_id: &str,
    id_proyecto: &str,
) -> Result<bool, AppError> {
    let count = db
        .collection::<ParticipacionRecord>("participaciones")
        .count_documents(doc! {
            "id_proyecto": id_proyecto,
            "id_investigador": investigador_id,
            "es_responsable": true,
        })
        .await?;
    Ok(count > 0)
}

pub async fn get_ids_proyectos_como_responsable(
    db: &Database,
    investigador_id: &str,
) -> Result<Vec<String>, AppError> {
    let participaciones = db
        .collection::<ParticipacionRecord>("participaciones")
        .find(doc! { "id_investigador": investigador_id, "es_responsable": true })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let mut ids: Vec<String> = participaciones.into_iter().map(|p| p.id_proyecto).collect();
    ids.sort();
    ids.dedup();
    Ok(ids)
}

pub async fn get_all_proyectos_paginated(
    db: &Database,
    page: u32,
    limit: u32,
    responsable_id: Option<&str>,
) -> Result<crate::shared::pagination::PaginatedResult<Proyecto>, AppError> {
    let filter = if let Some(investigador_id) = responsable_id {
        let proyecto_ids = get_ids_proyectos_como_responsable(db, investigador_id).await?;
        if proyecto_ids.is_empty() {
            return Ok(crate::shared::pagination::PaginatedResult {
                items: vec![],
                total: 0,
                page,
                limit,
                total_pages: 0,
            });
        }
        doc! { "id_proyecto": { "$in": proyecto_ids }, "activo": 1i64 }
    } else {
        doc! { "activo": 1i64 }
    };
    let total = db
        .collection::<Proyecto>("proyectos")
        .count_documents(filter.clone())
        .await?;
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;

    let mut cursor = db
        .collection::<Proyecto>("proyectos")
        .find(filter)
        .sort(doc! { "titulo_proyecto": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut proyectos: Vec<Proyecto> = Vec::new();
    while let Some(p) = cursor.try_next().await? {
        proyectos.push(p);
    }

    let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
    Ok(crate::shared::pagination::PaginatedResult {
        items: proyectos,
        total,
        page,
        limit,
        total_pages,
    })
}

async fn validate_investigadores_activos(
    db: &Database,
    investigadores_ids: &[String],
) -> Result<(), AppError> {
    let cursor = db
        .collection::<mongodb::bson::Document>("investigadores")
        .find(doc! { "id_investigador": { "$in": investigadores_ids }, "activo": 1i64 })
        .await?;
    let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
    let investigadores_activos: Vec<Investigador> = docs
        .into_iter()
        .map(|d| {
            let dto: InvestigadorDto = mongodb::bson::from_document(d)
                .map_err(|e| AppError::InternalError(format!("BSON->InvestigadorDto: {e}")))?;
            std::convert::TryFrom::try_from(dto)
        })
        .collect::<Result<_, AppError>>()?;

    if investigadores_activos.len() != investigadores_ids.len() {
        return Err(AppError::InternalError(
            "Uno o más investigadores seleccionados no existen o están inactivos.".to_string(),
        ));
    }

    Ok(())
}

pub async fn create_proyecto_con_participantes(
    db: &Database,
    request: CreateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let prepared = service::prepare_create_input(request)?;
    validate_investigadores_activos(db, &prepared.investigadores_ids).await?;

    let mut session = db.client().start_session().await?;
    session.start_transaction().await?;

    let result = async {
        let proyecto = Proyecto::new(CreateProyectoRequest {
            titulo_proyecto: prepared.titulo_proyecto,
        });
        db.collection::<Proyecto>("proyectos")
            .insert_one(&proyecto)
            .session(&mut session)
            .await?;

        let participaciones_collection = db.collection::<ParticipacionRecord>("participaciones");
        for investigador_id in prepared.investigadores_ids {
            participaciones_collection
                .insert_one(ParticipacionRecord {
                    id: format!("{}:{}", proyecto.id_proyecto, investigador_id),
                    id_proyecto: proyecto.id_proyecto.clone(),
                    es_responsable: prepared.investigador_responsable_id.as_deref()
                        == Some(investigador_id.as_str()),
                    id_investigador: investigador_id,
                })
                .session(&mut session)
                .await?;
        }

        session.commit_transaction().await?;
        Ok(proyecto)
    }
    .await;

    match result {
        Ok(proyecto) => Ok(proyecto),
        Err(error) => {
            let _ = session.abort_transaction().await;
            Err(error)
        }
    }
}

pub async fn update_proyecto_con_participantes(
    db: &Database,
    id_proyecto: &str,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let prepared = service::prepare_update_input(request)?;
    validate_investigadores_activos(db, &prepared.investigadores_ids).await?;

    let proyecto_exists = db
        .collection::<Proyecto>("proyectos")
        .find_one(doc! { "id_proyecto": id_proyecto })
        .await?;

    if proyecto_exists.is_none() {
        return Err(AppError::NotFound("Proyecto no encontrado.".to_string()));
    }

    let now = crate::shared::time::now_ms();

    let mut session = db.client().start_session().await?;
    session.start_transaction().await?;

    let result = async {
        db.collection::<mongodb::bson::Document>("proyectos")
            .update_one(
                doc! { "id_proyecto": id_proyecto },
                doc! { "$set": {
                    "titulo_proyecto": &prepared.titulo_proyecto,
                    "updated_at": now,
                } },
            )
            .session(&mut session)
            .await?;

        db.collection::<mongodb::bson::Document>("participaciones")
            .delete_many(doc! { "id_proyecto": id_proyecto })
            .session(&mut session)
            .await?;

        let participaciones_collection = db.collection::<ParticipacionRecord>("participaciones");
        for investigador_id in prepared.investigadores_ids {
            participaciones_collection
                .insert_one(ParticipacionRecord {
                    id: format!("{}:{}", id_proyecto, investigador_id),
                    id_proyecto: id_proyecto.to_string(),
                    es_responsable: prepared.investigador_responsable_id.as_deref()
                        == Some(investigador_id.as_str()),
                    id_investigador: investigador_id,
                })
                .session(&mut session)
                .await?;
        }

        session.commit_transaction().await?;
        Ok(())
    }
    .await;

    match result {
        Ok(()) => {}
        Err(error) => {
            let _ = session.abort_transaction().await;
            return Err(error);
        }
    }

    db.collection::<Proyecto>("proyectos")
        .find_one(doc! { "id_proyecto": id_proyecto })
        .await?
        .ok_or_else(|| AppError::NotFound("Proyecto no encontrado.".to_string()))
}

pub async fn eliminar_relacion_proyecto_investigador(
    db: &Database,
    id_proyecto: &str,
    id_investigador: &str,
) -> Result<(), AppError> {
    let relation_id = format!("{}:{}", id_proyecto, id_investigador);
    db.collection::<mongodb::bson::Document>("participaciones")
        .delete_one(doc! { "_id": relation_id })
        .await?;
    Ok(())
}

pub async fn eliminar_relaciones_proyecto(
    db: &Database,
    id_proyecto: &str,
) -> Result<(), AppError> {
    db.collection::<mongodb::bson::Document>("participaciones")
        .delete_many(doc! { "id_proyecto": id_proyecto })
        .await?;
    Ok(())
}

pub async fn eliminar_proyecto(
    db: &Database,
    id_proyecto: &str,
) -> Result<EliminarProyectoResultado, AppError> {
    let investigadores_relacionados = db
        .collection::<mongodb::bson::Document>("participaciones")
        .count_documents(doc! { "id_proyecto": id_proyecto })
        .await?;

    if investigadores_relacionados > 0 {
        return Err(AppError::InternalError(
            "No se puede eliminar el proyecto porque aún tiene investigadores relacionados. Elimine primero esas relaciones.".to_string(),
        ));
    }

    let now = crate::shared::time::now_ms();
    let mut recursos_desc = Vec::new();

    let mut session = db.client().start_session().await?;
    session.start_transaction().await?;

    let result = async {
        let set_doc = doc! { "$set": { "activo": 0i64, "updated_at": now } };

        db.collection::<mongodb::bson::Document>("patentes")
            .update_many(doc! { "proyecto_id": id_proyecto }, set_doc.clone())
            .session(&mut session)
            .await?;
        recursos_desc.push("patentes");

        db.collection::<mongodb::bson::Document>("productos")
            .update_many(doc! { "proyecto_id": id_proyecto }, set_doc.clone())
            .session(&mut session)
            .await?;
        recursos_desc.push("productos");

        db.collection::<mongodb::bson::Document>("equipamientos")
            .update_many(doc! { "proyecto_id": id_proyecto }, set_doc.clone())
            .session(&mut session)
            .await?;
        recursos_desc.push("equipamientos");

        db.collection::<mongodb::bson::Document>("financiamientos")
            .update_many(doc! { "proyecto_id": id_proyecto }, set_doc.clone())
            .session(&mut session)
            .await?;
        recursos_desc.push("financiamientos");

        db.collection::<mongodb::bson::Document>("proyectos")
            .update_one(
                doc! { "id_proyecto": id_proyecto },
                doc! { "$set": { "activo": 0i64, "updated_at": now } },
            )
            .session(&mut session)
            .await?;

        session.commit_transaction().await?;
        Ok(())
    }
    .await;

    match result {
        Ok(()) => {}
        Err(error) => {
            let _ = session.abort_transaction().await;
            return Err(error);
        }
    }

    let recursos_str = if recursos_desc.is_empty() {
        String::new()
    } else {
        recursos_desc.join(", ")
    };

    Ok(EliminarProyectoResultado {
        accion: "desactivado".to_string(),
        mensaje: if recursos_str.is_empty() {
            "Proyecto desactivado correctamente.".to_string()
        } else {
            format!(
                "Proyecto desactivado correctamente. Recursos relacionados desactivados: {}.",
                recursos_str
            )
        },
    })
}

pub async fn reactivar_proyecto(db: &Database, id_proyecto: &str) -> Result<Proyecto, AppError> {
    let now = crate::shared::time::now_ms();
    db.collection::<mongodb::bson::Document>("proyectos")
        .update_one(
            doc! { "id_proyecto": id_proyecto },
            doc! { "$set": { "activo": 1i64, "updated_at": now } },
        )
        .await?;

    db.collection::<Proyecto>("proyectos")
        .find_one(doc! { "id_proyecto": id_proyecto })
        .await?
        .ok_or_else(|| AppError::NotFound("Proyecto no encontrado.".to_string()))
}
