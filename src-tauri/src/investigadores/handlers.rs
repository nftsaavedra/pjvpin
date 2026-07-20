use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto, InvestigadorDetalleDto,
    RefreshInvestigadorRenacytFormacionResultadoDto, UpdateInvestigadorRequest,
};
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
