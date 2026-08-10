use crate::grados::dto::{CreateGradoRequest, EliminarGradoResultadoDto};
use crate::grados::models::GradoAcademico;
use crate::grados::repository;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_all_grados(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<GradoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosRead).await?;
    repository::get_all_grados(state.mongo_db()?).await
}

pub async fn get_all_grados_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<GradoAcademico>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosRead).await?;
    repository::get_all_grados_paginated(state.mongo_db()?, page, limit).await
}

pub async fn crear_grado(
    state: &AppState,
    window_label: &str,
    request: CreateGradoRequest,
) -> Result<GradoAcademico, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let grado = repository::create_grado(state.mongo_db()?, request).await?;
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
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let grado = repository::update_grado(state.mongo_db()?, id_grado, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grado.update",
        "grado",
        id_grado,
        format!("nombre: {}", grado.nombre),
    );
    Ok(grado)
}

pub async fn eliminar_grado(
    state: &AppState,
    window_label: &str,
    id_grado: &str,
) -> Result<EliminarGradoResultadoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let result = repository::delete_grado(state.mongo_db()?, id_grado).await?;
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
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    let grado = repository::reactivar_grado(state.mongo_db()?, id_grado).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grado.reactivate",
        "grado",
        id_grado,
        "activo=1".to_string(),
    );
    Ok(grado)
}
