//! Comandos Tauri de la feature `geo` (Ubigeo INEI).
//!
//! Solo lectura: los ubigeos provienen del seed embebido o del importer
//! futuro (no hay UI de captura).

use tauri::{State, Window};

use super::handlers;
use crate::geo::dto::UbigeoDto;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn obtener_ubigeos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<UbigeoDto>, AppError> {
    handlers::obtener_ubigeos(&state, window.label()).await
}

#[tauri::command]
pub async fn obtener_ubigeos_por_departamento(
    window: Window,
    state: State<'_, AppState>,
    departamento: String,
) -> Result<Vec<UbigeoDto>, AppError> {
    handlers::obtener_ubigeos_por_departamento(&state, window.label(), &departamento).await
}

#[tauri::command]
pub async fn buscar_ubigeos(
    window: Window,
    state: State<'_, AppState>,
    prefix: String,
) -> Result<Vec<UbigeoDto>, AppError> {
    handlers::buscar_ubigeos(&state, window.label(), &prefix).await
}
