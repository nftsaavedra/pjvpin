use crate::proyectos::dto::{
    ExportDataConProjectosDto, ExportDataDto, ExportDataGrupoDto, ExportDataInvestigadorPerfilDto,
    ExportDataProyectoAreaDto, ExportDataRecursoDto, InvestigadorProyectosCountDto,
    KpisDashboardDto, ProyectosTrendItemDto, RenacytDistribucionItemDto,
};
use crate::reportes::cerif::{self, CerifExportResult};
use crate::reportes::dto::{
    PureMasterlistData, ReporteInvestigadorIntegral, ReporteProyectoIntegral,
};
use crate::reportes::sync_reportes::{self, SyncReport, SyncReportTipo};
use crate::shared::error::AppError;
use crate::shared::external::pure_diff_service;
use crate::shared::rbac;
use crate::shared::state::AppState;

/// Exporta el modelo consolidado a un documento CERIF (JSON) y lo escribe en
/// disco reusando `write_export_file` (RBAC `ReportesExport` + audit).
pub async fn exportar_cerif(
    state: &AppState,
    window_label: &str,
    file_path: &str,
    entidad: Option<String>,
) -> Result<CerifExportResult, AppError> {
    let scope = cerif::parse_scope(entidad.as_deref())?;
    let db = state.mongo_db()?;
    let doc = cerif::build_cerif_document(db, scope).await?;
    let bytes = cerif::cerif_to_json_bytes(&doc)?;
    write_export_file(state, window_label, file_path, bytes.clone()).await?;
    Ok(CerifExportResult::from_document(
        &entidad.unwrap_or_else(|| "todo".to_string()),
        &doc,
        bytes.len(),
    ))
}

pub async fn get_estadisticas_proyectos_x_investigador(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<InvestigadorProyectosCountDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    crate::proyectos::repository_stats::get_estadisticas_proyectos_x_investigador(state.mongo_db()?)
        .await
}

pub async fn get_kpis_dashboard(
    state: &AppState,
    window_label: &str,
) -> Result<KpisDashboardDto, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    crate::proyectos::repository_stats::get_kpis_dashboard(state.mongo_db()?).await
}

pub async fn get_data_exportacion_plana(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesExport).await?;
    crate::proyectos::repository_export::get_data_exportacion_plana(state.mongo_db()?).await
}

pub async fn get_data_exportacion_agrupada_investigador(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataConProjectosDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    crate::proyectos::repository_export::get_data_exportacion_agrupada_investigador(
        state.mongo_db()?,
    )
    .await
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
    crate::proyectos::repository_export::get_data_exportacion_grupos(state.mongo_db()?).await
}

pub async fn get_data_exportacion_recursos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataRecursoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    crate::proyectos::repository_export::get_data_exportacion_recursos(state.mongo_db()?).await
}

pub async fn get_data_exportacion_investigadores_perfil(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataInvestigadorPerfilDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    crate::proyectos::repository_export::get_data_exportacion_investigadores_perfil(
        state.mongo_db()?,
    )
    .await
}

pub async fn get_data_exportacion_proyectos_area(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ExportDataProyectoAreaDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    crate::proyectos::repository_export::get_data_exportacion_proyectos_area(state.mongo_db()?)
        .await
}

pub async fn get_proyectos_trend(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<ProyectosTrendItemDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    crate::proyectos::repository_stats::get_proyectos_trend(state.mongo_db()?).await
}

pub async fn get_renacyt_distribucion(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<RenacytDistribucionItemDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::DashboardView).await?;
    crate::proyectos::repository_stats::get_renacyt_distribucion(state.mongo_db()?).await
}

/// Devuelve el payload completo del reporte "Pure Master List" para los
/// investigadores activos. RBAC `ReportesView` (cualquier rol con acceso a
/// reportes puede previsualizar la distribucion antes del export).
pub async fn get_data_pure_masterlist(
    state: &AppState,
    window_label: &str,
    pure_remote_total: Option<usize>,
) -> Result<PureMasterlistData, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::ReportesView).await?;
    crate::reportes::repository_pure_masterlist::build_pure_masterlist_data(
        state.mongo_db()?,
        pure_remote_total,
    )
    .await
}

/// Ejecuta la verificacion de doble via contra Pure (READ-ONLY) y persiste
/// el reporte. Con `investigador_id` compara las publicaciones de ese
/// investigador; sin el, compara el mapeo global de personas.
pub async fn verificar_diferencias_pure(
    state: &AppState,
    window_label: &str,
    investigador_id: Option<String>,
) -> Result<SyncReport, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView)
            .await?;
    let report = match investigador_id.as_deref().map(str::trim) {
        Some(id) if !id.is_empty() => pure_diff_service::diff_publicaciones(state, id).await?,
        _ => pure_diff_service::diff_personas(state).await?,
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        "pure.diff",
        "sync_reporte",
        &report.id,
        format!(
            "solo_local={} solo_pure={} diferentes={}",
            report.resumen.solo_local, report.resumen.solo_pure, report.resumen.diferentes
        ),
    );
    Ok(report)
}

/// Historial de reportes de sincronizacion persistidos, del mas reciente al
/// mas antiguo. `tipo` filtra por subsistema (`pure_diff` /
/// `perucris_validacion`).
pub async fn list_sync_reports(
    state: &AppState,
    window_label: &str,
    tipo: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<SyncReport>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    let tipo = tipo
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(SyncReportTipo::parse)
        .transpose()?;
    let limit = limit.unwrap_or(10).clamp(1, 100);
    sync_reportes::list_recent(state.mongo_db()?, tipo, limit).await
}
