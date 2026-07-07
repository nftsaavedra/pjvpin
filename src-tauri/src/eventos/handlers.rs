use crate::eventos::models::{CreateEventoRequest, EventoAcademico, UpdateEventoRequest};
use crate::eventos::service as evento_service;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_evento(
    state: &AppState,
    window_label: &str,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresManage).await?;
    evento_service::create(state, request).await
}

pub async fn get_all_eventos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    evento_service::get_all(state).await
}

pub async fn get_evento_by_id(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    evento_service::get_by_id(state, id).await
}

pub async fn get_eventos_by_docente(
    state: &AppState,
    window_label: &str,
    docente_id: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    evento_service::get_by_docente(state, docente_id).await
}

pub async fn actualizar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresManage).await?;
    evento_service::update(state, id, request).await
}

pub async fn eliminar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<(), AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresManage).await?;
    evento_service::delete(state, id).await
}

pub async fn reactivar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresManage).await?;
    evento_service::reactivate(state, id).await
}
