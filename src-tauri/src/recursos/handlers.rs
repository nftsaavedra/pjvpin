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
    // Cascade: limpiar pivotes M:N y campos OCDE de la patente.
    crate::recursos::patente_inventores::repository::delete_for_patente(
        state.mongo_db()?,
        id_patente,
    )
    .await?;
    crate::recursos::patente_titulares::repository::delete_for_patente(
        state.mongo_db()?,
        id_patente,
    )
    .await?;
    crate::ocde::repository::delete_for_entity(
        state.mongo_db()?,
        crate::shared::vocab_mapper::ENTITY_TYPE_PATENT,
        id_patente,
    )
    .await?;
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
    // F3/D10: el vinculo proyecto<->financiamiento ahora vive en el pivot
    // `proyecto_financiamientos`. La creacion del financiamiento maestro ya
    // no requiere un proyecto_id en el request; el responsable check se
    // delega al pivot (ver `vincular_financiamiento_proyecto`).
    require_recursos_manage_or_responsable(state, &actor, None).await?;
    let financiamiento = repository::create_financiamiento(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.create",
        "financiamiento",
        &financiamiento.id_financiamiento,
        financiamiento.nombre.clone().unwrap_or_default(),
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
    // F3/D10: el vinculo proyecto<->financiamiento vive en el pivot. El
    // responsable check sobre el proyecto del financiamiento se delega al
    // handler del pivot (`vincular_financiamiento_proyecto`).
    require_recursos_manage_or_responsable(state, &actor, None).await?;
    let financiamiento =
        repository::update_financiamiento(state.mongo_db()?, id_financiamiento, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "financiamiento.update",
        "financiamiento",
        id_financiamiento,
        financiamiento.nombre.clone().unwrap_or_default(),
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

// --- Pivots M:N CONCYTEC/PeruCRIS (N3-A) ---

/// Vincula un inventor (persona) a una patente con un orden.
pub async fn vincular_inventor_patente(
    state: &AppState,
    window_label: &str,
    id_patente: String,
    id_persona: String,
    orden: i32,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "patentes", &id_patente).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "personas", &id_persona).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let pi = crate::recursos::patente_inventores::PatenteInventor::new(
        id, id_patente, id_persona, orden,
    )?;
    crate::recursos::patente_inventores::repository::insert(state.mongo_db()?, &pi).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "patente.vincular_inventor", "patente_inventor", &pi.id, "insert".to_string(),
    );
    Ok(())
}

pub async fn desvincular_inventor_patente(
    state: &AppState,
    window_label: &str,
    id_pivot: String,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    crate::recursos::patente_inventores::repository::delete(state.mongo_db()?, &id_pivot).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "patente.desvincular_inventor", "patente_inventor", &id_pivot, "delete".to_string(),
    );
    Ok(())
}

pub async fn listar_inventores_patente(
    state: &AppState,
    _window_label: &str,
    id_patente: String,
) -> Result<Vec<crate::recursos::patente_inventores::PatenteInventor>, AppError> {
    rbac::require_permission(state, _window_label, rbac::AppPermission::RecursosManage).await?;
    crate::recursos::patente_inventores::repository::list_by_patente(
        state.mongo_db()?,
        &id_patente,
    )
    .await
}

/// Vincula un titular (ORG_UNIT o PERSON) a una patente con orden.
/// El caller decide que variante usar pasando id_org_unit o id_persona.
pub async fn vincular_titular_patente(
    state: &AppState,
    window_label: &str,
    id_patente: String,
    holder_type: String,
    id_org_unit: Option<String>,
    id_persona: Option<String>,
    orden: i32,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "patentes", &id_patente).await?;
    if let Some(ref org) = id_org_unit {
        crate::shared::refs::ensure_exists(state.mongo_db()?, "org_units", org).await?;
    }
    if let Some(ref per) = id_persona {
        crate::shared::refs::ensure_exists(state.mongo_db()?, "personas", per).await?;
    }
    let id = uuid::Uuid::new_v4().to_string();
    let pt = crate::recursos::patente_titulares::PatenteTitular::new(
        id,
        id_patente,
        holder_type,
        id_org_unit,
        id_persona,
        orden,
    )?;
    crate::recursos::patente_titulares::repository::insert(state.mongo_db()?, &pt).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "patente.vincular_titular", "patente_titular", &pt.id, "insert".to_string(),
    );
    Ok(())
}

pub async fn desvincular_titular_patente(
    state: &AppState,
    window_label: &str,
    id_pivot: String,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::RecursosManage).await?;
    crate::recursos::patente_titulares::repository::delete(state.mongo_db()?, &id_pivot).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "patente.desvincular_titular", "patente_titular", &id_pivot, "delete".to_string(),
    );
    Ok(())
}

pub async fn listar_titulares_patente(
    state: &AppState,
    _window_label: &str,
    id_patente: String,
) -> Result<Vec<crate::recursos::patente_titulares::PatenteTitular>, AppError> {
    rbac::require_permission(state, _window_label, rbac::AppPermission::RecursosManage).await?;
    crate::recursos::patente_titulares::repository::list_by_patente(
        state.mongo_db()?,
        &id_patente,
    )
    .await
}
