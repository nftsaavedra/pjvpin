use std::collections::HashMap;

use crate::proyectos::models::ParticipacionRecord;
use crate::proyectos::models::{Proyecto, ProyectoDetalle, ProyectoParticipanteResumen};
use crate::proyectos::repository::get_ids_proyectos_como_responsable;
use crate::shared::data_loader;
use crate::shared::error::AppError;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

pub async fn buscar_proyectos_por_investigador(
    db: &Database,
    id_investigador: &str,
) -> Result<Vec<Proyecto>, AppError> {
    let participaciones = db
        .collection::<ParticipacionRecord>("participaciones")
        .find(doc! { "id_investigador": id_investigador })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let proyecto_ids: Vec<String> = participaciones
        .into_iter()
        .map(|item| item.id_proyecto)
        .collect();
    if proyecto_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut proyectos = db
        .collection::<Proyecto>("proyectos")
        .find(doc! { "id_proyecto": { "$in": proyecto_ids }, "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
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
) -> Result<Vec<ProyectoDetalle>, AppError> {
    let filter = if let Some(investigador_id) = responsable_id {
        let proyecto_ids = get_ids_proyectos_como_responsable(db, investigador_id).await?;
        if proyecto_ids.is_empty() {
            return Ok(Vec::new());
        }
        doc! { "id_proyecto": { "$in": proyecto_ids }, "activo": 1i64 }
    } else {
        doc! { "activo": 1i64 }
    };
    let mut proyectos = db
        .collection::<Proyecto>("proyectos")
        .find(filter)
        .await?
        .try_collect::<Vec<_>>()
        .await?;
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
    let mut participantes_por_proyecto: HashMap<String, Vec<ProyectoParticipanteResumen>> =
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
                .push(ProyectoParticipanteResumen {
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
            ProyectoDetalle {
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
