use crate::docentes::models::{
    CreateDocenteRequest, Docente, DocenteDetalle, EliminarDocenteResultado,
    RefreshDocenteRenacytFormacionResultado,
};
use crate::docentes::service as docente_service;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_docente(
    state: &AppState,
    window_label: &str,
    request: CreateDocenteRequest,
) -> Result<Docente, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    let docente = docente_service::create(state, request).await?;
    let persona = state
        .mongo_db()?
        .collection::<crate::personas::models::Persona>("personas")
        .find_one(mongodb::bson::doc! { "id_persona": &docente.persona_id })
        .await?;
    let (dni_audit, nombre_audit) = match persona {
        Some(ref p) => (p.dni.clone(), p.nombre_completo.clone()),
        None => (String::new(), String::new()),
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        "docente.create",
        "docente",
        &dni_audit,
        nombre_audit,
    );
    Ok(docente)
}

pub async fn get_all_docentes(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<Docente>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesView).await?;
    docente_service::get_all(state).await
}

pub async fn get_all_docentes_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Docente>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesView).await?;
    docente_service::get_all_paginated(state, page, limit).await
}

pub async fn buscar_docente_por_dni(
    state: &AppState,
    window_label: &str,
    dni: &str,
) -> Result<Option<Docente>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    docente_service::find_by_dni(state, dni).await
}

pub async fn get_all_docentes_con_proyectos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<DocenteDetalle>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesView).await?;
    docente_service::get_all_detalle(state).await
}

pub async fn eliminar_docente(
    state: &AppState,
    window_label: &str,
    id_docente: &str,
) -> Result<EliminarDocenteResultado, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    let result = docente_service::delete(state, id_docente).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "docente.delete",
        "docente",
        id_docente,
        result.accion.clone(),
    );
    Ok(result)
}

pub async fn reactivar_docente(
    state: &AppState,
    window_label: &str,
    id_docente: &str,
) -> Result<Docente, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    docente_service::reactivate(state, id_docente).await
}

pub async fn actualizar_docente(
    state: &AppState,
    window_label: &str,
    id_docente: &str,
    request: crate::docentes::models::UpdateDocenteRequest,
) -> Result<Docente, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    docente_service::update(state, id_docente, request).await
}

pub async fn refrescar_formacion_academica_renacyt_docente(
    state: &AppState,
    window_label: &str,
    id_docente: &str,
) -> Result<RefreshDocenteRenacytFormacionResultado, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DocentesManage).await?;
    docente_service::refresh_renacyt_formacion(state, id_docente).await
}
