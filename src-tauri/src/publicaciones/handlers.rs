use crate::publicaciones::dto::{CreatePublicacionRequest, UpdatePublicacionRequest};
use crate::publicaciones::models::PublicacionCientifica;
use crate::publicaciones::repository;
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
    repository::create(state.mongo_db()?, request).await
}

pub async fn get_all_publicaciones(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_all(state.mongo_db()?).await
}

pub async fn get_publicacion_by_id(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<PublicacionCientifica, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_by_id(state.mongo_db()?, id).await
}

pub async fn get_publicaciones_by_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_by_investigador(state.mongo_db()?, id_investigador).await
}

pub async fn get_publicaciones_by_anio(
    state: &AppState,
    window_label: &str,
    anio: i32,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_by_anio(state.mongo_db()?, anio).await
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
    repository::update(state.mongo_db()?, id, request).await
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
    repository::delete(state.mongo_db()?, id).await
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
    repository::reactivate(state.mongo_db()?, id).await
}
