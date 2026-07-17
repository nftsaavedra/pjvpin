use crate::grupos::dto::{CreateGrupoInvestigacionRequest, UpdateGrupoInvestigacionRequest};
use crate::grupos::models::GrupoInvestigacion;
use crate::grupos::service as grupo_service;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_all_grupos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<GrupoInvestigacion>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GruposView).await?;
    grupo_service::get_all(state).await
}

pub async fn create_grupo(
    state: &AppState,
    window_label: &str,
    request: CreateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GruposManage).await?;
    let grupo = grupo_service::create(state, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grupo.create",
        "grupo",
        &grupo.id_grupo,
        grupo.nombre.clone(),
    );
    Ok(grupo)
}

pub async fn get_grupo(
    state: &AppState,
    window_label: &str,
    id_grupo: &str,
) -> Result<GrupoInvestigacion, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GruposView).await?;
    grupo_service::get_by_id(state, id_grupo).await
}

pub async fn update_grupo(
    state: &AppState,
    window_label: &str,
    id_grupo: &str,
    request: UpdateGrupoInvestigacionRequest,
) -> Result<GrupoInvestigacion, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GruposManage).await?;
    grupo_service::update(state, id_grupo, request).await
}

pub async fn delete_grupo(
    state: &AppState,
    window_label: &str,
    id_grupo: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::GruposManage).await?;
    grupo_service::delete(state, id_grupo).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "grupo.delete",
        "grupo",
        id_grupo,
        String::new(),
    );
    Ok(())
}
