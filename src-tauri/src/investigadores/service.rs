use crate::investigadores::models::{
    CreateInvestigadorRequest, EliminarInvestigadorResultado, Investigador, InvestigadorDetalle,
    RefreshInvestigadorRenacytFormacionResultado,
};
use crate::investigadores::repository;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::state::AppState;

pub fn build_delete_result(has_related_projects: bool) -> EliminarInvestigadorResultado {
    if has_related_projects {
        return EliminarInvestigadorResultado {
            accion: "desactivado".to_string(),
            mensaje:
                "Investigador desactivado. Mantiene trazabilidad porque tiene proyectos relacionados."
                    .to_string(),
        };
    }

    EliminarInvestigadorResultado {
        accion: "desactivado".to_string(),
        mensaje: "Investigador desactivado correctamente.".to_string(),
    }
}

pub async fn create(
    state: &AppState,
    request: CreateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let db = state.mongo_db()?;
    repository::create_investigador(db, request).await
}

pub async fn get_all(state: &AppState) -> Result<Vec<Investigador>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_investigadores(db).await
}

pub async fn get_all_paginated(
    state: &AppState,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Investigador>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_investigadores_paginated(db, page, limit).await
}

pub async fn find_by_dni(state: &AppState, dni: &str) -> Result<Option<Investigador>, AppError> {
    let db = state.mongo_db()?;
    repository::get_investigador_by_dni(db, dni).await
}

pub async fn get_all_detalle(state: &AppState) -> Result<Vec<InvestigadorDetalle>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_investigadores_con_proyectos(db).await
}

pub async fn delete(
    state: &AppState,
    id_investigador: &str,
) -> Result<EliminarInvestigadorResultado, AppError> {
    let db = state.mongo_db()?;
    repository::delete_investigador(db, id_investigador).await
}

pub async fn reactivate(state: &AppState, id_investigador: &str) -> Result<Investigador, AppError> {
    let db = state.mongo_db()?;
    repository::reactivar_investigador(db, id_investigador).await
}

pub async fn get_by_id(state: &AppState, id_investigador: &str) -> Result<Investigador, AppError> {
    let db = state.mongo_db()?;
    repository::get_investigador_by_id(db, id_investigador).await
}

pub async fn update_renacyt(state: &AppState, investigador: &Investigador) -> Result<(), AppError> {
    let db = state.mongo_db()?;
    repository::update_investigador_renacyt(db, investigador).await
}

pub async fn get_detalle_by_id(
    state: &AppState,
    id_investigador: &str,
) -> Result<InvestigadorDetalle, AppError> {
    let db = state.mongo_db()?;
    repository::get_investigador_detalle_by_id(db, id_investigador).await
}

pub async fn refresh_renacyt_formacion(
    state: &AppState,
    id_investigador: &str,
) -> Result<RefreshInvestigadorRenacytFormacionResultado, AppError> {
    let mut investigador = get_by_id(state, id_investigador).await?;
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
    let lookup = crate::shared::external::renacyt_client::consultar_investigador(
        state.renacyt_config(),
        &codigo_o_id,
    )
    .await?;
    let actualizada = investigador.apply_renacyt_refresh(lookup);
    update_renacyt(state, &investigador).await?;
    let investigador_detalle = get_detalle_by_id(state, id_investigador).await?;
    let mensaje = if actualizada {
        "Formación académica RENACYT actualizada correctamente.".to_string()
    } else if tenia_formaciones {
        "RENACYT no devolvió nueva formación académica en esta sincronización. Se mantuvo la información registrada.".to_string()
    } else {
        "RENACYT no devolvió formación académica disponible para este investigador en esta sincronización.".to_string()
    };
    Ok(RefreshInvestigadorRenacytFormacionResultado {
        investigador: investigador_detalle,
        actualizada,
        mensaje,
    })
}

pub async fn update(
    state: &AppState,
    id_investigador: &str,
    request: crate::investigadores::models::UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let db = state.mongo_db()?;
    repository::update_investigador(db, id_investigador, &request).await
}
