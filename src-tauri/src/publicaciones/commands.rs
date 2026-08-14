use tauri::{State, Window};

use super::handlers;
use crate::publicaciones::dto::{
    CreatePublicacionRequest, PublicacionCientificaDto, UpdatePublicacionRequest,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_publicacion(
    window: Window,
    state: State<'_, AppState>,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::crear_publicacion(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_all_publicaciones(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items = handlers::get_all_publicaciones(&state, window.label()).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_publicacion_by_id(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::get_publicacion_by_id(&state, window.label(), &id).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_publicaciones_by_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items =
        handlers::get_publicaciones_by_investigador(&state, window.label(), &id_investigador)
            .await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_publicaciones_by_anio(
    window: Window,
    state: State<'_, AppState>,
    anio: i32,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items = handlers::get_publicaciones_by_anio(&state, window.label(), anio).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_software_by_proyecto(
    window: Window,
    state: State<'_, AppState>,
    id_proyecto: String,
) -> Result<Vec<PublicacionCientificaDto>, AppError> {
    let items = handlers::get_software_by_proyecto(&state, window.label(), &id_proyecto).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn actualizar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::actualizar_publicacion(&state, window.label(), &id, request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn eliminar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    handlers::eliminar_publicacion(&state, window.label(), &id).await
}

#[tauri::command]
pub async fn reactivar_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id: String,
) -> Result<PublicacionCientificaDto, AppError> {
    let item = handlers::reactivar_publicacion(&state, window.label(), &id).await?;
    Ok(item.into())
}

// --- Pivot M:N CONCYTEC/PeruCRIS (N3-B) ---

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VincularAutorPublicacionRequest {
    pub id_publicacion: String,
    pub id_persona: String,
    pub id_org_unit_afiliacion: Option<String>,
    pub orden: i32,
    pub es_autor_correspondiente: bool,
}

#[tauri::command]
pub async fn vincular_autor_publicacion(
    window: Window,
    state: State<'_, AppState>,
    request: VincularAutorPublicacionRequest,
) -> Result<(), AppError> {
    handlers::vincular_autor_publicacion(
        &state,
        window.label(),
        request.id_publicacion,
        request.id_persona,
        request.id_org_unit_afiliacion,
        request.orden,
        request.es_autor_correspondiente,
    )
    .await
}

#[tauri::command]
pub async fn desvincular_autor_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id_pivot: String,
) -> Result<(), AppError> {
    handlers::desvincular_autor_publicacion(&state, window.label(), id_pivot).await
}

#[tauri::command]
pub async fn listar_autores_publicacion(
    window: Window,
    state: State<'_, AppState>,
    id_publicacion: String,
) -> Result<Vec<crate::publicaciones::autores::PublicacionAutorDoc>, AppError> {
    Ok(handlers::listar_autores_publicacion(&state, window.label(), id_publicacion)
        .await?
        .into_iter()
        .map(crate::publicaciones::autores::PublicacionAutorDoc::from)
        .collect())
}
