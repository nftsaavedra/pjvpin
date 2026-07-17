use crate::proyectos::service as proyecto_service;
use crate::reportes::entity_reports::{ReporteInvestigadorIntegral, ReporteProyectoIntegral};
use crate::reportes::models::{
    ExportDataConProjectosDto, ExportDataDto, ExportDataGrupoDto, ExportDataInvestigadorPerfilDto,
    ExportDataProyectoAreaDto, ExportDataRecursoDto, InvestigadorProyectosCountDto,
    KpisDashboardDto, ProyectosTrendItemDto, RenacytDistribucionItemDto,
};
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn get_estadisticas_proyectos_x_investigador(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<InvestigadorProyectosCountDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    proyecto_service::get_estadisticas_x_investigador(state).await
}

pub async fn get_kpis_dashboard(
    state: &AppState,
    window_label: &str,
) -> Result<KpisDashboardDto, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    proyecto_service::get_kpis(state).await
}

pub async fn get_data_exportacion_plana(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    proyecto_service::get_exportacion_plana(state).await
}

pub async fn get_data_exportacion_agrupada_investigador(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataConProjectosDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    proyecto_service::get_exportacion_agrupada(state).await
}

pub async fn write_export_file(
    state: &AppState,
    window_label: &str,
    file_path: &str,
    bytes: Vec<u8>,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    let trimmed_path = file_path.trim();
    if trimmed_path.is_empty() {
        return Err(AppError::ConfigurationError(
            "La ruta de exportacion es invalida.".to_string(),
        ));
    }

    let path = std::path::Path::new(trimmed_path);
    let normalized = path
        .components()
        .fold(std::path::PathBuf::new(), |mut acc, comp| {
            match comp {
                std::path::Component::ParentDir => {
                    if !acc.as_os_str().is_empty() {
                        acc.pop();
                    }
                }
                std::path::Component::CurDir => {}
                other => {
                    acc.push(other);
                }
            }
            acc
        });

    let export_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));

    let full_path = if normalized.is_absolute() {
        normalized
    } else {
        export_dir.join(&normalized)
    };

    let canonical_export = export_dir.canonicalize().map_err(|_| {
        AppError::InternalError("No se pudo resolver el directorio de exportacion.".to_string())
    })?;

    let canonical_file = full_path.canonicalize().map_err(|_| {
        AppError::InternalError("La ruta de exportacion no es accesible.".to_string())
    })?;

    if !canonical_file.starts_with(&canonical_export) {
        return Err(AppError::ConfigurationError(
            "La ruta de exportacion esta fuera del directorio permitido.".to_string(),
        ));
    }

    if let Some(parent) = full_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|error| {
                AppError::InternalError(format!(
                    "No se pudo preparar la carpeta de exportacion: {error}"
                ))
            })?;
        }
    }
    std::fs::write(&full_path, &bytes).map_err(|error| {
        AppError::InternalError(format!("No se pudo guardar el archivo exportado: {error}"))
    })?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "reportes.export",
        "archivo",
        file_path,
        format!("{} bytes", bytes.len()),
    );
    Ok(())
}

pub async fn get_reporte_proyecto_integral(
    state: &AppState,
    window_label: &str,
    id_proyecto: &str,
) -> Result<ReporteProyectoIntegral, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    crate::reportes::entity_service::get_reporte_proyecto(state, id_proyecto).await
}

pub async fn get_reporte_investigador_integral(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<ReporteInvestigadorIntegral, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    crate::reportes::entity_service::get_reporte_investigador(state, id_investigador).await
}

pub async fn get_reportes_investigadores_integral(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ReporteInvestigadorIntegral>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    crate::reportes::entity_service::get_reportes_investigadores(state).await
}

pub async fn get_data_exportacion_grupos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataGrupoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    proyecto_service::get_exportacion_grupos(state).await
}

pub async fn get_data_exportacion_recursos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataRecursoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    proyecto_service::get_exportacion_recursos(state).await
}

pub async fn get_data_exportacion_investigadores_perfil(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataInvestigadorPerfilDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    proyecto_service::get_exportacion_investigadores_perfil(state).await
}

pub async fn get_data_exportacion_proyectos_area(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataProyectoAreaDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    proyecto_service::get_exportacion_proyectos_area(state).await
}

pub async fn get_proyectos_trend(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ProyectosTrendItemDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    proyecto_service::get_proyectos_trend(state).await
}

pub async fn get_renacyt_distribucion(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<RenacytDistribucionItemDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    proyecto_service::get_renacyt_distribucion(state).await
}
