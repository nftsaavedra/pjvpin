use tauri::{State, Window};

use super::handlers;
use crate::publicaciones::dto::{
    CreatePublicacionRequest, PublicacionCientificaDto, UpdatePublicacionRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_publicacion(
    window: Window,
    state: State<'_, AppState>,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::crear_publicacion(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_all_publicaciones(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items = handlers::get_all_publicaciones(&state, window.label()).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_publicacion_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::get_publicacion_by_id(&state, window.label(), &id).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_publicaciones_by_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items =
        handlers::get_publicaciones_by_investigador(&state, window.label(), &id_investigador)
            .await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_publicaciones_by_anio(
    window: Window,
    state: State<'_, AppState>,
    anio: i32,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items = handlers::get_publicaciones_by_anio(&state, window.label(), anio).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn actualizar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::actualizar_publicacion(&state, window.label(), &id, request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn eliminar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    handlers::eliminar_publicacion(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::reactivar_publicacion(&state, window.label(), &id).await?;
    Ok(item.into())
}
