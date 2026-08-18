use tauri::{State, Window};

use super::handlers;
use crate::recursos::dto::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest, EquipamientoDto,
    FinanciamientoDto, PatenteDto, UpdateEquipamientoRequest, UpdateFinanciamientoRequest,
    UpdatePatenteRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_patente(
    window: Window,
    state: State<'_, AppState>,
    request: CreatePatenteRequest,
) -> Result<PatenteDto, AppError> {
    let item = handlers::crear_patente(&state, window.label(), request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn get_patentes_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<PatenteDto>, AppError> {
    let items = handlers::get_patentes_proyecto(&state, window.label(), &proyecto_id).await?;
    Ok(items.into_iter().map(Into::into).collect())
}
#[tauri::command]
pub async fn actualizar_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
    request: UpdatePatenteRequest,
) -> Result<PatenteDto, AppError> {
    let item = handlers::actualizar_patente(&state, window.label(), &id_patente, request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn eliminar_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
) -> Result<(), AppError> {
    handlers::eliminar_patente(&state, window.label(), &id_patente).await
}
#[tauri::command]
pub async fn reactivar_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
) -> Result<PatenteDto, AppError> {
    let item = handlers::reactivar_patente(&state, window.label(), &id_patente).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn crear_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateEquipamientoRequest,
) -> Result<EquipamientoDto, AppError> {
    let item = handlers::crear_equipamiento(&state, window.label(), request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn get_equipamientos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<EquipamientoDto>, AppError> {
    let items = handlers::get_equipamientos_proyecto(&state, window.label(), &proyecto_id).await?;
    Ok(items.into_iter().map(Into::into).collect())
}
#[tauri::command]
pub async fn actualizar_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    id_equipamiento: String,
    request: UpdateEquipamientoRequest,
) -> Result<EquipamientoDto, AppError> {
    let item = handlers::actualizar_equipamiento(&state, window.label(), &id_equipamiento, request)
        .await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn eliminar_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    id_equipamiento: String,
) -> Result<(), AppError> {
    handlers::eliminar_equipamiento(&state, window.label(), &id_equipamiento).await
}
#[tauri::command]
pub async fn reactivar_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    id_equipamiento: String,
) -> Result<EquipamientoDto, AppError> {
    let item = handlers::reactivar_equipamiento(&state, window.label(), &id_equipamiento).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn crear_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateFinanciamientoRequest,
) -> Result<FinanciamientoDto, AppError> {
    let item = handlers::crear_financiamiento(&state, window.label(), request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn get_financiamientos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<FinanciamientoDto>, AppError> {
    let items =
        handlers::get_financiamientos_proyecto(&state, window.label(), &proyecto_id).await?;
    Ok(items.into_iter().map(Into::into).collect())
}
#[tauri::command]
pub async fn actualizar_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    id_financiamiento: String,
    request: UpdateFinanciamientoRequest,
) -> Result<FinanciamientoDto, AppError> {
    let item =
        handlers::actualizar_financiamiento(&state, window.label(), &id_financiamiento, request)
            .await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn eliminar_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    id_financiamiento: String,
) -> Result<(), AppError> {
    handlers::eliminar_financiamiento(&state, window.label(), &id_financiamiento).await
}
#[tauri::command]
pub async fn reactivar_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    id_financiamiento: String,
) -> Result<FinanciamientoDto, AppError> {
    let item =
        handlers::reactivar_financiamiento(&state, window.label(), &id_financiamiento).await?;
    Ok(item.into())
}

// --- Pivots M:N CONCYTEC/PeruCRIS (N3-A) ---

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VincularInventorPatenteRequest {
    pub id_patente: String,
    pub id_persona: String,
    pub orden: i32,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VincularTitularPatenteRequest {
    pub id_patente: String,
    pub holder_type: String,
    pub id_org_unit: Option<String>,
    pub id_persona: Option<String>,
    pub orden: i32,
}

#[tauri::command]
pub async fn vincular_inventor_patente(
    window: Window,
    state: State<'_, AppState>,
    request: VincularInventorPatenteRequest,
) -> Result<(), AppError> {
    handlers::vincular_inventor_patente(
        &state,
        window.label(),
        request.id_patente,
        request.id_persona,
        request.orden,
    )
    .await
}

#[tauri::command]
pub async fn desvincular_inventor_patente(
    window: Window,
    state: State<'_, AppState>,
    id_pivot: String,
) -> Result<(), AppError> {
    handlers::desvincular_inventor_patente(&state, window.label(), id_pivot).await
}

#[tauri::command]
pub async fn listar_inventores_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
) -> Result<Vec<crate::recursos::patente_inventores::PatenteInventorDoc>, AppError> {
    Ok(
        handlers::listar_inventores_patente(&state, window.label(), id_patente)
            .await?
            .into_iter()
            .map(crate::recursos::patente_inventores::PatenteInventorDoc::from)
            .collect(),
    )
}

#[tauri::command]
pub async fn vincular_titular_patente(
    window: Window,
    state: State<'_, AppState>,
    request: VincularTitularPatenteRequest,
) -> Result<(), AppError> {
    handlers::vincular_titular_patente(
        &state,
        window.label(),
        request.id_patente,
        request.holder_type,
        request.id_org_unit,
        request.id_persona,
        request.orden,
    )
    .await
}

#[tauri::command]
pub async fn desvincular_titular_patente(
    window: Window,
    state: State<'_, AppState>,
    id_pivot: String,
) -> Result<(), AppError> {
    handlers::desvincular_titular_patente(&state, window.label(), id_pivot).await
}

#[tauri::command]
pub async fn listar_titulares_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
) -> Result<Vec<crate::recursos::patente_titulares::PatenteTitularDoc>, AppError> {
    Ok(
        handlers::listar_titulares_patente(&state, window.label(), id_patente)
            .await?
            .into_iter()
            .map(crate::recursos::patente_titulares::PatenteTitularDoc::from)
            .collect(),
    )
}
