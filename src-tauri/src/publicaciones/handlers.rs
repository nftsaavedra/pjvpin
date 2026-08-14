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

/// Lista las publicaciones Software (D5: productos consolidados) asociadas
/// a un proyecto. Reemplaza `get_productos_proyecto` en el frontend de
/// recursos del proyecto.
pub async fn get_software_by_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    repository::get_software_by_proyecto(state.mongo_db()?, id_proyecto).await
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
    repository::delete(state.mongo_db()?, id).await?;
    // Cascade: limpiar pivote M:N de autores de la publicacion.
    crate::publicaciones::autores::repository::delete_for_publicacion(
        state.mongo_db()?,
        id,
    )
    .await?;
    Ok(())
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

// --- Pivot M:N CONCYTEC/PeruCRIS (N3-B) ---

/// Vincula un autor (persona) a una publicacion con orden y flag de
/// autor correspondiente. Opcionalmente registra la org_unit de afiliacion.
pub async fn vincular_autor_publicacion(
    state: &AppState,
    window_label: &str,
    id_publicacion: String,
    id_persona: String,
    id_org_unit_afiliacion: Option<String>,
    orden: i32,
    es_autor_correspondiente: bool,
) -> Result<(), AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "publicaciones_cientificas", &id_publicacion).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "personas", &id_persona).await?;
    if let Some(ref org) = id_org_unit_afiliacion {
        crate::shared::refs::ensure_exists(state.mongo_db()?, "org_units", org).await?;
    }
    let id = uuid::Uuid::new_v4().to_string();
    let pa = crate::publicaciones::autores::PublicacionAutor::new(
        id,
        id_publicacion,
        id_persona,
        id_org_unit_afiliacion,
        orden,
        es_autor_correspondiente,
    )?;
    crate::publicaciones::autores::repository::insert(state.mongo_db()?, &pa).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "publicacion.vincular_autor", "publicacion_autor", &pa.id, "insert".to_string(),
    );
    Ok(())
}

pub async fn desvincular_autor_publicacion(
    state: &AppState,
    window_label: &str,
    id_pivot: String,
) -> Result<(), AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    crate::publicaciones::autores::repository::delete(state.mongo_db()?, &id_pivot).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "publicacion.desvincular_autor", "publicacion_autor", &id_pivot, "delete".to_string(),
    );
    Ok(())
}

pub async fn listar_autores_publicacion(
    state: &AppState,
    _window_label: &str,
    id_publicacion: String,
) -> Result<Vec<crate::publicaciones::autores::PublicacionAutor>, AppError> {
    rbac::require_permission(
        state,
        _window_label,
        rbac::AppPermission::InvestigadoresView,
    )
    .await?;
    crate::publicaciones::autores::repository::list_by_publicacion(
        state.mongo_db()?,
        &id_publicacion,
    )
    .await
}
