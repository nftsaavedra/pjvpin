use crate::grupos::dto::{CreateGrupoInvestigacionRequest, UpdateGrupoInvestigacionRequest};
use crate::grupos::models::GrupoInvestigacion;
use crate::grupos::repository;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

pub async fn get_all(state: &AppState) -> Result<Vec<GrupoInvestigacion>, AppError> {
    repository::get_all_grupos(state.mongo_db()?).await
}

pub async fn create(
    state: &AppState,
    request: CreateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    repository::create_grupo(state.mongo_db()?, request).await
}

pub async fn get_by_id(state: &AppState, id_grupo: &str) -> Result<GrupoInvestigacion, AppError> {
    repository::get_grupo_by_id(state.mongo_db()?, id_grupo).await
}

pub async fn update(
    state: &AppState,
    id_grupo: &str,
    request: UpdateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    repository::update_grupo(state.mongo_db()?, id_grupo, request).await
}

pub async fn delete(state: &AppState, id_grupo: &str) -> Result<(), AppError> {
    repository::delete_grupo(state.mongo_db()?, id_grupo).await
}
