use tauri::{State, Window};

use crate::investigadores::dto::{PublicacionDto, SyncPublicacionesResult};
use crate::shared::access_control;
use crate::shared::error::AppError;
use crate::shared::external::pure_service;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn sincronizar_publicaciones_pure(
    window: Window,
    state: State<'_, AppState>,
    investigador_id: String,
) -> Result<SyncPublicacionesResult, AppError> {
    access_control::require_investigadores_manage_permission(&state, window.label()).await?;
    pure_service::sync_publicaciones(&state, &investigador_id).await
}

#[tauri::command]
pub async fn get_publicaciones_investigador(
    window: Window,
    state: State<'_, AppState>,
    investigador_id: String,
) -> Result<Vec<PublicacionDto>, AppError> {
    access_control::require_investigadores_view_permission(&state, window.label()).await?;
    let items = pure_service::get_publicaciones(&state, &investigador_id).await?;
    Ok(items.into_iter().map(Into::into).collect())
}
