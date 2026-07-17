use crate::shared::defaults;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::dto::{
    AuthStatusDto, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest,
};
use crate::usuarios::models::Usuario;
use crate::usuarios::service as usuario_service;

pub async fn crear_usuario(
    state: &AppState,
    window_label: &str,
    request: CreateUsuarioRequest,
) -> Result<Usuario, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::UsuariosManage).await?;
    let usuario = usuario_service::create(state, &actor.id_usuario, request).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.create",
        &usuario,
        format!("rol={}", usuario.rol),
    );
    Ok(usuario)
}

pub async fn get_auth_status(state: &AppState) -> Result<AuthStatusDto, AppError> {
    usuario_service::get_auth_status(state).await
}

pub async fn registrar_primer_usuario(
    state: &AppState,
    window_label: &str,
    request: BootstrapUsuarioRequest,
) -> Result<Usuario, AppError> {
    let db = resolve_bootstrap_db(
        state,
        request.mongodb_uri.as_deref(),
        request.mongodb_db.as_deref(),
    )
    .await?;
    let usuario = super::repository::bootstrap_admin(&db, request).await?;

    state
        .set_current_session(window_label, usuario.id_usuario.clone())
        .await;
    Ok(usuario)
}

async fn resolve_bootstrap_db(
    state: &AppState,
    mongodb_uri: Option<&str>,
    mongodb_db: Option<&str>,
) -> Result<mongodb::Database, AppError> {
    if let Ok(db) = state.mongo_db() {
        return Ok(db.clone());
    }

    let uri = mongodb_uri.ok_or_else(|| {
        AppError::ConfigurationError(
            "MongoDB no esta inicializado. Proporcione la URI en el asistente de configuracion."
                .to_string(),
        )
    })?;
    if uri.trim().is_empty() {
        return Err(AppError::ConfigurationError(
            "La URI de MongoDB no puede estar vacia.".to_string(),
        ));
    }

    let mut client_options = mongodb::options::ClientOptions::parse(uri).await?;
    client_options.max_pool_size = Some(defaults::DEFAULT_MONGODB_MAX_POOL_SIZE);
    client_options.min_pool_size = Some(defaults::DEFAULT_MONGODB_MIN_POOL_SIZE);
    client_options.app_name = Some("PJVPI".to_string());
    let client = mongodb::Client::with_options(client_options)?;
    let db_name = mongodb_db
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(defaults::DEFAULT_MONGODB_DB);
    Ok(client.database(db_name))
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

    state.cleanup_sessions().await;

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
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::UsuariosManage).await?;
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
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::UsuariosManage).await?;
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
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::UsuariosManage).await?;
    let usuario = usuario_service::reactivate(state, &actor.id_usuario, id_usuario).await?;

    crate::shared::audit::write_user_audit(
        &actor,
        "usuario.reactivate",
        &usuario,
        "activo=1".to_string(),
    );
    Ok(usuario)
}
