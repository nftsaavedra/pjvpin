use tauri::{State, Window};

use crate::shared::audit;
use crate::shared::error::AppError;
use crate::shared::external::perucris_service::{self, PeruCrisPushResult};
use crate::shared::external::perucris_validation_dto::{
    PeruCrisValidationItem, PeruCrisValidationReport,
};
use crate::shared::external::perucris_validation_service;
use crate::shared::rbac::{self, AppPermission};
use crate::shared::state::AppState;

/// Pushea el modelo consolidado (documento CERIF) al conector PeruCRIS.
/// RBAC: `ReportesExport` (misma capa que la exportacion de reportes).
#[tauri::command]
pub async fn enviar_a_perucris(
    window: Window,
    state: State<'_, AppState>,
) -> Result<PeruCrisPushResult, AppError> {
    let actor =
        rbac::require_permission(&state, window.label(), AppPermission::ReportesExport).await?;
    let result = perucris_service::enviar_a_perucris(&state).await?;
    audit::write_generic_audit(
        &actor,
        "perucris.push",
        "ingest",
        &state.perucris_config.api_base_url,
        format!(
            "ok http={} entidades={}",
            result.http_status.unwrap_or(0),
            result.total_proyectos
                + result.total_publicaciones
                + result.total_patentes
                + result.total_organizaciones
                + result.total_personas
        ),
    );
    Ok(result)
}

// ─── Comandos de validacion ─────────────────────────────────────────────────

/// Valida la sincronizacion del modelo consolidado contra la API PUBLICA
/// de PeruCRIS (HAL root, sin api-key). RBAC: `ReportesView` (cualquier
/// rol con acceso a reportes puede auditar).
#[tauri::command]
pub async fn validar_sincronizacion_perucris(
    window: Window,
    state: State<'_, AppState>,
    scope: Option<String>,
) -> Result<PeruCrisValidationReport, AppError> {
    let actor =
        rbac::require_permission(&state, window.label(), AppPermission::ReportesView).await?;
    let report = perucris_validation_service::validar_sincronizacion(&state, scope).await?;
    audit::write_generic_audit(
        &actor,
        "perucris.validate",
        "sync",
        "",
        format!(
            "ok total={} encontrados={} faltantes={} con_dif={}",
            report.total_evaluados,
            report.total_encontrados,
            report.total_faltantes,
            report.total_con_diferencias
        ),
    );
    Ok(report)
}

/// Valida una sola org_unit contra PeruCRIS por id interno.
#[tauri::command]
pub async fn validar_org_unit_perucris(
    window: Window,
    state: State<'_, AppState>,
    id_org_unit: String,
) -> Result<PeruCrisValidationItem, AppError> {
    let _actor =
        rbac::require_permission(&state, window.label(), AppPermission::ReportesView).await?;
    perucris_validation_service::validar_org_unit_una(&state, &id_org_unit).await
}

/// Valida una sola publicacion contra PeruCRIS por id interno.
#[tauri::command]
pub async fn validar_publicacion_perucris(
    window: Window,
    state: State<'_, AppState>,
    id_publicacion: String,
) -> Result<PeruCrisValidationItem, AppError> {
    let _actor =
        rbac::require_permission(&state, window.label(), AppPermission::ReportesView).await?;
    perucris_validation_service::validar_publicacion_una(&state, &id_publicacion).await
}

// ─── Importador asistido ─────────────────────────────────────────────────────

pub use crate::shared::external::perucris_importer::PeruCrisImportResult;

use crate::shared::external::perucris_importer;

/// Importa los proyectos + publicaciones de UNF desde PeruCRIS.
/// RBAC: `ReportesExport` (mismo nivel que el push).
#[tauri::command]
pub async fn importar_iniciales_perucris(
    window: Window,
    state: State<'_, AppState>,
) -> Result<PeruCrisImportResult, AppError> {
    use crate::shared::audit;
    let actor =
        rbac::require_permission(&state, window.label(), AppPermission::ReportesExport).await?;
    let result = perucris_importer::importar_proyectos_unf(&state).await?;
    audit::write_generic_audit(
        &actor,
        "perucris.import",
        "sync",
        "",
        format!(
            "ok proyectos(eval={} imp={} dup={} err={}) publicaciones(eval={} imp={} dup={} autores={} sin_autor={} err={})",
            result.proyectos.total_evaluados,
            result.proyectos.importados,
            result.proyectos.omitidos_duplicado,
            result.proyectos.errores.len(),
            result.publicaciones.total_evaluados,
            result.publicaciones.importados,
            result.publicaciones.omitidos_duplicado,
            result.publicaciones.autores_vinculados,
            result.publicaciones.sin_autor_vinculado,
            result.publicaciones.errores.len()
        ),
    );
    Ok(result)
}
