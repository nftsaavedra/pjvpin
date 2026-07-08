use crate::publicaciones::models::{
    CreatePublicacionRequest, PublicacionCientifica, UpdatePublicacionRequest,
};
use crate::publicaciones::service as publicacion_service;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_publicacion(
    state: &AppState,
    window_label: &str,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    publicacion_service::create(state, request).await
}

pub async fn get_all_publicaciones(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    publicacion_service::get_all(state).await
}

pub async fn get_publicacion_by_id(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<PublicacionCientifica, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    publicacion_service::get_by_id(state, id).await
}

pub async fn get_publicaciones_by_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    publicacion_service::get_by_investigador(state, id_investigador).await
}

pub async fn get_publicaciones_by_anio(
    state: &AppState,
    window_label: &str,
    anio: i32,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    publicacion_service::get_by_anio(state, anio).await
}

pub async fn actualizar_publicacion(
    state: &AppState,
    window_label: &str,
    id: &str,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    publicacion_service::update(state, id, request).await
}

pub async fn eliminar_publicacion(
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
    publicacion_service::delete(state, id).await
}

pub async fn reactivar_publicacion(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<PublicacionCientifica, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    publicacion_service::reactivate(state, id).await
}
