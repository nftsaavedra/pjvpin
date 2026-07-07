use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::investigadores::models::Investigador;
use crate::reportes::entity_reports::ReporteDocenteIntegral;
use crate::shared::error::AppError;

// ═══════════════════════════════════════════════════════════════════════════════
// Reportes Docentes Integral (todos los activos)
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn build_reportes_docentes_integral(
    db: &Database,
) -> Result<Vec<ReporteDocenteIntegral>, AppError> {
    let docentes = db
        .collection::<Investigador>("docentes")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let mut reportes = Vec::with_capacity(docentes.len());
    for docente in docentes {
        let reporte =
            super::repository_docente::build_reporte_docente_integral(db, &docente.id_docente)
                .await?;
        reportes.push(reporte);
    }

    Ok(reportes)
}
