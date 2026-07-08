use super::handlers;
use crate::proyectos::models::{
    CreateProyectoConParticipantesRequest, EliminarProyectoResultado, Proyecto, ProyectoDetalle,
    UpdateProyectoConParticipantesRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

#[tauri::command]
pub async fn crear_proyecto_con_participantes(
    window: Window,
    state: State<'_, AppState>,
    request: CreateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    handlers::crear_proyecto_con_participantes(&state, window.label(), request).await
}

#[tauri::command]
pub async fn buscar_proyectos_por_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<Proyecto>, AppError> {
    handlers::buscar_proyectos_por_investigador(&state, window.label(), &id_investigador).await
}

#[tauri::command]
pub async fn actualizar_proyecto_con_participantes(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    handlers::update_proyecto_con_participantes(&state, window.label(), &id_proyecto, request).await
}

#[tauri::command]
pub async fn get_all_proyectos_detalle(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ProyectoDetalle>, AppError> {
    handlers::get_all_proyectos_detalle(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_proyectos_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<Proyecto>, AppError> {
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
) -> Result<EliminarProyectoResultado, AppError> {
    handlers::eliminar_proyecto(&state, window.label(), &id_proyecto).await
}

#[tauri::command]
pub async fn reactivar_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<Proyecto, AppError> {
    handlers::reactivar_proyecto(&state, window.label(), &id_proyecto).await
}
