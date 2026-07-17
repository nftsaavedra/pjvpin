use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};

use crate::investigadores::dto::ReniecDniLookupResult;
use crate::shared::dni::Dni;
use crate::shared::error::{sanitize_external_detail, AppError};
use crate::shared::tokens::TokenResolver;

pub async fn consultar_dni(
    tokens: &TokenResolver,
    api_base_url: &str,
    numero: &str,
) -> Result<ReniecDniLookupResult, AppError> {
    let numero_limpio = Dni::new(numero)
        .map_err(|_| {
            AppError::ExternalServiceError(
                "El DNI debe tener exactamente 8 d\u{00ed}gitos num\u{00e9}ricos.".to_string(),
            )
        })?
        .into_string();

    let token = tokens.resolve_reniec_token()?;

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
    if status.is_success() {
        return response
            .json::<ReniecDniLookupResult>()
            .await
            .map_err(Into::into);
    }

    if status.as_u16() == 400 || status.as_u16() == 404 {
        return Err(AppError::ExternalServiceError(
            "No se encontraron datos v\u{00e1}lidos para el DNI consultado en RENIEC.".to_string(),
        ));
    }

    let detalle = response
        .text()
        .await
        .unwrap_or_else(|_| "Sin detalle adicional".to_string());
    let safe_detalle = sanitize_external_detail(&detalle);
    Err(AppError::ExternalServiceError(format!(
        "La consulta RENIEC no pudo completarse en este momento ({status}). {safe_detalle}"
    )))
}
