use tauri::{State, Window};

use super::handlers;
use crate::eventos::dto::{CreateEventoRequest, EventoAcademicoDto, UpdateEventoRequest};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_evento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateEventoRequest,
) -> Result<EventoAcademicoDto, AppError> {
    let item = handlers::crear_evento(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_all_eventos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<EventoAcademicoDto>, AppError> {
    let items = handlers::get_all_eventos(&state, window.label()).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_evento_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EventoAcademicoDto, AppError> {
    let item = handlers::get_evento_by_id(&state, window.label(), &id).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_eventos_by_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<EventoAcademicoDto>, AppError> {
    let items =
        handlers::get_eventos_by_investigador(&state, window.label(), &id_investigador).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn actualizar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdateEventoRequest,
) -> Result<EventoAcademicoDto, AppError> {
    let item = handlers::actualizar_evento(&state, window.label(), &id, request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn eliminar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    handlers::eliminar_evento(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EventoAcademicoDto, AppError> {
    let item = handlers::reactivar_evento(&state, window.label(), &id).await?;
    Ok(item.into())
}
