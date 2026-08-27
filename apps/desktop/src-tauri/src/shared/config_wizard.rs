use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

use crate::shared::defaults;
use crate::shared::error::{format_error_chain, AppError};

const CONNECTIVITY_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WizardConfigRequest {
    pub master_password: String,
    pub mongodb_uri: String,
    pub mongodb_db: Option<String>,
    pub reniec_token: Option<String>,
    pub renacyt_base_url: Option<String>,
    pub renacyt_acto_version: Option<String>,
    pub pure_api_key: Option<String>,
    pub perucris_api_key: Option<String>,
    /// RUC de la institucion matriz. Es la llave de busqueda para el
    /// importador inicial de PeruCRIS (recon §1.4: la asociacion
    /// orgunit->publications no esta formalizada, la consulta se hace
    /// por RUC en metadata indexada). Si la institucion ya existe en
    /// `org_units`, ese RUC es la fuente de verdad y este campo se
    /// puede dejar vacio.
    pub perucris_ruc: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConnectivityResult {
    pub service: String,
    pub success: bool,
    pub message: String,
}

fn resolve_config_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("TAURI_APP_CONFIG_DIR") {
        return PathBuf::from(dir);
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        return PathBuf::from(appdata).join("com.vpin.pjvpin");
    }
    std::env::temp_dir().join("com.vpin.pjvpin")
}

pub fn get_config_path() -> PathBuf {
    resolve_config_dir().join("pjvpin.config.json")
}

pub fn save_wizard_config(
    request: WizardConfigRequest,
    user_config_path: &std::path::Path,
) -> Result<(), AppError> {
    let config_json = serde_json::json!({
        "database": {
            "mongodbUri": request.mongodb_uri,
            "mongodbDb": request.mongodb_db.unwrap_or_else(|| defaults::DEFAULT_MONGODB_DB.to_string())
        },
        "reniec": {
            "apiBaseUrl": defaults::RENIEC_API_BASE_URL,
            "token": request.reniec_token.unwrap_or_default()
        },
        "renacyt": {
            "apiBaseUrl": request.renacyt_base_url.unwrap_or_else(|| defaults::RENACYT_API_BASE_URL.to_string()),
            "actoVersion": request.renacyt_acto_version.unwrap_or_else(|| defaults::RENACYT_ACTO_VERSION.to_string()),
            "fichaBaseUrl": defaults::RENACYT_FICHA_BASE_URL
        },
        "pure": {
            "apiBaseUrl": defaults::PURE_API_BASE_URL,
            "apiKey": request.pure_api_key.unwrap_or_default()
        },
        "perucris": {
            "apiBaseUrl": defaults::PERUCRIS_API_BASE_URL,
            "apiKey": request.perucris_api_key.unwrap_or_default(),
            "ruc": request.perucris_ruc.unwrap_or_default()
        }
    });

    let plaintext = serde_json::to_string_pretty(&config_json)
        .map_err(|e| AppError::InternalError(format!("Error serializando configuracion: {}", e)))?;

    if let Some(parent) = user_config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            AppError::InternalError(format!("No se pudo crear directorio de config: {}", e))
        })?;
    }

    std::fs::write(user_config_path, plaintext.as_bytes())
        .map_err(|e| AppError::InternalError(format!("No se pudo guardar configuracion: {}", e)))?;

    Ok(())
}

pub async fn test_mongodb_connectivity(uri: &str) -> ConnectivityResult {
    match test_mongodb_impl(uri).await {
        Ok(msg) => ConnectivityResult {
            service: "MongoDB".to_string(),
            success: true,
            message: msg,
        },
        Err(e) => ConnectivityResult {
            service: "MongoDB".to_string(),
            success: false,
            message: e,
        },
    }
}

async fn test_mongodb_impl(uri: &str) -> Result<String, String> {
    use mongodb::{options::ClientOptions, Client};

    let client_options = ClientOptions::parse(uri)
        .await
        .map_err(|e| format!("URI invalida: {}", e))?;

    let client = Client::with_options(client_options)
        .map_err(|e| format!("Error creando cliente MongoDB: {}", e))?;

    client
        .database("admin")
        .run_command(mongodb::bson::doc! { "ping": 1 })
        .await
        .map_err(|e| format!("Error de conexion: {}", e))?;

    Ok("Conexion exitosa".to_string())
}

pub async fn test_reniec_connectivity(token: &str) -> ConnectivityResult {
    let client = reqwest::Client::new();
    let endpoint = format!(
        "{}/reniec/dni?numero={}",
        defaults::RENIEC_API_BASE_URL,
        defaults::RENIEC_TEST_DNI
    );
    match client
        .get(&endpoint)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("Authorization", format!("Bearer {}", token))
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if resp.status().is_success() {
                ConnectivityResult {
                    service: "RENIEC".to_string(),
                    success: true,
                    message: format!("Token valido (HTTP {})", status),
                }
            } else if status == 404 {
                ConnectivityResult {
                    service: "RENIEC".to_string(),
                    success: true,
                    message: "API y token validos (DNI de prueba no existe, esperado)".to_string(),
                }
            } else if status == 401 || status == 403 {
                ConnectivityResult {
                    service: "RENIEC".to_string(),
                    success: false,
                    message: format!("Token invalido o sin permisos (HTTP {})", status),
                }
            } else {
                ConnectivityResult {
                    service: "RENIEC".to_string(),
                    success: false,
                    message: format!("Error de API (HTTP {})", status),
                }
            }
        }
        Err(e) => ConnectivityResult {
            service: "RENIEC".to_string(),
            success: false,
            message: format!("Sin conexion: {}", format_error_chain(&e)),
        },
    }
}

pub async fn test_renacyt_connectivity(base_url: &str) -> ConnectivityResult {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/actoRegistral/obtenerActoRegistralActivoCtiVitae/{}/{}",
        base_url.trim_end_matches('/'),
        defaults::RENACYT_TEST_ACTO_VERSION,
        defaults::RENACYT_TEST_CTI_VITAE
    );
    match client
        .get(&url)
        .header("Accept", "application/json")
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if resp.status().is_success() {
                ConnectivityResult {
                    service: "RENACYT".to_string(),
                    success: true,
                    message: format!("API RENACYT responde (HTTP {})", status),
                }
            } else if status == 404 {
                ConnectivityResult {
                    service: "RENACYT".to_string(),
                    success: false,
                    message: "Endpoint RENACYT no encontrado. Verifique la URL base.".to_string(),
                }
            } else {
                ConnectivityResult {
                    service: "RENACYT".to_string(),
                    success: false,
                    message: format!("Servidor RENACYT no disponible (HTTP {})", status),
                }
            }
        }
        Err(e) => ConnectivityResult {
            service: "RENACYT".to_string(),
            success: false,
            message: format!("Sin conexion: {}", format_error_chain(&e)),
        },
    }
}

pub async fn test_pure_connectivity(base_url: &str, api_key: &str) -> ConnectivityResult {
    let client = reqwest::Client::new();
    let url = format!("{}/persons?size=1", base_url.trim_end_matches('/'));
    match client
        .get(&url)
        .header("api-key", api_key)
        .header("Accept", "application/json")
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if resp.status().is_success() {
                ConnectivityResult {
                    service: "Pure".to_string(),
                    success: true,
                    message: format!("Pure API y api-key validos (HTTP {})", status),
                }
            } else if status == 401 {
                ConnectivityResult {
                    service: "Pure".to_string(),
                    success: false,
                    message: "api-key invalida o expirada (HTTP 401)".to_string(),
                }
            } else if status == 403 {
                ConnectivityResult {
                    service: "Pure".to_string(),
                    success: false,
                    message: "api-key sin permisos (HTTP 403)".to_string(),
                }
            } else {
                ConnectivityResult {
                    service: "Pure".to_string(),
                    success: false,
                    message: format!("Servidor Pure no disponible (HTTP {})", status),
                }
            }
        }
        Err(e) => ConnectivityResult {
            service: "Pure".to_string(),
            success: false,
            message: format!("Sin conexion: {}", format_error_chain(&e)),
        },
    }
}

pub async fn test_perucris_connectivity(
    base_url: &str,
    api_key: Option<&str>,
    ruc: Option<&str>,
) -> ConnectivityResult {
    let client = reqwest::Client::new();
    let base = match api_key {
        Some(key) => test_perucris_authenticated(&client, base_url, key).await,
        None => test_perucris_public(&client, base_url).await,
    };
    // Si ademas se proporciono un RUC, hacer una busqueda publica de
    // sanity-check: si la entidad existe en PeruCRIS, devuelve >= 1 hit.
    if let Some(ruc_clean) = ruc.map(str::trim).filter(|s| !s.is_empty()) {
        return enhance_with_ruc_check(&client, base, base_url, ruc_clean).await;
    }
    base
}

async fn enhance_with_ruc_check(
    client: &reqwest::Client,
    base: ConnectivityResult,
    base_url: &str,
    ruc: &str,
) -> ConnectivityResult {
    if !base.success {
        return base;
    }
    let url = format!(
        "{}/discover/search/objects?query={ruc}&dsoType=ITEM&size=5",
        base_url.trim_end_matches('/')
    );
    match client
        .get(&url)
        .header("Accept", "application/json")
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let body = resp.text().await.unwrap_or_default();
            let hits = count_items_in_search_response(&body);
            ConnectivityResult {
                service: base.service,
                success: true,
                message: format!(
                    "{} — RUC {} encontrado en PeruCRIS ({} hit(s))",
                    base.message, ruc, hits
                ),
            }
        }
        _ => base,
    }
}

fn count_items_in_search_response(body: &str) -> usize {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(body) else {
        return 0;
    };
    // HAL/DSpace discover: { "_embedded": { "searchResult": { "_embedded": { "objects": [...] } } } }
    value
        .pointer("/_embedded/searchResult/_embedded/objects")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0)
}

/// Endpoint autenticado (`/cerif/status`). Solo aplica cuando el operador
/// disponde de una api-key para push/ingest.
async fn test_perucris_authenticated(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
) -> ConnectivityResult {
    let url = format!("{}/cerif/status", base_url.trim_end_matches('/'));
    match client
        .get(&url)
        .header("api-key", api_key)
        .header("Accept", "application/json")
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if resp.status().is_success() {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: true,
                    message: format!("PeruCRIS API y api-key validos (HTTP {})", status),
                }
            } else if status == 404 {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: true,
                    message: "URL base y api-key validos (endpoint status no existe, esperado)"
                        .to_string(),
                }
            } else if status == 401 {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: false,
                    message: "api-key invalida o expirada (HTTP 401)".to_string(),
                }
            } else if status == 403 {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: false,
                    message: "api-key sin permisos (HTTP 403)".to_string(),
                }
            } else {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: false,
                    message: format!("Servidor PeruCRIS no disponible (HTTP {})", status),
                }
            }
        }
        Err(e) => ConnectivityResult {
            service: "PeruCRIS".to_string(),
            success: false,
            message: format!("Sin conexion: {}", format_error_chain(&e)),
        },
    }
}

/// Endpoint publico (`/discover/search/objects`). No requiere api-key.
/// Verifica que la URL base del REST publico de PeruCRIS es alcanzable.
/// Cualquier 2xx (incluso 200 con zero resultados) cuenta como OK.
async fn test_perucris_public(client: &reqwest::Client, base_url: &str) -> ConnectivityResult {
    let url = format!(
        "{}/discover/search/objects?query=perucris&dsoType=ITEM&size=1",
        base_url.trim_end_matches('/')
    );
    match client
        .get(&url)
        .header("Accept", "application/json")
        .timeout(CONNECTIVITY_TIMEOUT)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if resp.status().is_success() {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: true,
                    message: format!(
                        "PeruCRIS endpoint publico alcanzable (HTTP {}) — sin api-key; el importador por RUC/DNI funciona en modo lectura",
                        status
                    ),
                }
            } else {
                ConnectivityResult {
                    service: "PeruCRIS".to_string(),
                    success: false,
                    message: format!("Servidor PeruCRIS no disponible (HTTP {})", status),
                }
            }
        }
        Err(e) => ConnectivityResult {
            service: "PeruCRIS".to_string(),
            success: false,
            message: format!("Sin conexion: {}", format_error_chain(&e)),
        },
    }
}

pub fn validate_master_password(password: &str) -> Result<(), AppError> {
    let trimmed = password.trim();
    if trimmed.len() < 8 {
        return Err(AppError::InternalError(
            "La contraseña maestra debe tener al menos 8 caracteres.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_uppercase()) {
        return Err(AppError::InternalError(
            "La contraseña maestra debe contener al menos una mayuscula.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_lowercase()) {
        return Err(AppError::InternalError(
            "La contraseña maestra debe contener al menos una minuscula.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::InternalError(
            "La contraseña maestra debe contener al menos un digito.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| !c.is_alphanumeric()) {
        return Err(AppError::InternalError(
            "La contraseña maestra debe contener al menos un caracter especial.".to_string(),
        ));
    }
    Ok(())
}
