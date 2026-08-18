//! Service del conector PeruCRIS: orquesta la exportacion CERIF (B2) y el
//! push al endpoint de ingesta (B3).

use serde::Serialize;

use crate::reportes::cerif::{self, CerifScope};
use crate::shared::error::AppError;
use crate::shared::external::perucris_client;
use crate::shared::state::AppState;
use crate::shared::time;

/// Resultado del push hacia PeruCRIS (campos snake_case, mirror TS).
#[derive(Debug, Serialize)]
pub struct PeruCrisPushResult {
    pub success: bool,
    /// Status HTTP 2xx devuelto por el servidor.
    pub http_status: Option<u16>,
    pub enviado_at: i64,
    pub total_organizaciones: usize,
    pub total_personas: usize,
    pub total_proyectos: usize,
    pub total_publicaciones: usize,
    pub total_patentes: usize,
}

impl PeruCrisPushResult {
    fn from_document(doc: &cerif::CerifDocument, http_status: u16) -> Self {
        Self {
            success: true,
            http_status: Some(http_status),
            enviado_at: time::now_ms(),
            total_organizaciones: doc.organizaciones.len(),
            total_personas: doc.personas.len(),
            total_proyectos: doc.proyectos.len(),
            total_publicaciones: doc.publicaciones.len(),
            total_patentes: doc.patentes.len(),
        }
    }
}

/// Construye el payload CERIF (todo el modelo), lo serializa a JSON y lo
/// pushea al conector. Requiere MongoDB y la configuracion de PeruCRIS
/// (URL base + api key).
pub async fn enviar_a_perucris(state: &AppState) -> Result<PeruCrisPushResult, AppError> {
    let db = state.mongo_db()?;
    let doc = cerif::build_cerif_document(db, CerifScope::Todo).await?;
    let payload = serde_json::to_value(&doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo serializar el documento CERIF a JSON: {e}"
        ))
    })?;
    let http_status =
        perucris_client::push_cerif(&state.tokens, &state.perucris_config.api_base_url, &payload)
            .await?;
    Ok(PeruCrisPushResult::from_document(&doc, http_status))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reportes::cerif::CerifDocument;

    #[test]
    fn push_result_refleja_totales_del_documento() {
        let mut doc = CerifDocument::new();
        doc.organizaciones
            .push(crate::reportes::cerif::CerifOrgUnit {
                id_org_unit: "org-1".to_string(),
                nombre: "UNFV".to_string(),
                tipo_organizacion: None,
                tipo_dependencia: None,
                naturaleza: None,
                es_publica: true,
                ruc: None,
                ror_id: None,
                isni_id: None,
                scopus_id: None,
                ubigeo_codigo: None,
                sector_institucional: None,
                tipo_educacion_superior: None,
                ciiu_codigo: None,
                parent_id: None,
                campos_ocde: Vec::new(),
            });
        let result = PeruCrisPushResult::from_document(&doc, 201);
        assert_eq!(result.total_organizaciones, 1);
        assert_eq!(result.http_status, Some(201));
        assert!(result.success);
        assert_eq!(result.total_proyectos, 0);
    }
}
