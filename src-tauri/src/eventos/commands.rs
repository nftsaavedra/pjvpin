use tauri::{State, Window};

use crate::eventos::models::{CreateEventoRequest, EventoAcademico, UpdateEventoRequest};
use crate::shared::access_control;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_evento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    access_control::crear_evento(&state, window.label(), request).await
}

#[tauri::command]
pub async fn get_all_eventos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<EventoAcademico>, AppError> {
    access_control::get_all_eventos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_evento_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EventoAcademico, AppError> {
    access_control::get_evento_by_id(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn get_eventos_by_docente(
    window: Window,
    state: State<'_, AppState>,
    docente_id: String,
) -> Result<Vec<EventoAcademico>, AppError> {
    access_control::get_eventos_by_docente(&state, window.label(), &docente_id).await
}

#[tauri::command]
pub async fn actualizar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    access_control::actualizar_evento(&state, window.label(), &id, request).await
}

#[tauri::command]
pub async fn eliminar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    access_control::eliminar_evento(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_evento(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EventoAcademico, AppError> {
    access_control::reactivar_evento(&state, window.label(), &id).await
}
