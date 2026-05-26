use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::models::{
    AuthStatus, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, Usuario,
};
use crate::usuarios::service as usuario_service;

pub async fn crear_usuario(
    state: &AppState,
    window_label: &str,
    request: CreateUsuarioRequest,
) -> Result<Usuario, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let usuario = usuario_service::create(state, &actor.id_usuario, request).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.create",
        &usuario,
        format!("rol={}", usuario.rol),
    );
    Ok(usuario)
}

pub async fn get_auth_status(state: &AppState) -> Result<AuthStatus, AppError> {
    usuario_service::get_auth_status(state).await
}

pub async fn registrar_primer_usuario(
    state: &AppState,
    window_label: &str,
    request: BootstrapUsuarioRequest,
) -> Result<Usuario, AppError> {
    let usuario = usuario_service::bootstrap_admin(state, request).await?;

    state
        .set_current_session(window_label, usuario.id_usuario.clone())
        .await;
    Ok(usuario)
}

pub async fn login_usuario(
    state: &AppState,
    window_label: &str,
    request: LoginUsuarioRequest,
) -> Result<Usuario, AppError> {
    let username = request.username.clone();
    state.rate_limiter.check_and_record(&username).await?;

    let usuario = match usuario_service::login(state, request).await {
        Ok(usuario) => {
            state.rate_limiter.clear(&username).await;
            usuario
        }
        Err(error) => {
            tracing::warn!(
                "Intento de login fallido para usuario '{}': {}",
                username,
                error
            );
            return Err(error);
        }
    };

    state
        .set_current_session(window_label, usuario.id_usuario.clone())
        .await;
    Ok(usuario)
}

pub async fn get_current_session(
    state: &AppState,
    window_label: &str,
) -> Result<Option<Usuario>, AppError> {
    let Some(actor_user_id) = state.get_current_session_user_id(window_label).await else {
        return Ok(None);
    };

    let actor = match rbac::get_user_by_id(state, &actor_user_id).await {
        Ok(actor) if actor.activo == 1 => actor,
        Ok(_) | Err(AppError::NotFound(_)) => {
            state.clear_current_session(window_label).await;
            return Ok(None);
        }
        Err(error) => return Err(error),
    };

    state.touch_current_session(window_label).await;
    Ok(Some(actor))
}

pub async fn logout_usuario(state: &AppState, window_label: &str) -> Result<(), AppError> {
    state.clear_current_session(window_label).await;
    Ok(())
}

pub async fn get_all_usuarios(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<Usuario>, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    usuario_service::get_all(state, &actor.id_usuario).await
}

pub async fn get_all_usuarios_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Usuario>, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    usuario_service::get_all_paginated(state, &actor.id_usuario, page, limit).await
}

pub async fn actualizar_usuario(
    state: &AppState,
    window_label: &str,
    id_usuario: &str,
    request: UpdateUsuarioRequest,
) -> Result<Usuario, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let previous_user = rbac::get_user_by_id(state, id_usuario).await?;
    let usuario = usuario_service::update(state, &actor.id_usuario, id_usuario, request).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.update",
        &usuario,
        format!(
            "username:{}->{}; rol:{}->{}; activo:{}",
            previous_user.username,
            usuario.username,
            previous_user.rol,
            usuario.rol,
            usuario.activo,
        ),
    );
    Ok(usuario)
}

pub async fn desactivar_usuario(
    state: &AppState,
    window_label: &str,
    id_usuario: &str,
) -> Result<Usuario, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let usuario = usuario_service::deactivate(state, &actor.id_usuario, id_usuario).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.deactivate",
        &usuario,
        "activo=0".to_string(),
    );
    Ok(usuario)
}

pub async fn reactivar_usuario(
    state: &AppState,
    window_label: &str,
    id_usuario: &str,
) -> Result<Usuario, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let usuario = usuario_service::reactivate(state, &actor.id_usuario, id_usuario).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.reactivate",
        &usuario,
        "activo=1".to_string(),
    );
    Ok(usuario)
}
