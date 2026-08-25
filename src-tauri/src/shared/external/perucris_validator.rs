//! Cliente HTTP publico de PeruCRIS (HAL root) para validacion de
//! sincronizacion. NO requiere api-key; los endpoints de solo lectura
//! del HAL son publicos.
//!
//! Endpoints consumidos:
//!  - GET /discover/search/objects?query={q}&dsoType=ITEM&size={n}
//!  - GET /dso/find?uuid={uuid}
//!  - GET /pid/find?id={handle}   (302 -> core/items/{uuid}, seguir redirect)
//!
//! NO se usa para el push (eso va por `perucris_client.rs` + api-key).

use std::collections::HashMap;

use serde::Deserialize;

use crate::shared::defaults::PERUCRIS_PUBLIC_API_BASE_URL;
use crate::shared::error::{sanitize_external_detail, AppError};

/// Timeout HTTP para llamadas al HAL publico (15s; el endpoint es
/// razonablemente rapido salvo bajo carga).
const HTTP_TIMEOUT_SECS: u64 = 15;

/// User-Agent honesto que identifica a PJVPIN ante los logs de PeruCRIS.
const USER_AGENT: &str = "PJVPIN-Validator/0.1 (+https://investigacion.unf.edu.pe)";

// ─── Tipos del HAL publico (serde Deserialize) ───────────────────────────────

/// Un item "indexable" en el search del HAL publico.
#[derive(Debug, Deserialize, Clone)]
pub struct PeruCrisHit {
    pub uuid: String,
    #[serde(default)]
    pub handle: Option<String>,
    #[serde(rename = "lastModified", default)]
    pub last_modified: Option<String>,
    #[serde(default, rename = "name")]
    #[allow(dead_code)] // field kept for future use (e.g., debug logs)
    pub name: Option<String>,
    #[serde(default)]
    pub metadata: PeruCrisMetadata,
}

/// `metadata` es un map de `key -> Vec<{value, language, authority, ...}>`.
#[derive(Debug, Deserialize, Default, Clone)]
pub struct PeruCrisMetadata(pub HashMap<String, Vec<PeruCrisFieldValue>>);

impl PeruCrisMetadata {
    /// Primer valor del campo `key`, o None si el campo no existe o esta vacio.
    pub fn first_value(&self, key: &str) -> Option<String> {
        self.0
            .get(key)
            .and_then(|v| v.first())
            .map(|f| f.value.trim().to_string())
            .filter(|s| !s.is_empty())
    }

    /// Tipo de entidad (campo `dspace.entity.type[0].value`).
    pub fn entity_type(&self) -> Option<String> {
        self.first_value("dspace.entity.type")
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct PeruCrisFieldValue {
    pub value: String,
    #[serde(default)]
    #[allow(dead_code)]
    pub language: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub authority: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub confidence: Option<i32>,
    #[serde(default)]
    #[allow(dead_code)]
    pub place: Option<i32>,
}

// ─── Tipos internos para parsear la respuesta del search ─────────────────────

#[derive(Debug, Deserialize)]
struct SearchResponse {
    #[serde(rename = "_embedded")]
    _embedded: SearchEmbedded,
}

#[derive(Debug, Deserialize)]
struct SearchEmbedded {
    #[serde(rename = "searchResult")]
    search_result: SearchResultEmbedded,
}

#[derive(Debug, Deserialize)]
struct SearchResultEmbedded {
    #[serde(rename = "_embedded")]
    _embedded: SearchResultObjects,
}

#[derive(Debug, Deserialize)]
struct SearchResultObjects {
    objects: Vec<SearchObject>,
}

#[derive(Debug, Deserialize)]
struct SearchObject {
    #[serde(rename = "_embedded")]
    _embedded: IndexableObjectEmbedded,
}

#[derive(Debug, Deserialize)]
struct IndexableObjectEmbedded {
    #[serde(rename = "indexableObject")]
    indexable_object: PeruCrisHit,
}

// ─── Cliente HTTP ────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct PeruCrisPublicClient {
    base_url: String,
    http: reqwest::Client,
}

impl Default for PeruCrisPublicClient {
    fn default() -> Self {
        Self::new()
    }
}

impl PeruCrisPublicClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
            .user_agent(USER_AGENT)
            .build()
            .expect("reqwest::Client builder no debe fallar con configuracion estatica");
        Self {
            base_url: PERUCRIS_PUBLIC_API_BASE_URL.to_string(),
            http,
        }
    }

    /// GET /discover/search/objects?query={q}&dsoType=ITEM&size={n}
    pub async fn search_by_query(
        &self,
        query: &str,
        size: u32,
    ) -> Result<Vec<PeruCrisHit>, AppError> {
        let url = format!(
            "{}/discover/search/objects",
            self.base_url.trim_end_matches('/')
        );
        let response = self
            .http
            .get(&url)
            .query(&[
                ("query", query.to_string()),
                ("dsoType", "ITEM".to_string()),
                ("size", size.to_string()),
            ])
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| {
                AppError::ExternalServiceError(format!(
                    "PeruCRIS search '{}' fallo: {}",
                    query,
                    sanitize_external_detail(&e.to_string())
                ))
            })?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalServiceError(format!(
                "PeruCRIS search respondio HTTP {} para query '{}': {}",
                status,
                query,
                sanitize_external_detail(&body)
            )));
        }

        let body: SearchResponse = response.json().await.map_err(|e| {
            AppError::InternalError(format!(
                "PeruCRIS search: respuesta invalida para query '{}': {}",
                query, e
            ))
        })?;

        let hits: Vec<PeruCrisHit> = body
            ._embedded
            .search_result
            ._embedded
            .objects
            .into_iter()
            .map(|o| o._embedded.indexable_object)
            .collect();

        Ok(hits)
    }

    /// GET /dso/find?uuid={uuid}
    pub async fn find_by_uuid(&self, uuid: &str) -> Result<PeruCrisHit, AppError> {
        let url = format!("{}/dso/find", self.base_url.trim_end_matches('/'));
        let response = self
            .http
            .get(&url)
            .query(&[("uuid", uuid.to_string())])
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| {
                AppError::ExternalServiceError(format!(
                    "PeruCRIS dso/find fallo para uuid {}: {}",
                    uuid,
                    sanitize_external_detail(&e.to_string())
                ))
            })?;

        let status = response.status();
        if status.as_u16() == 404 {
            return Err(AppError::ExternalServiceError(format!(
                "PeruCRIS no contiene el UUID {}",
                uuid
            )));
        }
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalServiceError(format!(
                "PeruCRIS dso/find respondio HTTP {} para uuid {}: {}",
                status,
                uuid,
                sanitize_external_detail(&body)
            )));
        }

        response.json::<PeruCrisHit>().await.map_err(|e| {
            AppError::InternalError(format!(
                "PeruCRIS dso/find: respuesta invalida para uuid {}: {}",
                uuid, e
            ))
        })
    }

    /// GET /discover/search/objects?configuration={cfg}&scope={uuid}
    pub async fn search_by_scope(
        &self,
        configuration: &str,
        scope: &str,
        size: u32,
    ) -> Result<Vec<PeruCrisHit>, AppError> {
        let url = format!(
            "{}/discover/search/objects",
            self.base_url.trim_end_matches('/')
        );
        let response = self
            .http
            .get(&url)
            .query(&[
                ("configuration", configuration.to_string()),
                ("scope", scope.to_string()),
                ("dsoType", "ITEM".to_string()),
                ("size", size.to_string()),
            ])
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| {
                AppError::ExternalServiceError(format!(
                    "PeruCRIS search por scope fallo: {}",
                    sanitize_external_detail(&e.to_string())
                ))
            })?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalServiceError(format!(
                "PeruCRIS search por scope respondio HTTP {}: {}",
                status,
                sanitize_external_detail(&body)
            )));
        }

        let body: SearchResponse = response.json().await.map_err(|e| {
            AppError::InternalError(format!(
                "PeruCRIS search por scope: respuesta invalida: {}",
                e
            ))
        })?;

        Ok(body
            ._embedded
            .search_result
            ._embedded
            .objects
            .into_iter()
            .map(|o| o._embedded.indexable_object)
            .collect())
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_first_value_extrae_campo_simple() {
        let json = r#"{
            "uuid": "test-uuid",
            "handle": "123456789/53485",
            "metadata": {
                    "organization.identifier.ruc": [
                        {"value": "20526270364", "language": null, "authority": null, "confidence": -1, "place": 0}
                    ],
                    "dspace.entity.type": [
                        {"value": "OrgUnit", "language": null, "authority": null, "confidence": -1, "place": 0}
                    ]
                }
        }"#;
        let hit: PeruCrisHit = serde_json::from_str(json).unwrap();
        assert_eq!(hit.uuid, "test-uuid");
        assert_eq!(hit.handle.as_deref(), Some("123456789/53485"));
        assert_eq!(
            hit.metadata
                .first_value("organization.identifier.ruc")
                .as_deref(),
            Some("20526270364")
        );
        assert_eq!(hit.metadata.entity_type().as_deref(), Some("OrgUnit"));
    }

    #[test]
    fn metadata_first_value_campos_vacios_son_none() {
        let json = r#"{"uuid": "x", "metadata": {"organization.identifier.ruc": [{"value": "  ", "language": null, "authority": null, "confidence": -1, "place": 0}]}}"#;
        let hit: PeruCrisHit = serde_json::from_str(json).unwrap();
        assert_eq!(
            hit.metadata.first_value("organization.identifier.ruc"),
            None
        );
        assert_eq!(hit.metadata.first_value("campo.inexistente"), None);
    }
}
