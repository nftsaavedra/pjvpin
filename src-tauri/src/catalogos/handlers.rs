use crate::catalogos::models::{CatalogoItem, CreateCatalogoRequest, EliminarCatalogoResultado};
use crate::catalogos::service as catalogo_service;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_catalogos(
    state: &AppState,
    window_label: &str,
    tipo: &str,
) -> Result<Vec<CatalogoItem>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosRead).await?;
    catalogo_service::get_by_tipo(state, tipo).await
}

pub async fn get_all_catalogos_admin(
    state: &AppState,
    window_label: &str,
    tipo: &str,
) -> Result<Vec<CatalogoItem>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GradosManage).await?;
    catalogo_service::get_all_by_tipo(state, tipo).await
}

pub async fn crear_catalogo(
    state: &AppState,
    window_label: &str,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let item = catalogo_service::create(state, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "catalogo.create",
        "catalogo",
        &item.id_catalogo,
        format!("tipo: {}, codigo: {}", item.tipo, item.codigo),
    );
    Ok(item)
}

pub async fn actualizar_catalogo(
    state: &AppState,
    window_label: &str,
    id: &str,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let item = catalogo_service::update(state, id, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "catalogo.update",
        "catalogo",
        id,
        format!("codigo: {}", item.codigo),
    );
    Ok(item)
}

pub async fn eliminar_catalogo(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<EliminarCatalogoResultado, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let result = catalogo_service::delete(state, id).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "catalogo.delete",
        "catalogo",
        id,
        result.accion.clone(),
    );
    Ok(result)
}

pub async fn reactivar_catalogo(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<CatalogoItem, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let item = catalogo_service::reactivate(state, id).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "catalogo.reactivate",
        "catalogo",
        id,
        item.codigo.clone(),
    );
    Ok(item)
}
