use crate::recursos::dto::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
    UpdateEquipamientoRequest, UpdateFinanciamientoRequest, UpdatePatenteRequest,
};
use crate::recursos::models::{Equipamiento, Financiamiento, Patente};
use crate::recursos::repository;
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
            let investigador_id = actor.investigador_id.as_ref().ok_or_else(|| {
                AppError::InternalError(
                    "Usuario responsable_proyecto no tiene un investigador asociado.".to_string(),
                )
            })?;
            let db = state.mongo_db()?;
            let es_responsable =
                crate::proyectos::repository::es_responsable_del_proyecto(db, investigador_id, pid)
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
    let patente = repository::create_patente(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "patente.create",
        "patente",
        &patente.id_patente,
        patente.titulo.clone(),
    );
    Ok(patente)
}

pub async fn get_patentes_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Patente>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    repository::get_patentes_by_proyecto(state.mongo_db()?, proyecto_id).await
}

pub async fn actualizar_patente(
    state: &AppState,
    window_label: &str,
    id_patente: &str,
    request: UpdatePatenteRequest,
) -> Result<Patente, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = repository::get_patente_by_id(state.mongo_db()?, id_patente)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    let patente = repository::update_patente(state.mongo_db()?, id_patente, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "patente.update",
        "patente",
        id_patente,
        patente.titulo.clone(),
    );
    Ok(patente)
}

pub async fn eliminar_patente(
    state: &AppState,
    window_label: &str,
    id_patente: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    repository::delete_patente(state.mongo_db()?, id_patente).await?;
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
    let patente = repository::reactivate_patente(state.mongo_db()?, id_patente).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "patente.reactivate",
        "patente",
        id_patente,
        "activo=1".to_string(),
    );
    Ok(patente)
}

pub async fn crear_equipamiento(
    state: &AppState,
    window_label: &str,
    request: CreateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    require_recursos_manage_or_responsable(state, &actor, request.proyecto_id.as_deref()).await?;
    let equipamiento = repository::create_equipamiento(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "equipamiento.create",
        "equipamiento",
        &equipamiento.id_equipamiento,
        equipamiento.nombre.clone(),
    );
    Ok(equipamiento)
}

pub async fn get_equipamientos_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Equipamiento>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    repository::get_equipamientos_by_proyecto(state.mongo_db()?, proyecto_id).await
}

pub async fn actualizar_equipamiento(
    state: &AppState,
    window_label: &str,
    id_equipamiento: &str,
    request: UpdateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = repository::get_equipamiento_by_id(state.mongo_db()?, id_equipamiento)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    let equipamiento =
        repository::update_equipamiento(state.mongo_db()?, id_equipamiento, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "equipamiento.update",
        "equipamiento",
        id_equipamiento,
        equipamiento.nombre.clone(),
    );
    Ok(equipamiento)
}

pub async fn eliminar_equipamiento(
    state: &AppState,
    window_label: &str,
    id_equipamiento: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    repository::delete_equipamiento(state.mongo_db()?, id_equipamiento).await?;
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
    let equipamiento =
        repository::reactivate_equipamiento(state.mongo_db()?, id_equipamiento).await?;
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
    let financiamiento = repository::create_financiamiento(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.create",
        "financiamiento",
        &financiamiento.id_financiamiento,
        financiamiento.entidad_financiadora.clone(),
    );
    Ok(financiamiento)
}

pub async fn get_financiamientos_proyecto(
    state: &AppState,
    window_label: &str,
    proyecto_id: &str,
) -> Result<Vec<Financiamiento>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    repository::get_financiamientos_by_proyecto(state.mongo_db()?, proyecto_id).await
}

pub async fn actualizar_financiamiento(
    state: &AppState,
    window_label: &str,
    id_financiamiento: &str,
    request: UpdateFinanciamientoRequest,
) -> Result<Financiamiento, AppError> {
    let actor = rbac::get_session_actor_user(state, window_label).await?;
    let proyecto_id = repository::get_financiamiento_by_id(state.mongo_db()?, id_financiamiento)
        .await?
        .proyecto_id;
    require_recursos_manage_or_responsable(state, &actor, proyecto_id.as_deref()).await?;
    let financiamiento =
        repository::update_financiamiento(state.mongo_db()?, id_financiamiento, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.update",
        "financiamiento",
        id_financiamiento,
        financiamiento.entidad_financiadora.clone(),
    );
    Ok(financiamiento)
}

pub async fn eliminar_financiamiento(
    state: &AppState,
    window_label: &str,
    id_financiamiento: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    repository::delete_financiamiento(state.mongo_db()?, id_financiamiento).await?;
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
        repository::reactivate_financiamiento(state.mongo_db()?, id_financiamiento).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.reactivate",
        "financiamiento",
        id_financiamiento,
        "activo=1".to_string(),
    );
    Ok(financiamiento)
}
