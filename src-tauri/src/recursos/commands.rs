use tauri::{State, Window};

use super::handlers;
use crate::recursos::models::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
    CreateProductoRequest, Equipamiento, Financiamiento, Patente, Producto,
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
) -> Result<Patente, AppError> {
    handlers::crear_patente(&state, window.label(), request).await
}
#[tauri::command]
pub async fn get_patentes_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<Patente>, AppError> {
    handlers::get_patentes_proyecto(&state, window.label(), &proyecto_id).await
}
#[tauri::command]
pub async fn actualizar_patente(
    window: Window,
    state: State<'_, AppState>,
    id_patente: String,
    request: UpdatePatenteRequest,
) -> Result<Patente, AppError> {
    handlers::actualizar_patente(&state, window.label(), &id_patente, request).await
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
) -> Result<Patente, AppError> {
    handlers::reactivar_patente(&state, window.label(), &id_patente).await
}

#[tauri::command]
pub async fn crear_producto(
    window: Window,
    state: State<'_, AppState>,
    request: CreateProductoRequest,
) -> Result<Producto, AppError> {
    handlers::crear_producto(&state, window.label(), request).await
}
#[tauri::command]
pub async fn get_productos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<Producto>, AppError> {
    handlers::get_productos_proyecto(&state, window.label(), &proyecto_id).await
}
#[tauri::command]
pub async fn actualizar_producto(
    window: Window,
    state: State<'_, AppState>,
    id_producto: String,
    request: UpdateProductoRequest,
) -> Result<Producto, AppError> {
    handlers::actualizar_producto(&state, window.label(), &id_producto, request).await
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
) -> Result<Producto, AppError> {
    handlers::reactivar_producto(&state, window.label(), &id_producto).await
}

#[tauri::command]
pub async fn crear_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    handlers::crear_equipamiento(&state, window.label(), request).await
}
#[tauri::command]
pub async fn get_equipamientos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<Equipamiento>, AppError> {
    handlers::get_equipamientos_proyecto(&state, window.label(), &proyecto_id).await
}
#[tauri::command]
pub async fn actualizar_equipamiento(
    window: Window,
    state: State<'_, AppState>,
    id_equipamiento: String,
    request: UpdateEquipamientoRequest,
) -> Result<Equipamiento, AppError> {
    handlers::actualizar_equipamiento(&state, window.label(), &id_equipamiento, request).await
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
) -> Result<Equipamiento, AppError> {
    handlers::reactivar_equipamiento(&state, window.label(), &id_equipamiento).await
}

#[tauri::command]
pub async fn crear_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    request: CreateFinanciamientoRequest,
) -> Result<Financiamiento, AppError> {
    handlers::crear_financiamiento(&state, window.label(), request).await
}
#[tauri::command]
pub async fn get_financiamientos_proyecto(
    window: Window,
    state: State<'_, AppState>,
    proyecto_id: String,
) -> Result<Vec<Financiamiento>, AppError> {
    handlers::get_financiamientos_proyecto(&state, window.label(), &proyecto_id).await
}
#[tauri::command]
pub async fn actualizar_financiamiento(
    window: Window,
    state: State<'_, AppState>,
    id_financiamiento: String,
    request: UpdateFinanciamientoRequest,
) -> Result<Financiamiento, AppError> {
    handlers::actualizar_financiamiento(&state, window.label(), &id_financiamiento, request).await
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
) -> Result<Financiamiento, AppError> {
    handlers::reactivar_financiamiento(&state, window.label(), &id_financiamiento).await
}
