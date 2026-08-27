use serde::Serialize;
use tauri::{State, Window};

use crate::investigadores::dto::SyncPublicacionesResult;
use crate::publicaciones::dto::PublicacionCientificaDto;
use crate::shared::access_control;
use crate::shared::error::AppError;
use crate::shared::external::pure_service;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn sincronizar_publicaciones_pure(
    window: Window,
    state: State<'_, AppState>,
    investigador_id: String,
) -> Result<SyncPublicacionesResult, AppError> {
    access_control::require_investigadores_manage_permission(&state, window.label()).await?;
    pure_service::sync_publicaciones(&state, &investigador_id).await
}

#[tauri::command]
pub async fn get_publicaciones_investigador(
    window: Window,
    state: State<'_, AppState>,
    investigador_id: String,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    access_control::require_investigadores_view_permission(&state, window.label()).await?;
    let items =
        crate::publicaciones::repository::get_by_investigador(state.mongo_db()?, &investigador_id)
            .await?;
    Ok(items.into_iter().map(Into::into).collect())
}

/// Respuesta de `sincronizar_pure_person_ids`. Cable a IPC (camelCase).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPurePersonIdsResultDto {
    pub total_pure: usize,
    pub matched: usize,
    pub assigned: usize,
    pub unmatched_dnis: Vec<String>,
}

/// Sincroniza el campo `investigador.pure_person_id` con la API de Pure
/// (`GET /persons` paginado). Idempotente: solo rellena donde el campo
/// esta vacio (preserva asignaciones manuales).
#[tauri::command]
pub async fn sincronizar_pure_person_ids(
    window: Window,
    state: State<'_, AppState>,
) -> Result<SyncPurePersonIdsResultDto, AppError> {
    access_control::require_investigadores_manage_permission(&state, window.label()).await?;
    let r = pure_service::sincronizar_pure_person_ids(&state).await?;
    Ok(SyncPurePersonIdsResultDto {
        total_pure: r.total_pure,
        matched: r.matched,
        assigned: r.assigned,
        unmatched_dnis: r.unmatched_dnis,
    })
}
