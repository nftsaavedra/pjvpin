use super::handlers;
use crate::proyectos::dto::{
    ExportDataConProjectosDto, ExportDataDto, ExportDataGrupoDto, ExportDataInvestigadorPerfilDto,
    ExportDataProyectoAreaDto, ExportDataRecursoDto, InvestigadorProyectosCountDto,
    KpisDashboardDto, ProyectosTrendItemDto, RenacytDistribucionItemDto,
};
use crate::reportes::cerif::CerifExportResult;
use crate::reportes::dto::{
    PureMasterlistData, ReporteInvestigadorIntegral, ReporteProyectoIntegral,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::{State, Window};

/// Exporta el modelo a un documento CERIF (JSON) y lo escribe en disco.
/// `entidad` opcional filtra el alcance: todo, organizaciones, personas,
/// proyectos, publicaciones, patentes.
#[tauri::command]
pub async fn exportar_cerif(
    window: Window,
    state: State<'_, AppState>,
    file_path: String,
    entidad: Option<String>,
) -> Result<CerifExportResult, AppError> {
    handlers::exportar_cerif(&state, window.label(), &file_path, entidad).await
}

#[tauri::command]
pub async fn get_estadisticas_proyectos_x_investigador(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<InvestigadorProyectosCountDto>, AppError> {
    handlers::get_estadisticas_proyectos_x_investigador(&state, window.label()).await
}

#[tauri::command]
pub async fn get_kpis_dashboard(
    window: Window,
    state: State<'_, AppState>,
) -> Result<KpisDashboardDto, AppError> {
    handlers::get_kpis_dashboard(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_plana(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataDto>, AppError> {
    handlers::get_data_exportacion_plana(&state, window.label()).await
}

// NEW: Improved export grouped by investigador
#[tauri::command]
pub async fn get_data_exportacion_agrupada_investigador(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataConProjectosDto>, AppError> {
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
    id_investigador: String,
) -> Result<ReporteInvestigadorIntegral, AppError> {
    handlers::get_reporte_investigador_integral(&state, window.label(), &id_investigador).await
}

#[tauri::command]
pub async fn get_reportes_investigadores_integral(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ReporteInvestigadorIntegral>, AppError> {
    handlers::get_reportes_investigadores_integral(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_grupos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataGrupoDto>, AppError> {
    handlers::get_data_exportacion_grupos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_recursos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataRecursoDto>, AppError> {
    handlers::get_data_exportacion_recursos(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_investigadores_perfil(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataInvestigadorPerfilDto>, AppError> {
    handlers::get_data_exportacion_investigadores_perfil(&state, window.label()).await
}

#[tauri::command]
pub async fn get_data_exportacion_proyectos_area(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ExportDataProyectoAreaDto>, AppError> {
    handlers::get_data_exportacion_proyectos_area(&state, window.label()).await
}

#[tauri::command]
pub async fn get_proyectos_trend(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<ProyectosTrendItemDto>, AppError> {
    handlers::get_proyectos_trend(&state, window.label()).await
}

#[tauri::command]
pub async fn get_renacyt_distribucion(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<RenacytDistribucionItemDto>, AppError> {
    handlers::get_renacyt_distribucion(&state, window.label()).await
}

/// Devuelve el payload del reporte "Pure Master List" para los
/// investigadores activos. `pure_remote_total` es opcional: si el panel ya
/// conoce el total de personas en Pure (cache de la ultima sincronizacion)
/// lo pasa para enriquecer el resumen pre-export.
#[tauri::command]
pub async fn get_data_pure_masterlist(
    window: Window,
    state: State<'_, AppState>,
    pure_remote_total: Option<usize>,
) -> Result<PureMasterlistData, AppError> {
    handlers::get_data_pure_masterlist(&state, window.label(), pure_remote_total).await
}
