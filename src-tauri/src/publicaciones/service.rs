use crate::publicaciones::models::{
    CreatePublicacionRequest, PublicacionCientifica, UpdatePublicacionRequest,
};
use crate::publicaciones::repository;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

pub async fn create(
    state: &AppState,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let db = state.mongo_db()?;
    repository::create(db, request).await
}

pub async fn get_all(state: &AppState) -> Result<Vec<PublicacionCientifica>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all(db).await
}

pub async fn get_by_id(state: &AppState, id: &str) -> Result<PublicacionCientifica, AppError> {
    let db = state.mongo_db()?;
    repository::get_by_id(db, id).await
}

pub async fn get_by_investigador(
    state: &AppState,
    investigador_id: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    let db = state.mongo_db()?;
    repository::get_by_investigador(db, investigador_id).await
}

pub async fn get_by_anio(
    state: &AppState,
    anio: i32,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    let db = state.mongo_db()?;
    repository::get_by_anio(db, anio).await
}

pub async fn update(
    state: &AppState,
    id: &str,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let db = state.mongo_db()?;
    repository::update(db, id, request).await
}

pub async fn delete(state: &AppState, id: &str) -> Result<(), AppError> {
    let db = state.mongo_db()?;
    repository::delete(db, id).await
}

pub async fn reactivate(state: &AppState, id: &str) -> Result<PublicacionCientifica, AppError> {
    let db = state.mongo_db()?;
    repository::reactivate(db, id).await
}
