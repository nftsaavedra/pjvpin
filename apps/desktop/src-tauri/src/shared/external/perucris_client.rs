//! Cliente HTTP del conector PeruCRIS (CONCYTEC).
//!
//! # Autenticacion
//!
//! Usa el header `api-key` (misma convencion que el cliente Pure/CONCYTEC),
//! con la clave configurada en `PJVPIN_PERUCRIS_API_KEY`. Se descarta la
//! opcion `Authorization: Bearer` porque el resto de servicios CONCYTEC del
//! proyecto (Pure) ya usa `api-key` y asi la configuracion queda homogenea.
//!
//! # Endpoint
//!
//! POST `{base}/cerif/ingest` con body JSON (payload del exportador CERIF,
//! `reportes::cerif::CerifDocument`). El contrato de ingesta es el documento
//! `pjvpin/cerif-json/0.1`; CERIF XML real queda como deuda futura.
use serde_json::Value;

use crate::shared::error::{sanitize_external_detail, AppError};

/// Pushea un payload CERIF (JSON) al endpoint de ingesta de PeruCRIS.
///
/// Devuelve el codigo de status HTTP 2xx en exito. Errores 401/403 se
/// traducen a `AppError::ConfigurationError` canonico; otros fallos
/// (red/5xx/4xx) a `ExternalServiceError` con detalle sanitizado.
pub async fn push_cerif(
    tokens: &crate::shared::tokens::TokenResolver,
    api_base_url: &str,
    payload: &Value,
) -> Result<u16, AppError> {
    let api_key = tokens.resolve_perucris_api_key()?;

    let url = format!("{}/cerif/ingest", api_base_url.trim_end_matches('/'));

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("api-key", api_key)
        .header("Accept", "application/json")
        .json(payload)
        .send()
        .await
        .map_err(|e| {
            AppError::ExternalServiceError(format!(
                "PeruCRIS /cerif/ingest fallo: {}",
                sanitize_external_detail(&e.to_string())
            ))
        })?;

    let status = response.status();
    if status.is_success() {
        return Ok(status.as_u16());
    }

    let status_code = status.as_u16();
    let text: String = response.text().await.unwrap_or_default();
    let safe_text = sanitize_external_detail(&text);

    if status_code == 401 {
        return Err(AppError::ConfigurationError(
            "La api-key de PeruCRIS es invalida o expiro (HTTP 401). \
            Verifique PJVPIN_PERUCRIS_API_KEY."
                .to_string(),
        ));
    }
    if status_code == 403 {
        return Err(AppError::ConfigurationError(
            "La api-key de PeruCRIS no tiene permisos para ingestar CERIF (HTTP 403).".to_string(),
        ));
    }

    Err(AppError::ExternalServiceError(format!(
        "PeruCRIS /cerif/ingest respondio con error {status}: {safe_text}"
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::config::{
        DatabaseConfig, PeruCrisConfig, PureConfig, RenacytConfig, ReniecConfig, RuntimeConfig,
    };
    use crate::shared::tokens::TokenResolver;

    fn resolver(api_key: Option<&str>) -> TokenResolver {
        TokenResolver::from_config(&RuntimeConfig {
            database: DatabaseConfig {
                mongodb_uri: None,
                mongodb_db_name: "pjvpin".into(),
                mongodb_max_pool_size: 10,
                mongodb_min_pool_size: 1,
            },
            reniec: ReniecConfig {
                api_base_url: "https://x".into(),
                token: None,
            },
            renacyt: RenacytConfig {
                api_base_url: "https://x".into(),
                acto_version: "2021".into(),
                ficha_base_url: "https://x".into(),
            },
            pure: PureConfig {
                api_base_url: "https://x".into(),
                api_key: None,
            },
            perucris: PeruCrisConfig {
                api_base_url: "https://x".into(),
                api_key: api_key.map(str::to_string),
                ruc: None,
            },
        })
    }

    #[tokio::test]
    async fn sin_api_key_devuelve_error_canonico() {
        let r = resolver(None);
        let err = push_cerif(&r, "https://x", &serde_json::json!({})).await;
        let err = err.unwrap_err();
        match err {
            AppError::ConfigurationError(msg) => {
                assert!(msg.contains("PJVPIN_PERUCRIS_API_KEY"));
            }
            other => panic!("esperaba ConfigurationError, got {other:?}"),
        }
    }
}
