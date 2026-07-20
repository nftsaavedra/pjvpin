use crate::proyectos::dto::{
    CreateProyectoConParticipantesRequest, EliminarProyectoResultadoDto, ProyectoDetalleDto,
    ProyectoDto, UpdateProyectoConParticipantesRequest,
};
use crate::proyectos::models::Proyecto;
use crate::proyectos::repository;
use crate::proyectos::repository_queries;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_proyecto_con_participantes(
    state: &AppState,
    window_label: &str,
    request: CreateProyectoConParticipantesRequest,
) -> Result<ProyectoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto: Proyecto =
        repository::create_proyecto_con_participantes(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.create",
        "proyecto",
        &proyecto.id_proyecto,
        proyecto.titulo_proyecto.clone(),
    );
    Ok(ProyectoDto::from(proyecto))
}

pub async fn update_proyecto_con_participantes(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<ProyectoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto: Proyecto =
        repository::update_proyecto_con_participantes(state.mongo_db()?, id_proyecto, request)
            .await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.update",
        "proyecto",
        id_proyecto,
        proyecto.titulo_proyecto.clone(),
    );
    Ok(ProyectoDto::from(proyecto))
}

pub async fn buscar_proyectos_por_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<ProyectoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    let proyectos: Vec<Proyecto> =
        repository_queries::buscar_proyectos_por_investigador(state.mongo_db()?, id_investigador)
            .await?;
    Ok(proyectos.into_iter().map(ProyectoDto::from).collect())
}

pub async fn get_all_proyectos_detalle(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ProyectoDetalleDto>, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    if actor.rol.trim() == "responsable_proyecto" {
        let investigador_id = actor.investigador_id.as_ref().ok_or_else(|| {
            AppError::InternalError(
                "Usuario responsable_proyecto no tiene un investigador asociado.".to_string(),
            )
        })?;
        repository_queries::get_all_proyectos_detalle(state.mongo_db()?, Some(investigador_id))
            .await
    } else {
        repository_queries::get_all_proyectos_detalle(state.mongo_db()?, None).await
    }
}

pub async fn get_all_proyectos_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<ProyectoDto>, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosView).await?;
    let responsable_id = if actor.rol.trim() == "responsable_proyecto" {
        let investigador_id = actor.investigador_id.as_ref().ok_or_else(|| {
            AppError::InternalError(
                "Usuario responsable_proyecto no tiene un investigador asociado.".to_string(),
            )
        })?;
        Some(investigador_id.as_str())
    } else {
        None
    };
    let result: PaginatedResult<Proyecto> =
        repository::get_all_proyectos_paginated(state.mongo_db()?, page, limit, responsable_id)
            .await?;
    Ok(PaginatedResult {
        items: result.items.into_iter().map(ProyectoDto::from).collect(),
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
    })
}

pub async fn eliminar_relacion_proyecto_investigador(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
    id_investigador: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    repository::eliminar_relacion_proyecto_investigador(
        state.mongo_db()?,
        id_proyecto,
        id_investigador,
    )
    .await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.delete_relation",
        "proyecto",
        id_proyecto,
        format!("investigador: {}", id_investigador),
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
    repository::eliminar_relaciones_proyecto(state.mongo_db()?, id_proyecto).await?;
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
) -> Result<EliminarProyectoResultadoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let db = state.mongo_db()?;
    let result = repository::eliminar_proyecto(db, id_proyecto).await?;
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
) -> Result<ProyectoDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    let proyecto: Proyecto = repository::reactivar_proyecto(state.mongo_db()?, id_proyecto).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "proyecto.reactivate",
        "proyecto",
        id_proyecto,
        "activo=1".to_string(),
    );
    Ok(ProyectoDto::from(proyecto))
}
