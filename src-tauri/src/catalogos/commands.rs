use tauri::{State, Window};

use super::handlers;
use crate::catalogos::dto::{CatalogoItemDto, CreateCatalogoRequest, EliminarCatalogoResultadoDto};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn get_catalogos(
    window: Window,
    state: State<'_, AppState>,
    tipo: String,
) -> Result<Vec<CatalogoItemDto>, AppError> {
    let items = handlers::get_catalogos(&state, window.label(), &tipo).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_all_catalogos_admin(
    window: Window,
    state: State<'_, AppState>,
    tipo: String,
) -> Result<Vec<CatalogoItemDto>, AppError> {
    let items = handlers::get_all_catalogos_admin(&state, window.label(), &tipo).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn crear_catalogo(
    window: Window,
    state: State<'_, AppState>,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItemDto, AppError> {
    let item = handlers::crear_catalogo(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn actualizar_catalogo(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItemDto, AppError> {
    let item = handlers::actualizar_catalogo(&state, window.label(), &id, request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn eliminar_catalogo(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<EliminarCatalogoResultadoDto, AppError> {
    handlers::eliminar_catalogo(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_catalogo(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<CatalogoItemDto, AppError> {
    let item = handlers::reactivar_catalogo(&state, window.label(), &id).await?;
    Ok(item.into())
}

// =====================================================================
// Vocabularios CONCYTEC (15 esquemas SKOS)
// =====================================================================

#[tauri::command]
pub async fn listar_vocabularios_concytec(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    handlers::listar_vocabularios_concytec(&state, window.label()).await
}

#[tauri::command]
pub async fn listar_vocab_items(
    window: Window,
    state: State<'_, AppState>,
    esquema: String,
    padre_codigo: Option<String>,
) -> Result<Vec<CatalogoItemDto>, AppError> {
    handlers::listar_vocab_items(&state, window.label(), &esquema, padre_codigo).await
}

#[tauri::command]
pub async fn reimportar_vocabulario(
    window: Window,
    state: State<'_, AppState>,
    esquema: String,
) -> Result<(), AppError> {
    handlers::reimportar_vocabulario(&state, window.label(), &esquema).await
}
