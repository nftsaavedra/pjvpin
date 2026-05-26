use crate::proyectos::models::{
    CreateProyectoConParticipantesRequest, EliminarProyectoResultado, Proyecto, ProyectoDetalle,
    UpdateProyectoConParticipantesRequest,
};
use crate::proyectos::service as proyecto_service;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_proyecto_con_participantes(
    state: &AppState,
    window_label: &str,
    request: CreateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto = proyecto_service::create(state, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.create",
        "proyecto",
        &proyecto.id_proyecto,
        proyecto.titulo_proyecto.clone(),
    );
    Ok(proyecto)
}

pub async fn update_proyecto_con_participantes(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto = proyecto_service::update(state, id_proyecto, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.update",
        "proyecto",
        id_proyecto,
        proyecto.titulo_proyecto.clone(),
    );
    Ok(proyecto)
}

pub async fn buscar_proyectos_por_docente(
    state: &AppState,
    window_label: &str,
    id_docente: &str,
) -> Result<Vec<Proyecto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    proyecto_service::find_by_docente(state, id_docente).await
}

pub async fn get_all_proyectos_detalle(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ProyectoDetalle>, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    if actor.rol.trim() == "responsable_proyecto" {
        let docente_id = actor.docente_id.as_ref().ok_or_else(|| {
            AppError::InternalError(
                "Usuario responsable_proyecto no tiene un docente asociado.".to_string(),
            )
        })?;
        proyecto_service::get_all_detalle_for_responsable(state, docente_id).await
    } else {
        proyecto_service::get_all_detalle(state).await
    }
}

pub async fn get_all_proyectos_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Proyecto>, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    let responsable_id = if actor.rol.trim() == "responsable_proyecto" {
        let docente_id = actor.docente_id.as_ref().ok_or_else(|| {
            AppError::InternalError(
                "Usuario responsable_proyecto no tiene un docente asociado.".to_string(),
            )
        })?;
        Some(docente_id.as_str())
    } else {
        None
    };
    proyecto_service::get_all_paginated(state, page, limit, responsable_id).await
}

pub async fn eliminar_relacion_proyecto_docente(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
    id_docente: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    proyecto_service::delete_relation(state, id_proyecto, id_docente).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.delete_relation",
        "proyecto",
        id_proyecto,
        format!("docente: {}", id_docente),
    );
    Ok(())
}

pub async fn eliminar_relaciones_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    proyecto_service::delete_relations(state, id_proyecto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.delete_relations",
        "proyecto",
        id_proyecto,
        "all".to_string(),
    );
    Ok(())
}

pub async fn eliminar_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
) -> Result<EliminarProyectoResultado, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let result = proyecto_service::delete(state, id_proyecto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.delete",
        "proyecto",
        id_proyecto,
        result.mensaje.clone(),
    );
    Ok(result)
}

pub async fn reactivar_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
) -> Result<Proyecto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto = proyecto_service::reactivate(state, id_proyecto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.reactivate",
        "proyecto",
        id_proyecto,
        "activo=1".to_string(),
    );
    Ok(proyecto)
}
