use crate::eventos::dto::{CreateEventoRequest, UpdateEventoRequest};
use crate::eventos::models::EventoAcademico;
use crate::eventos::repository;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

pub async fn create(
    state: &AppState,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::create(db, request).await
}

pub async fn get_all(state: &AppState) -> Result<Vec<EventoAcademico>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all(db).await
}

pub async fn get_by_id(state: &AppState, id: &str) -> Result<EventoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::get_by_id(db, id).await
}

pub async fn get_by_investigador(
    state: &AppState,
    investigador_id: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    let db = state.mongo_db()?;
    repository::get_by_investigador(db, investigador_id).await
}

pub async fn update(
    state: &AppState,
    id: &str,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::update(db, id, request).await
}

pub async fn delete(state: &AppState, id: &str) -> Result<(), AppError> {
    let db = state.mongo_db()?;
    repository::delete(db, id).await
}

pub async fn reactivate(state: &AppState, id: &str) -> Result<EventoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::reactivate(db, id).await
}
