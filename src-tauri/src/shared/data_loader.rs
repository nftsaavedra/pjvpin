use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::catalogos::models::CatalogoItem;
use crate::grados::models::GradoAcademico;
use crate::grupos::models::GrupoInvestigacion;
use crate::investigadores::models::Investigador;
use crate::personas::models::Persona;
use crate::personas::repository as personas_repo;
use crate::proyectos::models::{ParticipacionRecord, Proyecto};
use crate::shared::error::AppError;

pub fn resolve_grado_nombre(grados: &HashMap<String, GradoAcademico>, id_grado: &str) -> String {
    grados
        .get(id_grado)
        .map(|g| g.nombre.clone())
        .unwrap_or_else(|| "Sin grado".to_string())
}

pub fn resolve_renacyt_nivel(investigador: &Investigador) -> String {
    investigador
        .renacyt_nivel
        .as_ref()
        .filter(|v| !v.trim().is_empty())
        .cloned()
        .unwrap_or_else(|| "No registrado".to_string())
}

pub fn join_or_none(items: &[String], separator: &str) -> Option<String> {
    if items.is_empty() {
        None
    } else {
        Some(items.join(separator))
    }
}

pub async fn load_grados_map(db: &Database) -> Result<HashMap<String, GradoAcademico>, AppError> {
    let grados = db
        .collection::<GradoAcademico>("grados")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    Ok(grados
        .into_iter()
        .map(|grado| (grado.id_grado.clone(), grado))
        .collect())
}

pub async fn load_investigadores_map(
    db: &Database,
) -> Result<HashMap<String, Investigador>, AppError> {
    let investigadores = db
        .collection::<Investigador>("investigadores")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    Ok(investigadores
        .into_iter()
        .map(|investigador| (investigador.id_investigador.clone(), investigador))
        .collect())
}

pub async fn load_personas_map(db: &Database) -> Result<HashMap<String, Persona>, AppError> {
    personas_repo::load_all_map(db).await
}

pub async fn load_proyectos_map(db: &Database) -> Result<HashMap<String, Proyecto>, AppError> {
    let proyectos = db
        .collection::<Proyecto>("proyectos")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    Ok(proyectos
        .into_iter()
        .map(|proyecto| (proyecto.id_proyecto.clone(), proyecto))
        .collect())
}

pub async fn load_participaciones(db: &Database) -> Result<Vec<ParticipacionRecord>, AppError> {
    db.collection::<ParticipacionRecord>("participaciones")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn load_grupos_map(
    db: &Database,
) -> Result<HashMap<String, GrupoInvestigacion>, AppError> {
    let grupos = db
        .collection::<GrupoInvestigacion>("grupos_investigacion")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    Ok(grupos
        .into_iter()
        .map(|g| (g.id_grupo.clone(), g))
        .collect())
}

pub async fn load_catalogos_map(
    db: &Database,
) -> Result<HashMap<(String, String), CatalogoItem>, AppError> {
    let items = db
        .collection::<CatalogoItem>("catalogos")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    Ok(items
        .into_iter()
        .map(|c| ((c.tipo.clone(), c.codigo.clone()), c))
        .collect())
}
