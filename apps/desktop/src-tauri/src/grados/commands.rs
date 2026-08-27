use super::handlers;
use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto, GradoAcademicoDto};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

#[tauri::command]
pub async fn get_all_grados(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<GradoAcademicoDto>, AppError> {
    let grados = handlers::get_all_grados(&state, window.label()).await?;
    Ok(grados.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_all_grados_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<GradoAcademicoDto>, AppError> {
    let result = handlers::get_all_grados_paginated(&state, window.label(), page, limit).await?;
    Ok(crate::shared::pagination::PaginatedResult {
        items: result.items.into_iter().map(Into::into).collect(),
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
    })
}

#[tauri::command]
pub async fn crear_grado(
    window: Window,
    state: State<'_, AppState>,
    request: CreateGradoRequest,
) -> Result<GradoAcademicoDto, AppError> {
    let grado = handlers::crear_grado(&state, window.label(), request).await?;
    Ok(grado.into())
}

#[tauri::command]
pub async fn actualizar_grado(
    window: Window,
    state: State<'_, AppState>,
    id_grado: String,
    request: CreateGradoRequest,
) -> Result<GradoAcademicoDto, AppError> {
    let grado = handlers::actualizar_grado(&state, window.label(), &id_grado, request).await?;
    Ok(grado.into())
}

#[tauri::command]
pub async fn eliminar_grado(
    window: Window,
    state: State<'_, AppState>,
    id_grado: String,
) -> Result<EliminarGradoResultadoDto, AppError> {
    handlers::eliminar_grado(&state, window.label(), &id_grado).await
}

#[tauri::command]
pub async fn reactivar_grado(
    window: Window,
    state: State<'_, AppState>,
    id_grado: String,
) -> Result<GradoAcademicoDto, AppError> {
    let grado = handlers::reactivar_grado(&state, window.label(), &id_grado).await?;
    Ok(grado.into())
}
