//! Comandos Tauri de la feature `ocde`.

use serde::Deserialize;
use tauri::{State, Window};

use super::handlers;
use crate::ocde::models::EntityOcdeFieldDoc;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsignarOcdeRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub ocde_codigo: String,
}

#[tauri::command]
pub async fn asignar_campo_ocde(
    window: Window,
    state: State<'_, AppState>,
    request: AsignarOcdeRequest,
) -> Result<EntityOcdeFieldDoc, AppError> {
    handlers::asignar_campo_ocde(
        &state,
        window.label(),
        &request.entity_type,
        &request.entity_id,
        &request.ocde_codigo,
    )
    .await
}

#[tauri::command]
pub async fn quitar_campo_ocde(
    window: Window,
    state: State<'_, AppState>,
    request: AsignarOcdeRequest,
) -> Result<bool, AppError> {
    handlers::quitar_campo_ocde(
        &state,
        window.label(),
        &request.entity_type,
        &request.entity_id,
        &request.ocde_codigo,
    )
    .await
}

#[tauri::command]
pub async fn listar_campos_ocde(
    window: Window,
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<EntityOcdeFieldDoc>, AppError> {
    handlers::listar_campos_ocde(&state, window.label(), &entity_type, &entity_id).await
}
