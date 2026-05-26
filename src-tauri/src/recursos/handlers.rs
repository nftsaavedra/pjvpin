use crate::recursos::models::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
    CreateProductoRequest, Equipamiento, Financiamiento, Patente, Producto,
    UpdateEquipamientoRequest, UpdateFinanciamientoRequest, UpdatePatenteRequest,
    UpdateProductoRequest,
};
use crate::recursos::service as recurso_service;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::models::Usuario;

async fn require_recursos_manage_or_responsable(
    state: &AppState,
    actor: &Usuario,
    proyecto_id: Option<&str>,
) -> Result<(), AppError> {
    if rbac::role_has_permission(&actor.rol, &rbac::AppPermission::RecursosManage) {
        return Ok(());
    }
    if actor.rol.trim() == "responsable_proyecto" {
        if let Some(pid) = proyecto_id {
            let docente_id = actor.docente_id.as_ref().ok_or_else(|| {
                AppError::InternalError(
                    "Usuario responsable_proyecto no tiene un docente asociado.".to_string(),
                )
            })?;
            let db = state.mongo_db()?;
            let es_responsable =
                crate::proyectos::repository::es_responsable_del_proyecto(db, docente_id, pid)
                    .await?;
            if es_responsable {
                return Ok(());
            }
            return Err(AppError::InternalError(
                "No tiene acceso a este proyecto.".to_string(),
            ));
        }
        return Ok(());
    }
    Err(AppError::InternalError(
        "No tiene permisos para ejecutar esta operacion.".to_string(),
    ))
}

// ── Patentes ──────────────────────────────────────────────────────────────────

pub async fn crear_patente(
    state: &AppState,
    window_label: &str,
    request: CreatePatenteRequest,
) -> Result<Patente, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    require_recursos_manage_or_responsable(state, &actor, request.proyecto_id.as_deref()).await?;
    recurso_service::create_patente(state, request).await
}

pub async fn get_patentes_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Patente>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    recurso_service::get_patentes_by_proyecto(state, proyecto_id).await
}

pub async fn actualizar_patente(
    state: &AppState,
    window_label: &str,
    id_patente: &str,
    request: UpdatePatenteRequest,
) -> Result<Patente, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = recurso_service::get_patente_by_id(state, id_patente)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    recurso_service::update_patente(state, id_patente, request).await
}

pub async fn eliminar_patente(
    state: &AppState,
    window_label: &str,
    id_patente: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    recurso_service::delete_patente(state, id_patente).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "patente.delete",
        "patente",
        id_patente,
        "soft-delete".to_string(),
    );
    Ok(())
}

pub async fn reactivar_patente(
    state: &AppState,
    window_label: &str,
    id_patente: &str,
) -> Result<Patente, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    let patente = recurso_service::reactivate_patente(state, id_patente).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "patente.reactivate",
        "patente",
        id_patente,
        "activo=1".to_string(),
    );
    Ok(patente)
}

// ── Productos ─────────────────────────────────────────────────────────────────

pub async fn crear_producto(
    state: &AppState,
    window_label: &str,
    request: CreateProductoRequest,
) -> Result<Producto, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    require_recursos_manage_or_responsable(state, &actor, request.proyecto_id.as_deref()).await?;
    recurso_service::create_producto(state, request).await
}

pub async fn get_productos_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Producto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    recurso_service::get_productos_by_proyecto(state, proyecto_id).await
}

pub async fn actualizar_producto(
    state: &AppState,
    window_label: &str,
    id_producto: &str,
    request: UpdateProductoRequest,
) -> Result<Producto, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = recurso_service::get_producto_by_id(state, id_producto)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    recurso_service::update_producto(state, id_producto, request).await
}

pub async fn eliminar_producto(
    state: &AppState,
    window_label: &str,
    id_producto: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    recurso_service::delete_producto(state, id_producto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "producto.delete",
        "producto",
        id_producto,
        "soft-delete".to_string(),
    );
    Ok(())
}

pub async fn reactivar_producto(
    state: &AppState,
    window_label: &str,
    id_producto: &str,
) -> Result<Producto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    let producto = recurso_service::reactivate_producto(state, id_producto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "producto.reactivate",
        "producto",
        id_producto,
        "activo=1".to_string(),
    );
    Ok(producto)
}

// ── Equipamientos ─────────────────────────────────────────────────────────────

pub async fn crear_equipamiento(
    state: &AppState,
    window_label: &str,
    request: CreateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    require_recursos_manage_or_responsable(state, &actor, request.proyecto_id.as_deref()).await?;
    recurso_service::create_equipamiento(state, request).await
}

pub async fn get_equipamientos_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Equipamiento>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    recurso_service::get_equipamientos_by_proyecto(state, proyecto_id).await
}

pub async fn actualizar_equipamiento(
    state: &AppState,
    window_label: &str,
    id_equipamiento: &str,
    request: UpdateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = recurso_service::get_equipamiento_by_id(state, id_equipamiento)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    recurso_service::update_equipamiento(state, id_equipamiento, request).await
}

pub async fn eliminar_equipamiento(
    state: &AppState,
    window_label: &str,
    id_equipamiento: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    recurso_service::delete_equipamiento(state, id_equipamiento).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "equipamiento.delete",
        "equipamiento",
        id_equipamiento,
        "soft-delete".to_string(),
    );
    Ok(())
}

pub async fn reactivar_equipamiento(
    state: &AppState,
    window_label: &str,
    id_equipamiento: &str,
) -> Result<Equipamiento, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    let equipamiento = recurso_service::reactivate_equipamiento(state, id_equipamiento).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "equipamiento.reactivate",
        "equipamiento",
        id_equipamiento,
        "activo=1".to_string(),
    );
    Ok(equipamiento)
}

// ── Financiamientos ───────────────────────────────────────────────────────────

pub async fn crear_financiamiento(
    state: &AppState,
    window_label: &str,
    request: CreateFinanciamientoRequest,
) -> Result<Financiamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    require_recursos_manage_or_responsable(state, &actor, request.proyecto_id.as_deref()).await?;
    recurso_service::create_financiamiento(state, request).await
}

pub async fn get_financiamientos_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Financiamiento>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    recurso_service::get_financiamientos_by_proyecto(state, proyecto_id).await
}

pub async fn actualizar_financiamiento(
    state: &AppState,
    window_label: &str,
    id_financiamiento: &str,
    request: UpdateFinanciamientoRequest,
) -> Result<Financiamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = recurso_service::get_financiamiento_by_id(state, id_financiamiento)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    recurso_service::update_financiamiento(state, id_financiamiento, request).await
}

pub async fn eliminar_financiamiento(
    state: &AppState,
    window_label: &str,
    id_financiamiento: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    recurso_service::delete_financiamiento(state, id_financiamiento).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.delete",
        "financiamiento",
        id_financiamiento,
        "soft-delete".to_string(),
    );
    Ok(())
}

pub async fn reactivar_financiamiento(
    state: &AppState,
    window_label: &str,
    id_financiamiento: &str,
) -> Result<Financiamiento, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    let financiamiento =
        recurso_service::reactivate_financiamiento(state, id_financiamiento).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.reactivate",
        "financiamiento",
        id_financiamiento,
        "activo=1".to_string(),
    );
    Ok(financiamiento)
}
