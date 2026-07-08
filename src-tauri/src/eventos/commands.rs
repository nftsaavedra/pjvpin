use tauri::{State, Window};

use super::handlers;
use crate::eventos::models::{CreateEventoRequest, EventoAcademico, UpdateEventoRequest};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_evento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    handlers::crear_evento(&state, window.label(), request).await
}

#[tauri::command]
pub async fn get_all_eventos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<EventoAcademico>, AppError> {
    handlers::get_all_eventos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_evento_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EventoAcademico, AppError> {
    handlers::get_evento_by_id(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn get_eventos_by_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<EventoAcademico>, AppError> {
    handlers::get_eventos_by_investigador(&state, window.label(), &id_investigador).await
}

#[tauri::command]
pub async fn actualizar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    handlers::actualizar_evento(&state, window.label(), &id, request).await
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
) -> Result<EventoAcademico, AppError> {
    handlers::reactivar_evento(&state, window.label(), &id).await
}
