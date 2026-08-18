//! Handlers de la feature `ocde` (pivot polimorfico).
//!
//! Validacion FK contra `catalogos` (esquema `ocde_ford`) en `assign`.
//! `listar` no exige manage: cualquier viewer puede ver los codigos
//! asociados a una entidad.

use crate::ocde::models::EntityOcdeFieldDoc;
use crate::ocde::repository;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn asignar_campo_ocde(
    state: &AppState,
    window_label: &str,
    entity_type: &str,
    entity_id: &str,
    ocde_codigo: &str,
) -> Result<EntityOcdeFieldDoc, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::OcdeAssignManage)
            .await?;
    let m = repository::assign_campo_ocde(state.mongo_db()?, entity_type, entity_id, ocde_codigo)
        .await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "ocde.assign",
        &format!("{entity_type}/{entity_id}"),
        &m.id,
        format!("ocde_codigo: {ocde_codigo}"),
    );
    Ok(EntityOcdeFieldDoc::from(m))
}

pub async fn quitar_campo_ocde(
    state: &AppState,
    window_label: &str,
    entity_type: &str,
    entity_id: &str,
    ocde_codigo: &str,
) -> Result<bool, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::OcdeAssignManage)
            .await?;
    let removed =
        repository::quitar_campo_ocde(state.mongo_db()?, entity_type, entity_id, ocde_codigo)
            .await?;
    if removed {
        crate::shared::audit::write_generic_audit(
            &actor,
            "ocde.unassign",
            &format!("{entity_type}/{entity_id}"),
            ocde_codigo,
            "eliminacion".to_string(),
        );
    }
    Ok(removed)
}

pub async fn listar_campos_ocde(
    state: &AppState,
    window_label: &str,
    entity_type: &str,
    entity_id: &str,
) -> Result<Vec<EntityOcdeFieldDoc>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::VocabulariosRead).await?;
    let items = repository::listar_campos_ocde(state.mongo_db()?, entity_type, entity_id).await?;
    Ok(items.into_iter().map(EntityOcdeFieldDoc::from).collect())
}
