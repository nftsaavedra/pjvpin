use crate::reportes::dto::{ReporteInvestigadorIntegral, ReporteProyectoIntegral};
use crate::reportes::repository_export;
use crate::reportes::repository_investigador;
use crate::reportes::repository_proyecto;
use crate::shared::error::AppError;
use crate::shared::state::AppState;

pub async fn get_reporte_proyecto(
    state: &AppState,
    id_proyecto: &str,
) -> Result<ReporteProyectoIntegral, AppError> {
    let db = state.mongo_db()?;
    repository_proyecto::build_reporte_proyecto_integral(db, id_proyecto).await
}

pub async fn get_reporte_investigador(
    state: &AppState,
    id_investigador: &str,
) -> Result<ReporteInvestigadorIntegral, AppError> {
    let db = state.mongo_db()?;
    repository_investigador::build_reporte_investigador_integral(db, id_investigador).await
}

pub async fn get_reportes_investigadores(
    state: &AppState,
) -> Result<Vec<ReporteInvestigadorIntegral>, AppError> {
    let db = state.mongo_db()?;
    repository_export::build_reportes_investigadores_integral(db).await
}
