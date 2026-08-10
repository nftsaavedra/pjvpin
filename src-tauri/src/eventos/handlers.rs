use crate::eventos::dto::{CreateEventoRequest, UpdateEventoRequest};
use crate::eventos::models::EventoAcademico;
use crate::eventos::repository;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_evento(
    state: &AppState,
    window_label: &str,
    request: CreateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    repository::create(state.mongo_db()?, request).await
}

pub async fn get_all_eventos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_all(state.mongo_db()?).await
}

pub async fn get_evento_by_id(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_by_id(state.mongo_db()?, id).await
}

pub async fn get_eventos_by_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<EventoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_by_investigador(state.mongo_db()?, id_investigador).await
}

pub async fn actualizar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
    request: UpdateEventoRequest,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    repository::update(state.mongo_db()?, id, request).await
}

pub async fn eliminar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<(), AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    repository::delete(state.mongo_db()?, id).await
}

pub async fn reactivar_evento(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<EventoAcademico, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    repository::reactivate(state.mongo_db()?, id).await
}
