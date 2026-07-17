use std::collections::{HashMap, HashSet};
use std::convert::TryFrom;

use chrono::Datelike;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, bson::Document, Database};

use crate::investigadores::models::Investigador;
use crate::investigadores::repository as investigadores_repo;
use crate::proyectos::dto::{
    InvestigadorProyectosCountDto, KpisDashboardDto, ProyectoDto, ProyectosTrendItemDto,
    RenacytDistribucionItemDto,
};
use crate::proyectos::models::Proyecto;
use crate::shared::data_loader;
use crate::shared::error::AppError;

const COLLECTION_PROYECTOS: &str = "proyectos";

fn doc_to_proyecto_dto(doc: Document) -> Result<ProyectoDto, AppError> {
    mongodb::bson::from_document::<ProyectoDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar proyecto desde BSON: {e}"))
    })
}

fn dto_to_proyecto(dto: ProyectoDto) -> Proyecto {
    Proyecto::try_from(dto).expect("ProyectoDto -> Proyecto conversion failed")
}

pub async fn get_estadisticas_proyectos_x_investigador(
    db: &Database,
) -> Result<Vec<InvestigadorProyectosCountDto>, AppError> {
    let investigadores = investigadores_repo::get_all_investigadores(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut activos_por_investigador: HashMap<String, i64> = investigadores
        .iter()
        .map(|investigador| (investigador.id_investigador.clone(), 0))
        .collect();

    for participacion in participaciones {
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                if let Some(contador) =
                    activos_por_investigador.get_mut(&participacion.id_investigador)
                {
                    *contador += 1;
                }
            }
        }
    }

    let mut stats: Vec<InvestigadorProyectosCountDto> = investigadores
        .into_iter()
        .map(|investigador| {
            let nombre = personas
                .get(&investigador.persona_id)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default();
            InvestigadorProyectosCountDto {
                nombre,
                cantidad: *activos_por_investigador
                    .get(&investigador.id_investigador)
                    .unwrap_or(&0),
            }
        })
        .collect();
    stats.sort_by(|a, b| {
        b.cantidad
            .cmp(&a.cantidad)
            .then_with(|| a.nombre.cmp(&b.nombre))
    });
    Ok(stats)
}

pub async fn get_kpis_dashboard(db: &Database) -> Result<KpisDashboardDto, AppError> {
    let investigadores = investigadores_repo::get_all_investigadores(db).await?;
    let proyectos = db
        .collection::<mongodb::bson::Document>(COLLECTION_PROYECTOS)
        .count_documents(doc! { "activo": 1i64 })
        .await? as i64;
    let stats = get_estadisticas_proyectos_x_investigador(db).await?;

    let investigadores_con_1_proyecto =
        stats.iter().filter(|item| item.cantidad == 1).count() as i64;
    let investigadores_multiples_proyectos =
        stats.iter().filter(|item| item.cantidad > 1).count() as i64;

    Ok(KpisDashboardDto {
        total_proyectos: proyectos,
        total_investigadores: investigadores.len() as i64,
        investigadores_con_1_proyecto,
        investigadores_multiples_proyectos,
    })
}

pub async fn get_proyectos_trend(db: &Database) -> Result<Vec<ProyectosTrendItemDto>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION_PROYECTOS)
        .find(doc! { "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let proyectos: Vec<Proyecto> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_proyecto(doc_to_proyecto_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;

    let mut trend: HashMap<(i32, u32), i64> = HashMap::new();

    for proj in &proyectos {
        let millis = proj.updated_at.unwrap_or(0);
        if millis == 0 {
            continue;
        }
        let dt = match chrono::DateTime::from_timestamp_millis(millis) {
            Some(dt) => dt,
            None => continue,
        };
        let year = dt.year();
        let month = dt.month();
        *trend.entry((year, month)).or_default() += 1;
    }

    let mut items: Vec<ProyectosTrendItemDto> = trend
        .into_iter()
        .map(|((anio, mes), cantidad)| ProyectosTrendItemDto {
            anio,
            mes,
            cantidad,
        })
        .collect();
    items.sort_by(|a, b| a.anio.cmp(&b.anio).then_with(|| a.mes.cmp(&b.mes)));
    Ok(items)
}

pub async fn get_renacyt_distribucion(
    db: &Database,
) -> Result<Vec<RenacytDistribucionItemDto>, AppError> {
    let investigadores: Vec<Investigador> =
        crate::investigadores::repository::get_all_investigadores(db).await?;

    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut investigadores_con_proyectos: HashSet<String> = HashSet::new();
    for p in &participaciones {
        if let Some(proj) = proyectos.get(&p.id_proyecto) {
            if proj.activo {
                investigadores_con_proyectos.insert(p.id_investigador.clone());
            }
        }
    }

    let mut grupos: HashMap<String, RenacytDistribucionItemDto> = HashMap::new();
    for investigador in &investigadores {
        let nivel = data_loader::resolve_renacyt_nivel(investigador);

        let entry = grupos
            .entry(nivel.clone())
            .or_insert(RenacytDistribucionItemDto {
                nivel,
                cantidad_investigadores: 0,
                con_proyectos: 0,
                sin_proyectos: 0,
            });
        entry.cantidad_investigadores += 1;
        if investigadores_con_proyectos.contains(&investigador.id_investigador) {
            entry.con_proyectos += 1;
        } else {
            entry.sin_proyectos += 1;
        }
    }

    let mut items: Vec<RenacytDistribucionItemDto> = grupos.into_values().collect();
    items.sort_by(|a, b| a.nivel.to_lowercase().cmp(&b.nivel.to_lowercase()));
    Ok(items)
}
