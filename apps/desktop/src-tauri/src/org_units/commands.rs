//! Comandos Tauri de la feature `org_units`.

use tauri::{State, Window};

use super::handlers;
use crate::org_units::dto::{CreateOrgUnitRequest, OrgUnitDto, UpdateOrgUnitRequest};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_org_unit(
    window: Window,
    state: State<'_, AppState>,
    request: CreateOrgUnitRequest,
) -> Result<OrgUnitDto, AppError> {
    handlers::crear_org_unit(&state, window.label(), request).await
}

#[tauri::command]
pub async fn actualizar_org_unit(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdateOrgUnitRequest,
) -> Result<OrgUnitDto, AppError> {
    handlers::actualizar_org_unit(&state, window.label(), &id, request).await
}

#[tauri::command]
pub async fn obtener_org_unit(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<OrgUnitDto, AppError> {
    handlers::obtener_org_unit(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn listar_org_units(
    window: Window,
    state: State<'_, AppState>,
    parent_id: Option<String>,
) -> Result<Vec<OrgUnitDto>, AppError> {
    handlers::listar_org_units(&state, window.label(), parent_id).await
}

#[tauri::command]
pub async fn eliminar_org_unit(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    handlers::eliminar_org_unit(&state, window.label(), &id).await
}
