use super::handlers;
use crate::proyectos::dto::{
    CreateProyectoConParticipantesRequest, EliminarProyectoResultadoDto, ProyectoDetalleDto,
    ProyectoDto, UpdateProyectoConParticipantesRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

#[tauri::command]
pub async fn crear_proyecto_con_participantes(
    window: Window,
    state: State<'_, AppState>,
    request: CreateProyectoConParticipantesRequest,
) -> Result<ProyectoDto, AppError> {
    handlers::crear_proyecto_con_participantes(&state, window.label(), request).await
}

#[tauri::command]
pub async fn buscar_proyectos_por_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<ProyectoDto>, AppError> {
    handlers::buscar_proyectos_por_investigador(&state, window.label(), &id_investigador).await
}

#[tauri::command]
pub async fn actualizar_proyecto_con_participantes(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<ProyectoDto, AppError> {
    handlers::update_proyecto_con_participantes(&state, window.label(), &id_proyecto, request).await
}

#[tauri::command]
pub async fn get_all_proyectos_detalle(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ProyectoDetalleDto>, AppError> {
    handlers::get_all_proyectos_detalle(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_proyectos_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<ProyectoDto>, AppError> {
    handlers::get_all_proyectos_paginated(&state, window.label(), page, limit).await
}

#[tauri::command]
pub async fn eliminar_relacion_proyecto_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
    id_investigador: String,
) -> Result<(), AppError> {
    handlers::eliminar_relacion_proyecto_investigador(
        &state,
        window.label(),
        &id_proyecto,
        &id_investigador,
    )
    .await
}

#[tauri::command]
pub async fn eliminar_relaciones_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<(), AppError> {
    handlers::eliminar_relaciones_proyecto(&state, window.label(), &id_proyecto).await
}

#[tauri::command]
pub async fn eliminar_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<EliminarProyectoResultadoDto, AppError> {
    handlers::eliminar_proyecto(&state, window.label(), &id_proyecto).await
}

#[tauri::command]
pub async fn reactivar_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<ProyectoDto, AppError> {
    handlers::reactivar_proyecto(&state, window.label(), &id_proyecto).await
}

// --- Pivots M:N CONCYTEC/PeruCRIS (N2-C) ---

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VincularOrgProyectoRequest {
    pub id_proyecto: String,
    pub id_org_unit: String,
    pub rol: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VincularFinProyectoRequest {
    pub id_proyecto: String,
    pub id_financiamiento: String,
    pub monto_asignado: Option<f64>,
    pub moneda: Option<String>,
}

#[tauri::command]
pub async fn vincular_org_proyecto(
    window: Window,
    state: State<'_, AppState>,
    request: VincularOrgProyectoRequest,
) -> Result<(), AppError> {
    handlers::vincular_org_proyecto(
        &state,
        window.label(),
        request.id_proyecto,
        request.id_org_unit,
        request.rol,
    )
    .await
}

#[tauri::command]
pub async fn desvincular_org_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_pivot: String,
) -> Result<(), AppError> {
    handlers::desvincular_org_proyecto(&state, window.label(), id_pivot).await
}

#[tauri::command]
pub async fn listar_orgs_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<Vec<crate::proyectos::proyecto_organizaciones::ProyectoOrganizacionDoc>, AppError> {
    Ok(
        handlers::listar_orgs_proyecto(&state, window.label(), id_proyecto)
            .await?
            .into_iter()
            .map(crate::proyectos::proyecto_organizaciones::ProyectoOrganizacionDoc::from)
            .collect(),
    )
}

#[tauri::command]
pub async fn vincular_financiamiento_proyecto(
    window: Window,
    state: State<'_, AppState>,
    request: VincularFinProyectoRequest,
) -> Result<(), AppError> {
    handlers::vincular_financiamiento_proyecto(
        &state,
        window.label(),
        request.id_proyecto,
        request.id_financiamiento,
        request.monto_asignado,
        request.moneda,
    )
    .await
}

#[tauri::command]
pub async fn desvincular_financiamiento_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_pivot: String,
) -> Result<(), AppError> {
    handlers::desvincular_financiamiento_proyecto(&state, window.label(), id_pivot).await
}

#[tauri::command]
pub async fn listar_financiamientos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<Vec<crate::proyectos::proyecto_financiamientos::ProyectoFinanciamientoDoc>, AppError> {
    Ok(
        handlers::listar_financiamientos_proyecto(&state, window.label(), id_proyecto)
            .await?
            .into_iter()
            .map(crate::proyectos::proyecto_financiamientos::ProyectoFinanciamientoDoc::from)
            .collect(),
    )
}
