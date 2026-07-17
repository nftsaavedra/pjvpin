use std::collections::HashMap;
use std::convert::TryFrom;

use futures_util::TryStreamExt;
use mongodb::{bson::doc, bson::Document, Database};

use crate::proyectos::dto::{
    ParticipacionRecordDto, ProyectoDetalleDto, ProyectoDto, ProyectoParticipanteResumenDto,
};
use crate::proyectos::models::{ParticipacionRecord, Proyecto};
use crate::proyectos::repository::get_ids_proyectos_como_responsable;
use crate::shared::data_loader;
use crate::shared::error::AppError;

const COLLECTION_PROYECTOS: &str = "proyectos";
const COLLECTION_PARTICIPACIONES: &str = "participaciones";

fn doc_to_proyecto_dto(doc: Document) -> Result<ProyectoDto, AppError> {
    mongodb::bson::from_document::<ProyectoDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar proyecto desde BSON: {e}"))
    })
}

fn dto_to_proyecto(dto: ProyectoDto) -> Proyecto {
    Proyecto::try_from(dto).expect("ProyectoDto -> Proyecto conversion failed")
}

fn doc_to_participacion_dto(doc: Document) -> Result<ParticipacionRecordDto, AppError> {
    mongodb::bson::from_document::<ParticipacionRecordDto>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar participacion desde BSON: {e}"
        ))
    })
}

fn dto_to_participacion(dto: ParticipacionRecordDto) -> ParticipacionRecord {
    ParticipacionRecord::try_from(dto)
        .expect("ParticipacionRecordDto -> ParticipacionRecord conversion failed")
}

pub async fn buscar_proyectos_por_investigador(
    db: &Database,
    id_investigador: &str,
) -> Result<Vec<Proyecto>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION_PARTICIPACIONES)
        .find(doc! { "id_investigador": id_investigador })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let participaciones: Vec<ParticipacionRecord> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_participacion(doc_to_participacion_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;

    let proyecto_ids: Vec<String> = participaciones
        .into_iter()
        .map(|item| item.id_proyecto)
        .collect();
    if proyecto_ids.is_empty() {
        return Ok(Vec::new());
    }

    let cursor = db
        .collection::<Document>(COLLECTION_PROYECTOS)
        .find(doc! { "id_proyecto": { "$in": proyecto_ids }, "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut proyectos: Vec<Proyecto> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_proyecto(doc_to_proyecto_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;
    proyectos.sort_by(|a, b| {
        a.titulo_proyecto
            .to_lowercase()
            .cmp(&b.titulo_proyecto.to_lowercase())
    });
    Ok(proyectos)
}

pub async fn get_all_proyectos_detalle(
    db: &Database,
    responsable_id: Option<&str>,
) -> Result<Vec<ProyectoDetalleDto>, AppError> {
    let filter = if let Some(investigador_id) = responsable_id {
        let proyecto_ids = get_ids_proyectos_como_responsable(db, investigador_id).await?;
        if proyecto_ids.is_empty() {
            return Ok(Vec::new());
        }
        doc! { "id_proyecto": { "$in": proyecto_ids }, "activo": 1i64 }
    } else {
        doc! { "activo": 1i64 }
    };
    let cursor = db
        .collection::<Document>(COLLECTION_PROYECTOS)
        .find(filter)
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut proyectos: Vec<Proyecto> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_proyecto(doc_to_proyecto_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;
    proyectos.sort_by(|a, b| {
        a.titulo_proyecto
            .to_lowercase()
            .cmp(&b.titulo_proyecto.to_lowercase())
    });

    let investigadores = data_loader::load_investigadores_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut investigadores_por_proyecto: HashMap<String, Vec<String>> = HashMap::new();
    let mut participantes_por_proyecto: HashMap<String, Vec<ProyectoParticipanteResumenDto>> =
        HashMap::new();
    for participacion in participaciones {
        if let Some(investigador) = investigadores.get(&participacion.id_investigador) {
            let proyecto_id = participacion.id_proyecto.clone();
            let grado = data_loader::resolve_grado_nombre(&grados, &investigador.id_grado);
            let nivel_renacyt = data_loader::resolve_renacyt_nivel(investigador);
            let nombre_investigador = personas
                .get(&investigador.persona_id)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default();
            investigadores_por_proyecto
                .entry(proyecto_id.clone())
                .or_default()
                .push(format!(
                    "{} ({} · {})",
                    nombre_investigador, grado, nivel_renacyt
                ));
            participantes_por_proyecto
                .entry(proyecto_id)
                .or_default()
                .push(ProyectoParticipanteResumenDto {
                    id_investigador: investigador.id_investigador.clone(),
                    nombre: nombre_investigador,
                    grado,
                    renacyt_nivel: nivel_renacyt,
                    es_responsable: participacion.es_responsable,
                });
        }
    }

    let detalles = proyectos
        .into_iter()
        .map(|proyecto| {
            let proyecto_id = proyecto.id_proyecto.clone();
            let investigadores_proyecto = investigadores_por_proyecto
                .remove(&proyecto_id)
                .unwrap_or_default();
            let mut participantes = participantes_por_proyecto
                .remove(&proyecto_id)
                .unwrap_or_default();
            participantes.sort_by(|a, b| {
                b.es_responsable
                    .cmp(&a.es_responsable)
                    .then_with(|| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()))
            });
            let investigador_responsable = participantes
                .iter()
                .find(|participante| participante.es_responsable)
                .map(|participante| participante.nombre.clone());
            ProyectoDetalleDto {
                id_proyecto: proyecto.id_proyecto,
                titulo_proyecto: proyecto.titulo_proyecto,
                cantidad_investigadores: investigadores_proyecto.len() as i64,
                investigador_responsable,
                investigadores: data_loader::join_or_none(&investigadores_proyecto, " | "),
                participantes_json: if investigadores_proyecto.is_empty() {
                    None
                } else {
                    serde_json::to_string(&participantes).ok()
                },
                activo: proyecto.activo,
            }
        })
        .collect();

    Ok(detalles)
}
