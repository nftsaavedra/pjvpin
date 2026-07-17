use tauri::{State, Window};

use super::handlers;
use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto, InvestigadorDetalleDto,
    InvestigadorDto, RefreshInvestigadorRenacytFormacionResultadoDto, RenacytLookupResult,
    ReniecDniLookupResult, UpdateInvestigadorRequest,
};
use crate::shared::error::AppError;
use crate::shared::external::renacyt_client;
use crate::shared::external::reniec_client;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn crear_investigador(
    window: Window,
    state: State<'_, AppState>,
    request: CreateInvestigadorRequest,
) -> Result<InvestigadorDto, AppError> {
    let item = handlers::crear_investigador(&state, window.label(), request).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn get_all_investigadores(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<InvestigadorDto>, AppError> {
    let items = handlers::get_all_investigadores(&state, window.label()).await?;
    Ok(items.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn get_all_investigadores_paginated(
    window: Window,
    state: State<'_, AppState>,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<InvestigadorDto>, AppError> {
    let result =
        handlers::get_all_investigadores_paginated(&state, window.label(), page, limit).await?;
    Ok(PaginatedResult {
        items: result.items.into_iter().map(Into::into).collect(),
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
    })
}

#[tauri::command]
pub async fn buscar_investigador_por_dni(
    window: Window,
    state: State<'_, AppState>,
    dni: String,
) -> Result<Option<InvestigadorDto>, AppError> {
    let item = handlers::buscar_investigador_por_dni(&state, window.label(), &dni).await?;
    Ok(item.map(Into::into))
}

#[tauri::command]
pub async fn get_all_investigadores_con_proyectos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<InvestigadorDetalleDto>, AppError> {
    handlers::get_all_investigadores_con_proyectos(&state, window.label()).await
}

#[tauri::command]
pub async fn eliminar_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<EliminarInvestigadorResultadoDto, AppError> {
    handlers::eliminar_investigador(&state, window.label(), &id_investigador).await
}

#[tauri::command]
pub async fn reactivar_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<InvestigadorDto, AppError> {
    let item = handlers::reactivar_investigador(&state, window.label(), &id_investigador).await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn actualizar_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
    request: UpdateInvestigadorRequest,
) -> Result<InvestigadorDto, AppError> {
    let item = handlers::actualizar_investigador(&state, window.label(), &id_investigador, request)
        .await?;
    Ok(item.into())
}

#[tauri::command]
pub async fn consultar_dni_reniec(
    window: Window,
    state: State<'_, AppState>,
    numero: String,
) -> Result<ReniecDniLookupResult, AppError> {
    rbac::require_investigadores_manage_permission(&state, window.label()).await?;

    if let Some(cached) = state.reniec_cache.get(&numero).await {
        return Ok(cached);
    }

    let result = reniec_client::consultar_dni(state.reniec_config(), &numero).await?;
    state.reniec_cache.put(&numero, result.clone()).await;
    Ok(result)
}

#[tauri::command]
pub async fn consultar_renacyt_investigador(
    window: Window,
    state: State<'_, AppState>,
    codigo_o_id: String,
) -> Result<RenacytLookupResult, AppError> {
    rbac::require_investigadores_manage_permission(&state, window.label()).await?;
    renacyt_client::consultar_investigador(state.renacyt_config(), &codigo_o_id).await
}

#[tauri::command]
pub async fn buscar_investigador_por_dni_con_renacyt(
    window: Window,
    state: State<'_, AppState>,
    dni: String,
) -> Result<Option<RenacytLookupResult>, AppError> {
    if rbac::require_permission(
        &state,
        window.label(),
        rbac::AppPermission::InvestigadoresView,
    )
    .await
    .is_err()
    {
        rbac::require_permission(
            &state,
            window.label(),
            rbac::AppPermission::InvestigadoresManage,
        )
        .await?;
    }

    let config = state.renacyt_config();
    let encontrado = renacyt_client::buscar_por_dni(config, &dni).await?;
    match encontrado {
        Some(item) => {
            let lookup =
                renacyt_client::consultar_investigador(config, &item.codigo_registro).await?;
            Ok(Some(lookup))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn refrescar_formacion_academica_renacyt_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<RefreshInvestigadorRenacytFormacionResultadoDto, AppError> {
    handlers::refrescar_formacion_academica_renacyt_investigador(
        &state,
        window.label(),
        &id_investigador,
    )
    .await
}
