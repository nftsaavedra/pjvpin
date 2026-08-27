use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto, InvestigadorDetalleDto,
    RefreshInvestigadorRenacytFormacionResultadoDto, RefreshMasivoRenacytResultadoDto,
    UpdateInvestigadorRequest,
};
use crate::investigadores::kardex;
use crate::investigadores::models::Investigador;
use crate::investigadores::repository;
use crate::personas::repository as personas_repo;
use crate::shared::error::AppError;
use crate::shared::external::renacyt_client;
use crate::shared::pagination::PaginatedResult;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn crear_investigador(
    state: &AppState,
    window_label: &str,
    request: CreateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let investigador = repository::create_investigador(state.mongo_db()?, request).await?;
    let db = state.mongo_db()?;
    let persona = personas_repo::find_by_id_persona(db, &investigador.persona_id).await?;
    let (dni_audit, nombre_audit) = match persona {
        Some(ref p) => (p.dni.clone(), p.nombre_completo.clone()),
        None => (String::new(), String::new()),
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.create",
        "investigador",
        &dni_audit,
        nombre_audit,
    );
    Ok(investigador)
}

pub async fn get_all_investigadores(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<Investigador>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_all_investigadores(state.mongo_db()?).await
}

pub async fn get_all_investigadores_paginated(
    state: &AppState,
    window_label: &str,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Investigador>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_all_investigadores_paginated(state.mongo_db()?, page, limit).await
}

pub async fn buscar_investigador_por_dni(
    state: &AppState,
    window_label: &str,
    dni: &str,
) -> Result<Option<Investigador>, AppError> {
    rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    repository::get_investigador_by_dni(state.mongo_db()?, dni).await
}

pub async fn get_all_investigadores_con_proyectos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<InvestigadorDetalleDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    repository::get_all_investigadores_con_proyectos(state.mongo_db()?).await
}

pub async fn eliminar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<EliminarInvestigadorResultadoDto, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let result = repository::delete_investigador(state.mongo_db()?, id_investigador).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.delete",
        "investigador",
        id_investigador,
        result.accion.clone(),
    );
    Ok(result)
}

pub async fn reactivar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Investigador, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let investigador =
        repository::reactivar_investigador(state.mongo_db()?, id_investigador).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.reactivate",
        "investigador",
        id_investigador,
        "activo=1".to_string(),
    );
    Ok(investigador)
}

pub async fn actualizar_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
    request: UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;
    let investigador =
        repository::update_investigador(state.mongo_db()?, id_investigador, &request).await?;
    let db = state.mongo_db()?;
    let dni_audit = crate::personas::repository::find_by_id_persona(db, &investigador.persona_id)
        .await?
        .map(|p| p.dni)
        .unwrap_or_default();
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.update",
        "investigador",
        id_investigador,
        format!("dni: {dni_audit}"),
    );
    Ok(investigador)
}

pub async fn refrescar_formacion_academica_renacyt_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<RefreshInvestigadorRenacytFormacionResultadoDto, AppError> {
    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;

    // Antes vivia en service.rs como `refresh_renacyt_formacion`. Se mueve a
    // handlers porque es orquestacion de negocio (RENACYT sync + persistencia +
    // respuesta), no logica de dominio reusable.
    let db = state.mongo_db()?;
    let mut investigador = repository::get_investigador_by_id(db, id_investigador).await?;
    let codigo_o_id = investigador
        .renacyt_id_investigador
        .clone()
        .or_else(|| investigador.renacyt_codigo_registro.clone())
        .ok_or_else(|| {
            AppError::ExternalServiceError(
                "El investigador no tiene un vínculo RENACYT para refrescar su formación académica."
                    .to_string(),
            )
        })?;
    let tenia_formaciones = investigador
        .renacyt_formaciones_academicas_json
        .as_ref()
        .is_some_and(|value| !value.trim().is_empty());
    let lookup = renacyt_client::consultar_investigador(&state.renacyt, &codigo_o_id).await?;
    // Kardex RENACYT: capturar diff contra el estado pre-apply para
    // trazabilidad. Si hay cambios (clasificatorios o no) se inserta
    // una entrada. Si nada cambia, `diff_renacyt` devuelve `None` y no
    // escribimos nada. La mutacion via `apply_renacyt_refresh` ocurre
    // DESPUES — el kardex queda con el snapshot anterior.
    if let Some(kardex_entry) = kardex::diff_renacyt(
        &investigador,
        &lookup,
        kardex::KardexDisparador::RefreshIndividual,
    ) {
        kardex::insert(db, &kardex_entry).await?;
    }
    let actualizada = investigador.apply_renacyt_refresh(lookup);
    repository::update_investigador_renacyt(db, &investigador).await?;
    let investigador_detalle =
        repository::get_investigador_detalle_by_id(db, id_investigador).await?;
    let accion = if actualizada {
        "renacyt.refresh.updated"
    } else {
        "renacyt.refresh.no_change"
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        accion,
        "investigador",
        id_investigador,
        format!("codigo_o_id: {codigo_o_id}, tenia_formaciones: {tenia_formaciones}"),
    );
    let mensaje = if actualizada {
        "Formación académica RENACYT actualizada correctamente.".to_string()
    } else if tenia_formaciones {
        "RENACYT no devolvió nueva formación académica en esta sincronización. Se mantuvo la información registrada.".to_string()
    } else {
        "RENACYT no devolvió formación académica disponible para este investigador en esta sincronización.".to_string()
    };
    Ok(RefreshInvestigadorRenacytFormacionResultadoDto {
        investigador: investigador_detalle,
        actualizada,
        mensaje,
    })
}

/// Descarga el PDF "Constancia Reporte de Actividad" emitido por RENACYT para
/// el investigador identificado por `id_investigador`. El permiso requerido es
/// `InvestigadoresView` (mismo nivel que abrir la ficha pública RENACYT).
pub async fn descargar_constancia_renacyt_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<u8>, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView)
            .await?;

    let db = state.mongo_db()?;
    let investigador = repository::get_investigador_by_id(db, id_investigador).await?;
    let codigo_registro = investigador
        .renacyt_codigo_registro
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::ExternalServiceError(
                "El investigador no tiene un código RENACYT vinculado.".to_string(),
            )
        })?
        .to_string();

    let bytes =
        renacyt_client::descargar_constancia_reporte_actividad(&state.renacyt, &codigo_registro)
            .await?;

    let persona = personas_repo::find_by_id_persona(db, &investigador.persona_id).await?;
    let (dni_audit, nombre_audit) = match persona {
        Some(ref p) => (p.dni.clone(), p.nombre_completo.clone()),
        None => (String::new(), String::new()),
    };
    crate::shared::audit::write_generic_audit(
        &actor,
        "investigador.constancia_renacyt",
        "investigador",
        &dni_audit,
        format!(
            "{nombre_audit}; codigo_registro: {codigo_registro}; bytes: {}",
            bytes.len()
        ),
    );

    Ok(bytes)
}

/// Lista el kardex RENACYT completo de un investigador (todas las
/// entradas, ordenadas mas recientes primero). El frontend proyecta los
/// cambios en el timeline de la ficha.
///
/// RBAC: `InvestigadoresView` (cualquier rol con acceso a la ficha
/// puede ver el historial de cambios).
pub async fn get_kardex_investigador(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<Vec<kardex::KardexEntry>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    let db = state.mongo_db()?;
    // Sin limite: el panel del kardex necesita todas las entradas
    // (el frontend pagina). Si en el futuro el volumen crece, aqui
    // se aplica paginacion.
    kardex::list_by_investigador(db, id_investigador, i64::MAX).await
}

/// Marca el kardex RENACYT del investigador como revisado. No requiere
/// `Manage` (cualquier usuario con acceso a la ficha puede confirmar
/// que vio los cambios).
///
/// RBAC: `InvestigadoresView`.
pub async fn marcar_cambios_renacyt_revisados(
    state: &AppState,
    window_label: &str,
    id_investigador: &str,
) -> Result<crate::investigadores::dto::InvestigadorDto, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::InvestigadoresView).await?;
    let db = state.mongo_db()?;
    let mut investigador = repository::get_investigador_by_id(db, id_investigador).await?;
    investigador.marcar_cambios_revisados();
    repository::persist_marcador_revisados(db, &investigador).await?;
    Ok(investigador.into())
}

/// Refresh RENACYT en lote sobre todos los investigadores activos con
/// vinculo RENACYT. Para cada uno: consulta el lookup, genera kardex
/// si hay cambios, aplica el refresh y persiste. Concurrencia 5 (mismo
/// limite que `import.rs::IMPORT_CONCURRENCY`).
///
/// RBAC: `InvestigadoresManage` (operacion bulk con costo de API).
///
/// Decision: usamos `KardexDisparador::ImportacionLote` para los kardex
/// generados aqui. Razon: el disparador refleja el origen logico (un
/// lote de refreshes automaticos originado desde el tab Import /
/// Investigadores). `RefreshMasivo` queda reservado para flujos que
/// disparen explicitamente el boton "Refrescar todos" en la ficha, si
/// en el futuro se agrega.
pub async fn refrescar_renacyt_todos(
    state: &AppState,
    window_label: &str,
) -> Result<RefreshMasivoRenacytResultadoDto, AppError> {
    use futures_util::stream::{self, StreamExt};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    let actor = rbac::require_permission(
        state,
        window_label,
        rbac::AppPermission::InvestigadoresManage,
    )
    .await?;

    const REFRESH_CONCURRENCY: usize = 5;
    const MAX_ERRORES_DETALLE: usize = 20;

    let db = state.mongo_db()?;
    let activos = repository::list_all_with_renacyt_vinculo(db).await?;
    let procesados_total = activos.len();

    let renacyt_cfg = Arc::new(state.renacyt.clone());
    let procesados = Arc::new(AtomicUsize::new(0));
    let errores = Arc::new(AtomicUsize::new(0));
    let kardex_generados = Arc::new(AtomicUsize::new(0));
    let errores_detalle: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));

    stream::iter(activos)
        .for_each_concurrent(REFRESH_CONCURRENCY, |investigador| {
            let db = db.clone();
            let renacyt_cfg = renacyt_cfg.clone();
            let procesados = procesados.clone();
            let errores = errores.clone();
            let kardex_generados = kardex_generados.clone();
            let errores_detalle = errores_detalle.clone();
            async move {
                match refrescar_uno(&db, &renacyt_cfg, &investigador).await {
                    Ok(kardex_insertado) => {
                        procesados.fetch_add(1, Ordering::Relaxed);
                        if kardex_insertado {
                            kardex_generados.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                    Err(err) => {
                        errores.fetch_add(1, Ordering::Relaxed);
                        let mut guard = match errores_detalle.lock() {
                            Ok(g) => g,
                            Err(poisoned) => poisoned.into_inner(),
                        };
                        if guard.len() < MAX_ERRORES_DETALLE {
                            guard.push(format!("{}: {}", investigador.id_investigador, err));
                        }
                    }
                }
            }
        })
        .await;

    let kardex_count = kardex_generados.load(Ordering::Relaxed);
    let proc_count = procesados.load(Ordering::Relaxed);
    let err_count = errores.load(Ordering::Relaxed);

    let errores_detalle = match Arc::try_unwrap(errores_detalle) {
        Ok(mutex) => mutex.into_inner().unwrap_or_default(),
        Err(arc) => arc.lock().map(|g| g.clone()).unwrap_or_default(),
    };

    crate::shared::audit::write_generic_audit(
        &actor,
        "renacyt.refresh.batch",
        "investigador",
        "",
        format!(
            "evaluados: {procesados_total} ok: {proc_count} errores: {err_count} kardex: {kardex_count}"
        ),
    );

    let mensaje = if err_count == 0 {
        format!(
            "Refresh RENACYT completado: {proc_count} investigadores actualizados, {kardex_count} entradas de kardex generadas."
        )
    } else {
        format!(
            "Refresh RENACYT completado con {err_count} errores. Kardex generadas: {kardex_count}. Revisar detalles."
        )
    };

    Ok(RefreshMasivoRenacytResultadoDto {
        procesados: proc_count,
        errores: err_count,
        kardex_generados: kardex_count,
        errores_detalle,
        mensaje,
    })
}

/// Refresh RENACYT de un solo investigador dentro del flujo masivo.
/// Helper privado para mantener `refrescar_renacyt_todos` legible.
/// Retorna `Ok(true)` si se inserto una entrada de kardex (hubo
/// cambios), `Ok(false)` si el refresh no produjo cambios, `Err(_)` si
/// fallo algo bloqueante (RENACYT 5xx, sin vinculo, etc).
async fn refrescar_uno(
    db: &mongodb::Database,
    renacyt_cfg: &crate::shared::config::RenacytConfig,
    investigador: &Investigador,
) -> Result<bool, AppError> {
    let codigo_o_id = investigador
        .renacyt_id_investigador
        .as_deref()
        .or(investigador.renacyt_codigo_registro.as_deref())
        .ok_or_else(|| {
            AppError::ExternalServiceError(
                "Investigador sin vinculo RENACYT (codigo y id vacios).".to_string(),
            )
        })?
        .to_string();

    let lookup = renacyt_client::consultar_investigador(renacyt_cfg, &codigo_o_id).await?;

    // Kardex: capturar diff contra el estado pre-apply. Si nada cambia
    // el diff devuelve None y no escribimos nada en `renacyt_kardex`.
    let kardex_insertado = if let Some(kardex_entry) = kardex::diff_renacyt(
        investigador,
        &lookup,
        kardex::KardexDisparador::RefreshMasivo,
    ) {
        kardex::insert(db, &kardex_entry).await?;
        true
    } else {
        false
    };

    // Aplicar el refresh + persistir (incluso si no hubo cambios, para
    // refrescar `renacyt_fecha_ultima_sincronizacion`).
    let mut investigador_mut = investigador.clone();
    investigador_mut.apply_renacyt_refresh(lookup);
    repository::update_investigador_renacyt(db, &investigador_mut).await?;

    Ok(kardex_insertado)
}
