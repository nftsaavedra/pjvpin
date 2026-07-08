use crate::proyectos::models::{
    CreateProyectoConParticipantesRequest, EliminarProyectoResultado, ExportData,
    ExportDataConProjectos, ExportDataGrupo, ExportDataInvestigadorPerfil, ExportDataProyectoArea,
    ExportDataRecurso, InvestigadorProyectosCount, KpisDashboard, Proyecto, ProyectoDetalle,
    ProyectosTrendItem, RenacytDistribucionItem, UpdateProyectoConParticipantesRequest,
};
use crate::proyectos::repository;
use crate::proyectos::repository_export;
use crate::proyectos::repository_queries;
use crate::proyectos::repository_stats;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[derive(Debug, Clone)]
pub struct ProyectoParticipantesInput {
    pub titulo_proyecto: String,
    pub investigadores_ids: Vec<String>,
    pub investigador_responsable_id: Option<String>,
}

pub fn prepare_create_input(
    request: CreateProyectoConParticipantesRequest,
) -> Result<ProyectoParticipantesInput, AppError> {
    let investigadores_ids = normalize_investigador_ids(&request.investigadores_ids)?;
    if investigadores_ids.is_empty() {
        return Err(AppError::InternalError(
            "Seleccione al menos un investigador para crear el proyecto.".to_string(),
        ));
    }

    let investigador_responsable_id = normalize_responsable_id(request.investigador_responsable_id);
    validate_responsable(&investigadores_ids, &investigador_responsable_id)?;

    Ok(ProyectoParticipantesInput {
        titulo_proyecto: request.titulo_proyecto,
        investigadores_ids,
        investigador_responsable_id,
    })
}

pub fn prepare_update_input(
    request: UpdateProyectoConParticipantesRequest,
) -> Result<ProyectoParticipantesInput, AppError> {
    let investigadores_ids = normalize_investigador_ids(&request.investigadores_ids)?;
    let investigador_responsable_id = normalize_responsable_id(request.investigador_responsable_id);

    validate_responsable(&investigadores_ids, &investigador_responsable_id)?;

    Ok(ProyectoParticipantesInput {
        titulo_proyecto: request.titulo_proyecto.trim().to_string(),
        investigadores_ids,
        investigador_responsable_id,
    })
}

pub async fn create(
    state: &AppState,
    request: CreateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let db = state.mongo_db()?;
    repository::create_proyecto_con_participantes(db, request).await
}

pub async fn update(
    state: &AppState,
    id_proyecto: &str,
    request: UpdateProyectoConParticipantesRequest,
) -> Result<Proyecto, AppError> {
    let db = state.mongo_db()?;
    repository::update_proyecto_con_participantes(db, id_proyecto, request).await
}

pub async fn find_by_investigador(
    state: &AppState,
    id_investigador: &str,
) -> Result<Vec<Proyecto>, AppError> {
    let db = state.mongo_db()?;
    repository_queries::buscar_proyectos_por_investigador(db, id_investigador).await
}

pub async fn get_all_detalle(state: &AppState) -> Result<Vec<ProyectoDetalle>, AppError> {
    let db = state.mongo_db()?;
    repository_queries::get_all_proyectos_detalle(db, None).await
}

pub async fn get_all_detalle_for_responsable(
    state: &AppState,
    responsable_id: &str,
) -> Result<Vec<ProyectoDetalle>, AppError> {
    let db = state.mongo_db()?;
    repository_queries::get_all_proyectos_detalle(db, Some(responsable_id)).await
}

pub async fn delete_relation(
    state: &AppState,
    id_proyecto: &str,
    id_investigador: &str,
) -> Result<(), AppError> {
    let db = state.mongo_db()?;
    repository::eliminar_relacion_proyecto_investigador(db, id_proyecto, id_investigador).await
}

pub async fn delete_relations(state: &AppState, id_proyecto: &str) -> Result<(), AppError> {
    let db = state.mongo_db()?;
    repository::eliminar_relaciones_proyecto(db, id_proyecto).await
}

pub async fn delete(
    state: &AppState,
    id_proyecto: &str,
) -> Result<EliminarProyectoResultado, AppError> {
    let db = state.mongo_db()?;

    let _ = crate::recursos::repository::delete_patentes_by_proyecto(db, id_proyecto).await;
    let _ = crate::recursos::repository::delete_productos_by_proyecto(db, id_proyecto).await;
    let _ = crate::recursos::repository::delete_equipamientos_by_proyecto(db, id_proyecto).await;
    let _ = crate::recursos::repository::delete_financiamientos_by_proyecto(db, id_proyecto).await;

    repository::eliminar_proyecto(db, id_proyecto).await
}

pub async fn reactivate(state: &AppState, id_proyecto: &str) -> Result<Proyecto, AppError> {
    let db = state.mongo_db()?;
    repository::reactivar_proyecto(db, id_proyecto).await
}

pub async fn get_estadisticas_x_investigador(
    state: &AppState,
) -> Result<Vec<InvestigadorProyectosCount>, AppError> {
    let db = state.mongo_db()?;
    repository_stats::get_estadisticas_proyectos_x_investigador(db).await
}

pub async fn get_kpis(state: &AppState) -> Result<KpisDashboard, AppError> {
    let db = state.mongo_db()?;
    repository_stats::get_kpis_dashboard(db).await
}

pub async fn get_exportacion_plana(state: &AppState) -> Result<Vec<ExportData>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_plana(db).await
}

pub async fn get_exportacion_agrupada(
    state: &AppState,
) -> Result<Vec<ExportDataConProjectos>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_agrupada_investigador(db).await
}

pub async fn get_exportacion_grupos(state: &AppState) -> Result<Vec<ExportDataGrupo>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_grupos(db).await
}

pub async fn get_exportacion_recursos(
    state: &AppState,
) -> Result<Vec<ExportDataRecurso>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_recursos(db).await
}

pub async fn get_exportacion_investigadores_perfil(
    state: &AppState,
) -> Result<Vec<ExportDataInvestigadorPerfil>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_investigadores_perfil(db).await
}

pub async fn get_exportacion_proyectos_area(
    state: &AppState,
) -> Result<Vec<ExportDataProyectoArea>, AppError> {
    let db = state.mongo_db()?;
    repository_export::get_data_exportacion_proyectos_area(db).await
}

pub async fn get_proyectos_trend(state: &AppState) -> Result<Vec<ProyectosTrendItem>, AppError> {
    let db = state.mongo_db()?;
    repository_stats::get_proyectos_trend(db).await
}

pub async fn get_renacyt_distribucion(
    state: &AppState,
) -> Result<Vec<RenacytDistribucionItem>, AppError> {
    let db = state.mongo_db()?;
    repository_stats::get_renacyt_distribucion(db).await
}

fn normalize_investigador_ids(investigadores_ids: &[String]) -> Result<Vec<String>, AppError> {
    let mut normalized_ids = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for investigador_id in investigadores_ids {
        let normalized = investigador_id.trim();
        if normalized.is_empty() {
            return Err(AppError::InternalError(
                "La lista de investigadores contiene valores invalidos.".to_string(),
            ));
        }

        if seen.insert(normalized.to_string()) {
            normalized_ids.push(normalized.to_string());
        }
    }

    Ok(normalized_ids)
}

fn normalize_responsable_id(investigador_responsable_id: Option<String>) -> Option<String> {
    investigador_responsable_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn validate_responsable(
    investigadores_ids: &[String],
    investigador_responsable_id: &Option<String>,
) -> Result<(), AppError> {
    if investigadores_ids.is_empty() {
        if investigador_responsable_id.is_some() {
            return Err(AppError::InternalError(
                "No puede asignar un investigador responsable cuando el proyecto no tiene investigadores vinculados.".to_string(),
            ));
        }
        return Ok(());
    }

    let Some(responsable_id) = investigador_responsable_id.as_ref() else {
        return Err(AppError::InternalError(
            "Seleccione un investigador responsable para el proyecto.".to_string(),
        ));
    };

    if !investigadores_ids
        .iter()
        .any(|investigador_id| investigador_id == responsable_id)
    {
        return Err(AppError::InternalError(
            "El investigador responsable debe formar parte de los investigadores asignados al proyecto."
                .to_string(),
        ));
    }

    Ok(())
}

pub async fn get_all_paginated(
    state: &AppState,
    page: u32,
    limit: u32,
    responsable_id: Option<&str>,
) -> Result<crate::shared::pagination::PaginatedResult<Proyecto>, AppError> {
    let db = state.mongo_db()?;
    repository::get_all_proyectos_paginated(db, page, limit, responsable_id).await
}
