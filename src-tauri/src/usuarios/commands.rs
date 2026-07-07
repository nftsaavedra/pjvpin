use tauri::{State, Window};

use super::handlers;
use crate::investigadores::models::ReniecDniLookupResult;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::models::{
    AuthStatus, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, Usuario,
};

#[tauri::command]
pub async fn crear_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: CreateUsuarioRequest,
) -> Result<Usuario, AppError> {
    handlers::crear_usuario(&state, window.label(), request).await
}

#[tauri::command]
pub async fn consultar_dni_para_usuario(
    window: Window,
    state: State<'_, AppState>,
    numero: String,
) -> Result<ReniecDniLookupResult, AppError> {
    rbac::require_permission(&state, window.label(), rbac::AppPermission::UsuariosManage).await?;
    let config = state.reniec_config();
    crate::shared::external::reniec_client::consultar_dni(config, &numero).await
}

#[tauri::command]
pub async fn get_auth_status(state: State<'_, AppState>) -> Result<AuthStatus, AppError> {
    handlers::get_auth_status(&state).await
}

#[tauri::command]
pub async fn registrar_primer_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: BootstrapUsuarioRequest,
) -> Result<Usuario, AppError> {
    handlers::registrar_primer_usuario(&state, window.label(), request).await
}

#[tauri::command]
pub async fn login_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: LoginUsuarioRequest,
) -> Result<Usuario, AppError> {
    handlers::login_usuario(&state, window.label(), request).await
}

#[tauri::command]
pub async fn get_current_session(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Option<Usuario>, AppError> {
    handlers::get_current_session(&state, window.label()).await
}

#[tauri::command]
pub async fn logout_usuario(window: Window, state: State<'_, AppState>) -> Result<(), AppError> {
    handlers::logout_usuario(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_usuarios(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<Usuario>, AppError> {
    handlers::get_all_usuarios(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_usuarios_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<Usuario>, AppError> {
    handlers::get_all_usuarios_paginated(&state, window.label(), page, limit).await
}

#[tauri::command]
pub async fn actualizar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
    request: UpdateUsuarioRequest,
) -> Result<Usuario, AppError> {
    handlers::actualizar_usuario(&state, window.label(), &id_usuario, request).await
}

#[tauri::command]
pub async fn desactivar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
) -> Result<Usuario, AppError> {
    handlers::desactivar_usuario(&state, window.label(), &id_usuario).await
}

#[tauri::command]
pub async fn reactivar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
) -> Result<Usuario, AppError> {
    handlers::reactivar_usuario(&state, window.label(), &id_usuario).await
}
