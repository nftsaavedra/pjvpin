use crate::investigadores::models::{
    CreateInvestigadorRequest, EliminarInvestigadorResultado, Investigador, InvestigadorDetalle,
    RefreshInvestigadorRenacytFormacionResultado,
};
use crate::investigadores::service as investigador_service;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_investigador(
    state: &AppState,
    window_label: &str,
    request: CreateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let investigador = investigador_service::create(state, request).await?;
    let persona = state
        .mongo_db()?
        .collection::<crate::personas::models::Persona>("personas")
        .find_one(mongodb::bson::doc! { "id_persona": &investigador.persona_id })
        .await?;
    let (dni_audit, nombre_audit) = match persona {
        Some(ref p) => (p.dni.clone(), p.nombre_completo.clone()),
        None => (String::new(), String::new()),
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.create",
        "investigador",
        &dni_audit,
        nombre_audit,
    );
    Ok(investigador)
}

pub async fn get_all_investigadores(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<Investigador>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    investigador_service::get_all(state).await
}

pub async fn get_all_investigadores_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Investigador>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    investigador_service::get_all_paginated(state, page, limit).await
}

pub async fn buscar_investigador_por_dni(
    state: &AppState,
    window_label: &str,
    dni: &str,
) -> Result<Option<Investigador>, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    investigador_service::find_by_dni(state, dni).await
}

pub async fn get_all_investigadores_con_proyectos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<InvestigadorDetalle>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    investigador_service::get_all_detalle(state).await
}

pub async fn eliminar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<EliminarInvestigadorResultado, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let result = investigador_service::delete(state, id_investigador).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.delete",
        "investigador",
        id_investigador,
        result.accion.clone(),
    );
    Ok(result)
}

pub async fn reactivar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Investigador, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    investigador_service::reactivate(state, id_investigador).await
}

pub async fn actualizar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
    request: crate::investigadores::models::UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    investigador_service::update(state, id_investigador, request).await
}

pub async fn refrescar_formacion_academica_renacyt_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<RefreshInvestigadorRenacytFormacionResultado, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    investigador_service::refresh_renacyt_formacion(state, id_investigador).await
}
