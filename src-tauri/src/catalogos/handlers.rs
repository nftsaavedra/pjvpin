use crate::catalogos::dto::{CatalogoItemDto, CreateCatalogoRequest, EliminarCatalogoResultadoDto};
use crate::catalogos::models::CatalogoItem;
use crate::catalogos::repository;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_catalogos(
    state: &AppState,
    window_label: &str,
    tipo: &str,
) -> Result<Vec<CatalogoItem>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosRead).await?;
    repository::get_catalogos_by_tipo(state.mongo_db()?, tipo).await
}

pub async fn get_all_catalogos_admin(
    state: &AppState,
    window_label: &str,
    tipo: &str,
) -> Result<Vec<CatalogoItem>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    repository::get_all_catalogos(state.mongo_db()?, tipo).await
}

pub async fn crear_catalogo(
    state: &AppState,
    window_label: &str,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let item = repository::create_catalogo(state.mongo_db()?, request).await?;
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
    let item = repository::update_catalogo(state.mongo_db()?, id, request).await?;
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
) -> Result<EliminarCatalogoResultadoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::CatalogosManage).await?;
    let result = repository::delete_catalogo(state.mongo_db()?, id).await?;
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
    let item = repository::reactivar_catalogo(state.mongo_db()?, id).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "catalogo.reactivate",
        "catalogo",
        id,
        item.codigo.clone(),
    );
    Ok(item)
}

// =====================================================================
// Vocabularios CONCYTEC (15 esquemas SKOS)
// =====================================================================

/// Lista los esquemas CONCYTEC con al menos un item activo.
pub async fn listar_vocabularios_concytec(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<String>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::VocabulariosRead).await?;
    repository::list_vocabularios(state.mongo_db()?).await
}

/// Lista los items activos de un esquema CONCYTEC, opcionalmente filtrados
/// por `padre_codigo` (SKOS broader).
pub async fn listar_vocab_items(
    state: &AppState,
    window_label: &str,
    esquema: &str,
    padre_codigo: Option<String>,
) -> Result<Vec<CatalogoItemDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::VocabulariosRead).await?;
    let items = repository::list_vocab_items_by_esquema(
        state.mongo_db()?,
        esquema,
        padre_codigo.as_deref(),
    )
    .await?;
    Ok(items.into_iter().map(Into::into).collect())
}

/// Reimporta los vocabularios CONCYTEC. Solo disponible para
/// superuser/admin (los items oficiales no son editables pero la version
/// del set se bumpea desde `shared::defaults::VOCAB_CONCYTEC_VERSION`).
pub async fn reimportar_vocabulario(
    state: &AppState,
    window_label: &str,
    esquema: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::VocabulariosManage)
            .await?;
    if esquema.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el esquema a reimportar.".to_string(),
        ));
    }
    crate::catalogos::seed_vocabularios::reseed_vocabularios_concytec(state.mongo_db()?).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "vocabulario.reimport",
        "catalogos",
        esquema,
        format!(
            "version: {}",
            crate::shared::defaults::VOCAB_CONCYTEC_VERSION
        ),
    );
    Ok(())
}
