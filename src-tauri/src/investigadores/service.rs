use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto,
    RefreshInvestigadorRenacytFormacionResultadoDto, UpdateInvestigadorRequest,
};
use crate::investigadores::models::Investigador;
use crate::investigadores::repository;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use crate::shared::state::AppState;

pub fn build_delete_result(has_related_projects: bool) -> EliminarInvestigadorResultadoDto {
    if has_related_projects {
        return EliminarInvestigadorResultadoDto {
            accion: "desactivado".to_string(),
            mensaje:
                "Investigador desactivado. Mantiene trazabilidad porque tiene proyectos relacionados."
                    .to_string(),
        };
    }

    EliminarInvestigadorResultadoDto {
        accion: "desactivado".to_string(),
        mensaje: "Investigador desactivado correctamente.".to_string(),
    }
}

pub async fn create(
    state: &AppState,
    request: CreateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    repository::create_investigador(state.mongo_db()?, request).await
}

pub async fn get_all(state: &AppState) -> Result<Vec<Investigador>, AppError> {
    repository::get_all_investigadores(state.mongo_db()?).await
}

pub async fn get_all_paginated(
    state: &AppState,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Investigador>, AppError> {
    repository::get_all_investigadores_paginated(state.mongo_db()?, page, limit).await
}

pub async fn find_by_dni(state: &AppState, dni: &str) -> Result<Option<Investigador>, AppError> {
    repository::get_investigador_by_dni(state.mongo_db()?, dni).await
}

pub async fn get_all_detalle(
    state: &AppState,
) -> Result<Vec<crate::investigadores::dto::InvestigadorDetalleDto>, AppError> {
    repository::get_all_investigadores_con_proyectos(state.mongo_db()?).await
}

pub async fn delete(
    state: &AppState,
    id_investigador: &str,
) -> Result<EliminarInvestigadorResultadoDto, AppError> {
    repository::delete_investigador(state.mongo_db()?, id_investigador).await
}

pub async fn reactivate(state: &AppState, id_investigador: &str) -> Result<Investigador, AppError> {
    repository::reactivar_investigador(state.mongo_db()?, id_investigador).await
}

pub async fn get_by_id(state: &AppState, id_investigador: &str) -> Result<Investigador, AppError> {
    repository::get_investigador_by_id(state.mongo_db()?, id_investigador).await
}

pub async fn update_renacyt(state: &AppState, investigador: &Investigador) -> Result<(), AppError> {
    repository::update_investigador_renacyt(state.mongo_db()?, investigador).await
}

pub async fn get_detalle_by_id(
    state: &AppState,
    id_investigador: &str,
) -> Result<crate::investigadores::dto::InvestigadorDetalleDto, AppError> {
    repository::get_investigador_detalle_by_id(state.mongo_db()?, id_investigador).await
}

pub async fn refresh_renacyt_formacion(
    state: &AppState,
    id_investigador: &str,
) -> Result<RefreshInvestigadorRenacytFormacionResultadoDto, AppError> {
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
    Ok(RefreshInvestigadorRenacytFormacionResultadoDto {
        investigador: investigador_detalle,
        actualizada,
        mensaje,
    })
}

pub async fn update(
    state: &AppState,
    id_investigador: &str,
    request: UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    repository::update_investigador(state.mongo_db()?, id_investigador, &request).await
}
