use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto};
use crate::grados::models::GradoAcademico;
use crate::grados::repository;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

pub async fn get_all(state: &AppState) -> Result<Vec<GradoAcademico>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_grados(db).await
}

pub async fn create(
    state: &AppState,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::create_grado(db, request).await
}

pub async fn update(
    state: &AppState,
    id_grado: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::update_grado(db, id_grado, request).await
}

pub async fn delete(
    state: &AppState,
    id_grado: &str,
) -> Result<EliminarGradoResultadoDto, AppError> {
    let db = state.mongo_db()?;
    repository::delete_grado(db, id_grado).await
}

pub async fn reactivate(state: &AppState, id_grado: &str) -> Result<GradoAcademico, AppError> {
    let db = state.mongo_db()?;
    repository::reactivar_grado(db, id_grado).await
}

pub async fn get_all_paginated(
    state: &AppState,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<GradoAcademico>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_grados_paginated(db, page, limit).await
}
