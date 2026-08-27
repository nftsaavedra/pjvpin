use tauri::{State, Window};

use super::handlers;
use super::import::{
    get_plantilla_dnis_default, importar_investigadores_por_dnis, ImportInvestigadoresRequest,
    ImportInvestigadoresResult,
};
use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto, InvestigadorDetalleDto,
    InvestigadorDto, RefreshInvestigadorRenacytFormacionResultadoDto,
    RefreshMasivoRenacytResultadoDto, RenacytLookupResult, ReniecDniLookupResult,
    UpdateInvestigadorRequest,
};
use crate::investigadores::kardex::KardexEntry;
use crate::shared::dni::Dni;
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

    let dni = Dni::new(&numero)?.into_string();
    if let Some(cached) = state.reniec_cache.get(&dni).await {
        return Ok(cached);
    }

    let result =
        reniec_client::consultar_dni(&state.tokens, &state.reniec.api_base_url, &dni).await?;
    state.reniec_cache.put(&dni, result.clone()).await;
    Ok(result)
}

#[tauri::command]
pub async fn consultar_renacyt_investigador(
    window: Window,
    state: State<'_, AppState>,
    codigo_o_id: String,
) -> Result<RenacytLookupResult, AppError> {
    rbac::require_investigadores_manage_permission(&state, window.label()).await?;
    renacyt_client::consultar_investigador(&state.renacyt, &codigo_o_id).await
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

    let dni = Dni::new(&dni)?.into_string();
    let config = &state.renacyt;
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

#[tauri::command]
pub async fn descargar_constancia_renacyt_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<u8>, AppError> {
    handlers::descargar_constancia_renacyt_investigador(&state, window.label(), &id_investigador)
        .await
}

/// Importa investigadores por DNI con enriquecimiento multi-fuente
/// (RENIEC -> PeruCRIS -> Pure -> RENACYT). Reemplaza el seed automatico
/// que corria en cada arranque.
///
/// RBAC: `InvestigadoresManage` (mismo nivel que el CRUD).
#[tauri::command]
pub async fn importar_investigadores(
    window: Window,
    state: State<'_, AppState>,
    request: ImportInvestigadoresRequest,
) -> Result<ImportInvestigadoresResult, AppError> {
    let actor = rbac::require_permission(
        &state,
        window.label(),
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let result = importar_investigadores_por_dnis(&state, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.import",
        "investigador",
        "",
        format!(
            "ok total={} importados={} omitidos_dup={} omitidos_sin_reniec={} perucris_enlazados={} pure_enlazados={} renacyt_encontrados={} errores={}",
            result.total_evaluados,
            result.importados,
            result.omitidos_duplicado,
            result.omitidos_sin_reniec,
            result.perucris_enlazados,
            result.pure_enlazados,
            result.renacyt_encontrados,
            result.errores.len()
        ),
    );
    Ok(result)
}

/// Devuelve la lista de DNIs precargados en la plantilla embebida
/// (los 55 docentes UNF provistos por el usuario). Pensado para alimentar
/// el modal de importacion con un click.
///
/// RBAC: `InvestigadoresView` (cualquier rol con acceso a investigadores
/// puede ver la plantilla propuesta; el import en si requiere Manage).
#[tauri::command]
pub async fn get_plantilla_investigadores_default(
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    rbac::require_permission(
        &state,
        window.label(),
        rbac::AppPermission::InvestigadoresView,
    )
    .await?;
    get_plantilla_dnis_default()
}

/// Lista el kardex RENACYT completo de un investigador.
/// RBAC: `InvestigadoresView` (cualquier rol con acceso a la ficha
/// puede ver el historial de cambios).
#[tauri::command]
pub async fn get_kardex_investigador(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<Vec<KardexEntry>, AppError> {
    handlers::get_kardex_investigador(&state, window.label(), &id_investigador).await
}

/// Marca el kardex RENACYT del investigador como revisado.
/// RBAC: `InvestigadoresView`.
#[tauri::command]
pub async fn marcar_cambios_renacyt_revisados(
    window: Window,
    state: State<'_, AppState>,
    id_investigador: String,
) -> Result<InvestigadorDto, AppError> {
    handlers::marcar_cambios_renacyt_revisados(&state, window.label(), &id_investigador).await
}

/// Refresh RENACYT en lote sobre todos los investigadores activos con
/// vinculo RENACYT.
/// RBAC: `InvestigadoresManage`.
#[tauri::command]
pub async fn refrescar_renacyt_todos(
    window: Window,
    state: State<'_, AppState>,
) -> Result<RefreshMasivoRenacytResultadoDto, AppError> {
    handlers::refrescar_renacyt_todos(&state, window.label()).await
}
