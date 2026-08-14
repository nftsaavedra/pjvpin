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

// --- Pivots M:N CONCYTEC/PeruCRIS (N2-C) ---

/// Vincula una organizacion a un proyecto con un rol (EJECUTORA/CO_EJECUTORA/PATROCINADORA/COLABORADORA).
/// Valida FK de proyecto y org_unit, valida rol, e inserta el pivot.
pub async fn vincular_org_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: String,
    id_org_unit: String,
    rol: String,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "proyectos", &id_proyecto).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "org_units", &id_org_unit).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let po = crate::proyectos::proyecto_organizaciones::ProyectoOrganizacion::new(
        id, id_proyecto, id_org_unit, rol,
    )?;
    crate::proyectos::proyecto_organizaciones::repository::insert(state.mongo_db()?, &po).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "proyecto.vincular_org", "proyecto_organizacion", &po.id, "insert".to_string(),
    );
    Ok(())
}

/// Desvincula una organizacion de un proyecto (hard-delete del pivot por su _id).
pub async fn desvincular_org_proyecto(
    state: &AppState,
    window_label: &str,
    id_pivot: String,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    crate::proyectos::proyecto_organizaciones::repository::delete(state.mongo_db()?, &id_pivot)
        .await?;
    crate::shared::audit::write_generic_audit(
        &actor, "proyecto.desvincular_org", "proyecto_organizacion", &id_pivot, "delete".to_string(),
    );
    Ok(())
}

/// Lista las organizaciones vinculadas a un proyecto.
pub async fn listar_orgs_proyecto(
    state: &AppState,
    _window_label: &str,
    id_proyecto: String,
) -> Result<
    Vec<crate::proyectos::proyecto_organizaciones::ProyectoOrganizacion>,
    AppError,
> {
    rbac::require_permission(
        state,
        _window_label,
        rbac::AppPermission::ProyectosView,
    )
    .await?;
    crate::proyectos::proyecto_organizaciones::repository::list_by_proyecto(
        state.mongo_db()?,
        &id_proyecto,
    )
    .await
}

/// Vincula un financiamiento a un proyecto con monto y moneda.
pub async fn vincular_financiamiento_proyecto(
    state: &AppState,
    window_label: &str,
    id_proyecto: String,
    id_financiamiento: String,
    monto_asignado: Option<f64>,
    moneda: Option<String>,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "proyectos", &id_proyecto).await?;
    crate::shared::refs::ensure_exists(state.mongo_db()?, "financiamientos", &id_financiamiento)
        .await?;
    let id = uuid::Uuid::new_v4().to_string();
    let pf = crate::proyectos::proyecto_financiamientos::ProyectoFinanciamiento::new(
        id,
        id_proyecto,
        id_financiamiento,
        monto_asignado,
        moneda,
    )?;
    crate::proyectos::proyecto_financiamientos::repository::insert(state.mongo_db()?, &pf).await?;
    crate::shared::audit::write_generic_audit(
        &actor, "proyecto.vincular_fin", "proyecto_financiamiento", &pf.id, "insert".to_string(),
    );
    Ok(())
}

/// Desvincula un financiamiento de un proyecto.
pub async fn desvincular_financiamiento_proyecto(
    state: &AppState,
    window_label: &str,
    id_pivot: String,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ProyectosManage).await?;
    crate::proyectos::proyecto_financiamientos::repository::delete(state.mongo_db()?, &id_pivot)
        .await?;
    crate::shared::audit::write_generic_audit(
        &actor, "proyecto.desvincular_fin", "proyecto_financiamiento", &id_pivot, "delete".to_string(),
    );
    Ok(())
}

/// Lista los financiamientos vinculados a un proyecto.
pub async fn listar_financiamientos_proyecto(
    state: &AppState,
    _window_label: &str,
    id_proyecto: String,
) -> Result<
    Vec<crate::proyectos::proyecto_financiamientos::ProyectoFinanciamiento>,
    AppError,
> {
    rbac::require_permission(state, _window_label, rbac::AppPermission::ProyectosView).await?;
    crate::proyectos::proyecto_financiamientos::repository::list_by_proyecto(
        state.mongo_db()?,
        &id_proyecto,
    )
    .await
}
