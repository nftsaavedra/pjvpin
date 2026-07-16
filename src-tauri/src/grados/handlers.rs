use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto};
use crate::grados::models::GradoAcademico;
use crate::grados::service as grado_service;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_all_grados(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<GradoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosRead).await?;
    grado_service::get_all(state).await
}

pub async fn get_all_grados_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<GradoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosRead).await?;
    grado_service::get_all_paginated(state, page, limit).await
}

pub async fn crear_grado(
    state: &AppState,
    window_label: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let grado = grado_service::create(state, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grado.create",
        "grado",
        &grado.id_grado,
        format!("nombre: {}", grado.nombre),
    );
    Ok(grado)
}

pub async fn actualizar_grado(
    state: &AppState,
    window_label: &str,
    id_grado: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    grado_service::update(state, id_grado, request).await
}

pub async fn eliminar_grado(
    state: &AppState,
    window_label: &str,
    id_grado: &str,
) -> Result<EliminarGradoResultadoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let result = grado_service::delete(state, id_grado).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grado.delete",
        "grado",
        id_grado,
        result.accion.clone(),
    );
    Ok(result)
}

pub async fn reactivar_grado(
    state: &AppState,
    window_label: &str,
    id_grado: &str,
) -> Result<GradoAcademico, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    grado_service::reactivate(state, id_grado).await
}
