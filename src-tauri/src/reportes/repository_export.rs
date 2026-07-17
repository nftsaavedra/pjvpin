use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::investigadores::models::Investigador;
use crate::reportes::dto::ReporteInvestigadorIntegral;
use crate::shared::error::AppError;

// ═══════════════════════════════════════════════════════════════════════════════
// Reportes Investigadores Integral (todos los activos)
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn build_reportes_investigadores_integral(
    db: &Database,
) -> Result<Vec<ReporteInvestigadorIntegral>, AppError> {
    let investigadores: Vec<Investigador> =
        crate::investigadores::repository::get_all_investigadores(db).await?;

    let mut reportes = Vec::with_capacity(investigadores.len());
    for investigador in investigadores {
        let reporte = super::repository_investigador::build_reporte_investigador_integral(
            db,
            &investigador.id_investigador,
        )
        .await?;
        reportes.push(reporte);
    }

    Ok(reportes)
}
