use super::handlers;
use crate::reportes::entity_reports::{ReporteDocenteIntegral, ReporteProyectoIntegral};
use crate::reportes::models::{
    DocenteProyectosCount, ExportData, ExportDataConProjectos, ExportDataDocentePerfil,
    ExportDataGrupo, ExportDataProyectoArea, ExportDataRecurso, KpisDashboard, ProyectosTrendItem,
    RenacytDistribucionItem,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

#[tauri::command]
pub async fn get_estadisticas_proyectos_x_investigador(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<DocenteProyectosCount>, AppError> {
    handlers::get_estadisticas_proyectos_x_investigador(&state, window.label()).await
}

#[tauri::command]
pub async fn get_kpis_dashboard(
    window: Window,
    state: State<'_, AppState>,
) -> Result<KpisDashboard, AppError> {
    handlers::get_kpis_dashboard(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_plana(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportData>, AppError> {
    handlers::get_data_exportacion_plana(&state, window.label()).await
}

// NEW: Improved export grouped by docente
#[tauri::command]
pub async fn get_data_exportacion_agrupada_investigador(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataConProjectos>, AppError> {
    handlers::get_data_exportacion_agrupada_investigador(&state, window.label()).await
}

#[tauri::command]
pub async fn write_export_file(
    window: Window,
    state: State<'_, AppState>,
    file_path: String,
    bytes: Vec<u8>,
) -> Result<(), AppError> {
    handlers::write_export_file(&state, window.label(), &file_path, bytes).await
}

// ── Reportes Integrales de Entidad ────────────────────────────────────────────

#[tauri::command]
pub async fn get_reporte_proyecto_integral(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<ReporteProyectoIntegral, AppError> {
    handlers::get_reporte_proyecto_integral(&state, window.label(), &id_proyecto).await
}

#[tauri::command]
pub async fn get_reporte_investigador_integral(
    window: Window,
    state: State<'_, AppState>,
    id_docente: String,
) -> Result<ReporteDocenteIntegral, AppError> {
    handlers::get_reporte_investigador_integral(&state, window.label(), &id_docente).await
}

#[tauri::command]
pub async fn get_reportes_investigadores_integral(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ReporteDocenteIntegral>, AppError> {
    handlers::get_reportes_investigadores_integral(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_grupos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataGrupo>, AppError> {
    handlers::get_data_exportacion_grupos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_recursos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataRecurso>, AppError> {
    handlers::get_data_exportacion_recursos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_investigadores_perfil(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataDocentePerfil>, AppError> {
    handlers::get_data_exportacion_investigadores_perfil(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_proyectos_area(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataProyectoArea>, AppError> {
    handlers::get_data_exportacion_proyectos_area(&state, window.label()).await
}

#[tauri::command]
pub async fn get_proyectos_trend(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ProyectosTrendItem>, AppError> {
    handlers::get_proyectos_trend(&state, window.label()).await
}

#[tauri::command]
pub async fn get_renacyt_distribucion(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<RenacytDistribucionItem>, AppError> {
    handlers::get_renacyt_distribucion(&state, window.label()).await
}
