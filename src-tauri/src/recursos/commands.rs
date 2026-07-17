use tauri::{State, Window};

use super::handlers;
use crate::recursos::dto::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
    CreateProductoRequest, EquipamientoDto, FinanciamientoDto, PatenteDto, ProductoDto,
    UpdateEquipamientoRequest, UpdateFinanciamientoRequest, UpdatePatenteRequest,
    UpdateProductoRequest,
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
pub async fn crear_producto(
    window: Window,
    state: State<'_, AppState>,
    request: CreateProductoRequest,
) -> Result<ProductoDto, AppError> {
    let item = handlers::crear_producto(&state, window.label(), request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn get_productos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<ProductoDto>, AppError> {
    let items = handlers::get_productos_proyecto(&state, window.label(), &proyecto_id).await?;
    Ok(items.into_iter().map(Into::into).collect())
}
#[tauri::command]
pub async fn actualizar_producto(
    window: Window,
    state: State<'_, AppState>,
    id_producto: String,
    request: UpdateProductoRequest,
) -> Result<ProductoDto, AppError> {
    let item = handlers::actualizar_producto(&state, window.label(), &id_producto, request).await?;
    Ok(item.into())
}
#[tauri::command]
pub async fn eliminar_producto(
    window: Window,
    state: State<'_, AppState>,
    id_producto: String,
) -> Result<(), AppError> {
    handlers::eliminar_producto(&state, window.label(), &id_producto).await
}
#[tauri::command]
pub async fn reactivar_producto(
    window: Window,
    state: State<'_, AppState>,
    id_producto: String,
) -> Result<ProductoDto, AppError> {
    let item = handlers::reactivar_producto(&state, window.label(), &id_producto).await?;
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
