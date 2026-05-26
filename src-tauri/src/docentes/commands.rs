use tauri::{State, Window};

use super::handlers;
use crate::docentes::models::{
    CreateDocenteRequest, Docente, DocenteDetalle, EliminarDocenteResultado,
    RefreshDocenteRenacytFormacionResultado, RenacytLookupResult, ReniecDniLookupResult,
    UpdateDocenteRequest,
};
use crate::shared::error::AppError;
use crate::shared::external::renacyt_client;
use crate::shared::external::reniec_client;
use crate::shared::pagination::PaginatedResult;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_docente(
    window: Window,
    state: State<'_, AppState>,
    request: CreateDocenteRequest,
) -> Result<Docente, AppError> {
    handlers::crear_docente(&state, window.label(), request).await
}

#[tauri::command]
pub async fn get_all_docentes(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<Docente>, AppError> {
    handlers::get_all_docentes(&state, window.label()).await
}

#[tauri::command]
pub async fn get_all_docentes_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Docente>, AppError> {
    handlers::get_all_docentes_paginated(&state, window.label(), page, limit).await
}

#[tauri::command]
pub async fn buscar_docente_por_dni(
    window: Window,
    state: State<'_, AppState>,
    dni: String,
) -> Result<Option<Docente>, AppError> {
    handlers::buscar_docente_por_dni(&state, window.label(), &dni).await
}

// NEW: Get docentes with project details
#[tauri::command]
pub async fn get_all_docentes_con_proyectos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<DocenteDetalle>, AppError> {
    handlers::get_all_docentes_con_proyectos(&state, window.label()).await
}

#[tauri::command]
pub async fn eliminar_docente(
    window: Window,
    state: State<'_, AppState>,
    id_docente: String,
) -> Result<EliminarDocenteResultado, AppError> {
    handlers::eliminar_docente(&state, window.label(), &id_docente).await
}

#[tauri::command]
pub async fn reactivar_docente(
    window: Window,
    state: State<'_, AppState>,
    id_docente: String,
) -> Result<Docente, AppError> {
    handlers::reactivar_docente(&state, window.label(), &id_docente).await
}

#[tauri::command]
pub async fn actualizar_docente(
    window: Window,
    state: State<'_, AppState>,
    id_docente: String,
    request: UpdateDocenteRequest,
) -> Result<Docente, AppError> {
    handlers::actualizar_docente(&state, window.label(), &id_docente, request).await
}

#[tauri::command]
pub async fn consultar_dni_reniec(
    window: Window,
    state: State<'_, AppState>,
    numero: String,
) -> Result<ReniecDniLookupResult, AppError> {
    crate::shared::rbac::require_docentes_manage_permission(&state, window.label()).await?;
    reniec_client::consultar_dni(state.reniec_config(), &numero).await
}

#[tauri::command]
pub async fn consultar_renacyt_docente(
    window: Window,
    state: State<'_, AppState>,
    codigo_o_id: String,
) -> Result<RenacytLookupResult, AppError> {
    crate::shared::rbac::require_docentes_manage_permission(&state, window.label()).await?;
    renacyt_client::consultar_investigador(state.renacyt_config(), &codigo_o_id).await
}

#[tauri::command]
pub async fn refrescar_formacion_academica_renacyt_docente(
    window: Window,
    state: State<'_, AppState>,
    id_docente: String,
) -> Result<RefreshDocenteRenacytFormacionResultado, AppError> {
    handlers::refrescar_formacion_academica_renacyt_docente(&state, window.label(), &id_docente)
        .await
}
