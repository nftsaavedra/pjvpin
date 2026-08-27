use super::handlers;
use crate::grupos::dto::{
    CreateGrupoInvestigacionRequest, GrupoInvestigacionDto, UpdateGrupoInvestigacionRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

#[tauri::command]
pub async fn get_all_grupos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<GrupoInvestigacionDto>, AppError> {
    let items = handlers::get_all_grupos(&state, window.label()).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn create_grupo(
    window: Window,
    state: State<'_, AppState>,
    request: CreateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacionDto, AppError> {
    let item = handlers::create_grupo(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_grupo(
    window: Window,
    state: State<'_, AppState>,
    id_grupo: String,
) -> Result<GrupoInvestigacionDto, AppError> {
    let item = handlers::get_grupo(&state, window.label(), &id_grupo).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn update_grupo(
    window: Window,
    state: State<'_, AppState>,
    id_grupo: String,
    request: UpdateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacionDto, AppError> {
    let item = handlers::update_grupo(&state, window.label(), &id_grupo, request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn delete_grupo(
    window: Window,
    state: State<'_, AppState>,
    id_grupo: String,
) -> Result<(), AppError> {
    handlers::delete_grupo(&state, window.label(), &id_grupo).await
}
