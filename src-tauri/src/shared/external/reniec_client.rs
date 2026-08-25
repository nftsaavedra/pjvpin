use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};

use crate::investigadores::dto::ReniecDniLookupResult;
use crate::shared::dni::Dni;
use crate::shared::error::{sanitize_external_detail, AppError};
use crate::shared::tokens::TokenResolver;

/// Wire format de la respuesta de decolecta al endpoint `/reniec/dni`.
/// Verificado contra `https://api.decolecta.com/v1/reniec/dni?numero=...`
/// (5 campos en snake_case en inglés). Si la API cambia su shape,
/// actualizar este struct y el `From` correspondiente; el contrato
/// IPC con el frontend vive en `ReniecDniLookupResult` (camelCase).
#[derive(Debug, serde::Deserialize)]
struct DecolectaDniResponse {
    first_name: String,
    first_last_name: String,
    second_last_name: String,
    full_name: String,
    document_number: String,
}

impl From<DecolectaDniResponse> for ReniecDniLookupResult {
    fn from(r: DecolectaDniResponse) -> Self {
        Self {
            first_name: r.first_name,
            first_last_name: r.first_last_name,
            second_last_name: r.second_last_name,
            full_name: r.full_name,
            document_number: r.document_number,
        }
    }
}

pub async fn consultar_dni(
    tokens: &TokenResolver,
    api_base_url: &str,
    numero: &str,
) -> Result<ReniecDniLookupResult, AppError> {
    let token = tokens.resolve_reniec_token()?;
    consultar_dni_anon(token, api_base_url, numero).await
}

/// Variante anonima para callers que no tienen un `TokenResolver` armado
/// (ej. seed de investigadores en lib.rs::setup, donde la AppState aun
/// no esta construida). Equivalente a `consultar_dni` pero recibe el
/// token RENIEC directamente.
pub async fn consultar_dni_anon(
    token: &str,
    api_base_url: &str,
    numero: &str,
) -> Result<ReniecDniLookupResult, AppError> {
    let numero_limpio = Dni::new(numero)
        .map_err(|_| {
            AppError::ExternalServiceError(
                "El DNI debe tener exactamente 8 dígitos numéricos.".to_string(),
            )
        })?
        .into_string();

    let endpoint = format!("{}/reniec/dni", api_base_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let response = client
        .get(endpoint)
        .query(&[("numero", &numero_limpio)])
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .await?;

    let status = response.status();
    let body = response.text().await?;

    if status.is_success() {
        let parsed: DecolectaDniResponse = serde_json::from_str(&body).map_err(|e| {
            AppError::ExternalServiceError(format!(
                "La respuesta de RENIEC no coincide con el formato esperado: {} — Respuesta: {}",
                e,
                sanitize_external_detail(&body)
            ))
        })?;
        return Ok(parsed.into());
    }

    if status.as_u16() == 400 || status.as_u16() == 404 {
        return Err(AppError::ExternalServiceError(
            "No se encontraron datos válidos para el DNI consultado en RENIEC.".to_string(),
        ));
    }

    let safe_detalle = sanitize_external_detail(&body);
    Err(AppError::ExternalServiceError(format!(
        "La consulta RENIEC no pudo completarse en este momento ({status}). {safe_detalle}"
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const FIXTURE_BODY: &str = r#"{"first_name":"JUAN","first_last_name":"PEREZ","second_last_name":"GARCIA","full_name":"PEREZ GARCIA JUAN","document_number":"12345678"}"#;

    #[test]
    fn decolecta_response_deserializes_and_maps_to_dto() {
        let parsed: DecolectaDniResponse =
            serde_json::from_str(FIXTURE_BODY).expect("fixture snake_case debe deserializar");
        let dto: ReniecDniLookupResult = parsed.into();
        assert_eq!(dto.first_name, "JUAN");
        assert_eq!(dto.first_last_name, "PEREZ");
        assert_eq!(dto.second_last_name, "GARCIA");
        assert_eq!(dto.full_name, "PEREZ GARCIA JUAN");
        assert_eq!(dto.document_number, "12345678");
    }

    #[test]
    fn dto_serializes_to_camel_case_for_frontend_ipc_contract() {
        let dto = ReniecDniLookupResult {
            first_name: "JUAN".into(),
            first_last_name: "PEREZ".into(),
            second_last_name: "GARCIA".into(),
            full_name: "PEREZ GARCIA JUAN".into(),
            document_number: "12345678".into(),
        };
        let serialized = serde_json::to_value(&dto).expect("serializar DTO");
        assert_eq!(
            serialized,
            json!({
                "firstName": "JUAN",
                "firstLastName": "PEREZ",
                "secondLastName": "GARCIA",
                "fullName": "PEREZ GARCIA JUAN",
                "documentNumber": "12345678"
            })
        );
    }

    #[test]
    fn decolecta_response_rejects_camel_case_shape() {
        let camel = r#"{"firstName":"JUAN","firstLastName":"PEREZ","secondLastName":"GARCIA","fullName":"X","documentNumber":"12345678"}"#;
        let result: Result<DecolectaDniResponse, _> = serde_json::from_str(camel);
        assert!(
            result.is_err(),
            "DecolectaDniResponse no debe aceptar camelCase (protege el wire format)"
        );
    }

    #[test]
    fn sanitize_external_detail_redacts_secrets_in_body_excerpt() {
        // El redactor esta calibrado para formato env-var/texto plano
        // (key=value, key: value), no para valores JSON entre comillas.
        let body = "PJVPIN_RENIEC_TOKEN=abc123secret";
        let safe = sanitize_external_detail(body);
        assert!(
            safe.contains("[REDACTED]"),
            "secrets deben aparecer como [REDACTED]: {safe}"
        );
        assert!(
            !safe.contains("abc123secret"),
            "el valor del secret no debe filtrarse: {safe}"
        );
    }
}
