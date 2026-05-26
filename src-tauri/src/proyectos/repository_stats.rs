use std::collections::{HashMap, HashSet};

use chrono::Datelike;

use crate::docentes::models::Docente;
use crate::docentes::repository as docentes_repo;
use crate::proyectos::models::{
    DocenteProyectosCount, KpisDashboard, Proyecto, ProyectosTrendItem, RenacytDistribucionItem,
};
use crate::shared::data_loader;
use crate::shared::error::AppError;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

pub async fn get_estadisticas_proyectos_x_docente(
    db: &Database,
) -> Result<Vec<DocenteProyectosCount>, AppError> {
    let docentes = docentes_repo::get_all_docentes(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut activos_por_docente: HashMap<String, i64> = docentes
        .iter()
        .map(|docente| (docente.id_docente.clone(), 0))
        .collect();

    for participacion in participaciones {
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                if let Some(contador) = activos_por_docente.get_mut(&participacion.id_docente) {
                    *contador += 1;
                }
            }
        }
    }

    let mut stats: Vec<DocenteProyectosCount> = docentes
        .into_iter()
        .map(|docente| {
            let nombre = personas
                .get(&docente.persona_id)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default();
            DocenteProyectosCount {
                nombre,
                cantidad: *activos_por_docente.get(&docente.id_docente).unwrap_or(&0),
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

pub async fn get_kpis_dashboard(db: &Database) -> Result<KpisDashboard, AppError> {
    let docentes = docentes_repo::get_all_docentes(db).await?;
    let proyectos = db
        .collection::<mongodb::bson::Document>("proyectos")
        .count_documents(doc! { "activo": 1i64 })
        .await? as i64;
    let stats = get_estadisticas_proyectos_x_docente(db).await?;

    let docentes_con_1_proyecto = stats.iter().filter(|item| item.cantidad == 1).count() as i64;
    let docentes_multiples_proyectos = stats.iter().filter(|item| item.cantidad > 1).count() as i64;

    Ok(KpisDashboard {
        total_proyectos: proyectos,
        total_docentes: docentes.len() as i64,
        docentes_con_1_proyecto,
        docentes_multiples_proyectos,
    })
}

pub async fn get_proyectos_trend(db: &Database) -> Result<Vec<ProyectosTrendItem>, AppError> {
    let proyectos = db
        .collection::<Proyecto>("proyectos")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

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

    let mut items: Vec<ProyectosTrendItem> = trend
        .into_iter()
        .map(|((anio, mes), cantidad)| ProyectosTrendItem {
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
) -> Result<Vec<RenacytDistribucionItem>, AppError> {
    let docentes = db
        .collection::<Docente>("docentes")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut docentes_con_proyectos: HashSet<String> = HashSet::new();
    for p in &participaciones {
        if let Some(proj) = proyectos.get(&p.id_proyecto) {
            if proj.activo {
                docentes_con_proyectos.insert(p.id_docente.clone());
            }
        }
    }

    let mut grupos: HashMap<String, RenacytDistribucionItem> = HashMap::new();
    for docente in &docentes {
        let nivel = data_loader::resolve_renacyt_nivel(docente);

        let entry = grupos
            .entry(nivel.clone())
            .or_insert(RenacytDistribucionItem {
                nivel,
                cantidad_docentes: 0,
                con_proyectos: 0,
                sin_proyectos: 0,
            });
        entry.cantidad_docentes += 1;
        if docentes_con_proyectos.contains(&docente.id_docente) {
            entry.con_proyectos += 1;
        } else {
            entry.sin_proyectos += 1;
        }
    }

    let mut items: Vec<RenacytDistribucionItem> = grupos.into_values().collect();
    items.sort_by(|a, b| a.nivel.to_lowercase().cmp(&b.nivel.to_lowercase()));
    Ok(items)
}
