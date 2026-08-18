use tauri::{State, Window};

use crate::shared::audit;
use crate::shared::error::AppError;
use crate::shared::external::perucris_service::{self, PeruCrisPushResult};
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
