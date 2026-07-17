use tauri::{State, Window};

use super::handlers;
use crate::investigadores::dto::ReniecDniLookupResult;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::dto::{
    AuthStatusDto, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, UsuarioDto,
};

#[tauri::command]
pub async fn crear_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: CreateUsuarioRequest,
) -> Result<UsuarioDto, AppError> {
    let usuario = handlers::crear_usuario(&state, window.label(), request).await?;
    Ok(usuario.into())
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
pub async fn get_auth_status(state: State<'_, AppState>) -> Result<AuthStatusDto, AppError> {
    handlers::get_auth_status(&state).await
}

#[tauri::command]
pub async fn registrar_primer_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: BootstrapUsuarioRequest,
) -> Result<UsuarioDto, AppError> {
    let usuario = handlers::registrar_primer_usuario(&state, window.label(), request).await?;
    Ok(usuario.into())
}

#[tauri::command]
pub async fn login_usuario(
    window: Window,
    state: State<'_, AppState>,
    request: LoginUsuarioRequest,
) -> Result<UsuarioDto, AppError> {
    let usuario = handlers::login_usuario(&state, window.label(), request).await?;
    Ok(usuario.into())
}

#[tauri::command]
pub async fn get_current_session(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Option<UsuarioDto>, AppError> {
    let result = handlers::get_current_session(&state, window.label()).await?;
    Ok(result.map(Into::into))
}

#[tauri::command]
pub async fn logout_usuario(window: Window, state: State<'_, AppState>) -> Result<(), AppError> {
    handlers::logout_usuario(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_usuarios(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<UsuarioDto>, AppError> {
    let usuarios = handlers::get_all_usuarios(&state, window.label()).await?;
    Ok(usuarios.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_all_usuarios_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<UsuarioDto>, AppError> {
    let result = handlers::get_all_usuarios_paginated(&state, window.label(), page, limit).await?;
    Ok(crate::shared::pagination::PaginatedResult {
        items: result.items.into_iter().map(Into::into).collect(),
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
    })
}

#[tauri::command]
pub async fn actualizar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
    request: UpdateUsuarioRequest,
) -> Result<UsuarioDto, AppError> {
    let usuario =
        handlers::actualizar_usuario(&state, window.label(), &id_usuario, request).await?;
    Ok(usuario.into())
}

#[tauri::command]
pub async fn desactivar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
) -> Result<UsuarioDto, AppError> {
    let usuario = handlers::desactivar_usuario(&state, window.label(), &id_usuario).await?;
    Ok(usuario.into())
}

#[tauri::command]
pub async fn reactivar_usuario(
    window: Window,
    state: State<'_, AppState>,
    id_usuario: String,
) -> Result<UsuarioDto, AppError> {
    let usuario = handlers::reactivar_usuario(&state, window.label(), &id_usuario).await?;
    Ok(usuario.into())
}
