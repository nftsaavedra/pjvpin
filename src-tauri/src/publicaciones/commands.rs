use tauri::{State, Window};

use crate::publicaciones::models::{
    CreatePublicacionRequest, PublicacionCientifica, UpdatePublicacionRequest,
};
use crate::shared::access_control;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_publicacion(
    window: Window,
    state: State<'_, AppState>,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    access_control::crear_publicacion(&state, window.label(), request).await
}

#[tauri::command]
pub async fn get_all_publicaciones(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    access_control::get_all_publicaciones(&state, window.label()).await
}

#[tauri::command]
pub async fn get_publicacion_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientifica, AppError> {
    access_control::get_publicacion_by_id(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn get_publicaciones_by_docente(
    window: Window,
    state: State<'_, AppState>,
    docente_id: String,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    access_control::get_publicaciones_by_docente(&state, window.label(), &docente_id).await
}

#[tauri::command]
pub async fn get_publicaciones_by_anio(
    window: Window,
    state: State<'_, AppState>,
    anio: i32,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    access_control::get_publicaciones_by_anio(&state, window.label(), anio).await
}

#[tauri::command]
pub async fn actualizar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    access_control::actualizar_publicacion(&state, window.label(), &id, request).await
}

#[tauri::command]
pub async fn eliminar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    access_control::eliminar_publicacion(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientifica, AppError> {
    access_control::reactivar_publicacion(&state, window.label(), &id).await
}
