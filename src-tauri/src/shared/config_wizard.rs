use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::shared::encryption;
use crate::shared::error::AppError;

#[derive(Debug, Deserialize)]
pub struct WizardConfigRequest {
    pub master_password: String,
    pub mongodb_uri: String,
    pub mongodb_db: Option<String>,
    pub reniec_token: Option<String>,
    pub renacyt_base_url: Option<String>,
    pub renacyt_acto_version: Option<String>,
    pub pure_api_key: Option<String>,
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
        return PathBuf::from(appdata).join("com.upic.pjupi");
    }
    std::env::temp_dir().join("com.upic.pjupi")
}

pub fn get_config_path() -> PathBuf {
    resolve_config_dir().join("pjvpin.config.json")
}

pub fn has_existing_config() -> bool {
    let enc_path = get_config_path().with_extension("json.enc");
    enc_path.exists() || get_config_path().exists()
}

pub fn save_wizard_config(
    request: WizardConfigRequest,
    user_config_path: &std::path::Path,
) -> Result<(), AppError> {
    let config_json = serde_json::json!({
        "database": {
            "mongodbUri": request.mongodb_uri,
            "mongodbDb": request.mongodb_db.unwrap_or_else(|| "pjvpin".to_string())
        },
        "reniec": {
            "apiBaseUrl": "https://api.decolecta.com/v1",
            "token": request.reniec_token.unwrap_or_default()
        },
        "renacyt": {
            "apiBaseUrl": request.renacyt_base_url.unwrap_or_else(|| "https://renacyt.concytec.gob.pe/renacyt-backend".to_string()),
            "actoVersion": request.renacyt_acto_version.unwrap_or_else(|| "2021".to_string()),
            "fichaBaseUrl": "https://servicio-renacyt.concytec.gob.pe/ficha-renacyt/"
        },
        "pure": {
            "apiBaseUrl": "https://pure.unf.edu.pe/ws/api",
            "apiKey": request.pure_api_key.unwrap_or_default()
        }
    });

    let plaintext = serde_json::to_string_pretty(&config_json)
        .map_err(|e| AppError::InternalError(format!("Error serializando configuracion: {}", e)))?;

    let encrypted = encryption::encrypt_config(&plaintext, &request.master_password)?;

    if let Some(parent) = user_config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            AppError::InternalError(format!("No se pudo crear directorio de config: {}", e))
        })?;
    }

    std::fs::write(user_config_path.with_extension("json.enc"), &encrypted)
        .map_err(|e| AppError::InternalError(format!("No se pudo guardar configuracion: {}", e)))?;

    Ok(())
}

pub fn load_decrypted_config(
    user_config_path: &std::path::Path,
    master_password: &str,
) -> Result<String, AppError> {
    let enc_path = user_config_path.with_extension("json.enc");
    if !enc_path.exists() {
        return Err(AppError::ConfigurationError(
            "No se encontro configuracion cifrada. Ejecute el asistente de configuracion."
                .to_string(),
        ));
    }

    let encrypted_hex = std::fs::read_to_string(&enc_path).map_err(|e| {
        AppError::ConfigurationError(format!("No se pudo leer configuracion cifrada: {}", e))
    })?;

    encryption::decrypt_config(&encrypted_hex, master_password)
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
    match client
        .get("https://api.decolecta.com/v1/dni/00000000")
        .header("Authorization", format!("Bearer {}", token))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(resp) => ConnectivityResult {
            service: "RENIEC".to_string(),
            success: resp.status().is_success() || resp.status().as_u16() == 404,
            message: format!("API responde (HTTP {})", resp.status().as_u16()),
        },
        Err(e) => ConnectivityResult {
            service: "RENIEC".to_string(),
            success: false,
            message: format!("Error: {}", e),
        },
    }
}

pub async fn test_renacyt_connectivity(base_url: &str) -> ConnectivityResult {
    let client = reqwest::Client::new();
    let url = format!("{}/postulante/listar", base_url.trim_end_matches('/'));
    match client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(resp) => ConnectivityResult {
            service: "RENACYT".to_string(),
            success: resp.status().is_success(),
            message: format!("API responde (HTTP {})", resp.status().as_u16()),
        },
        Err(e) => ConnectivityResult {
            service: "RENACYT".to_string(),
            success: false,
            message: format!("Error: {}", e),
        },
    }
}

pub async fn test_pure_connectivity(base_url: &str, api_key: &str) -> ConnectivityResult {
    let client = reqwest::Client::new();
    match client
        .get(base_url)
        .header("api-key", api_key)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(resp) => ConnectivityResult {
            service: "Pure".to_string(),
            success: resp.status().is_success() || resp.status().as_u16() == 401,
            message: format!("API responde (HTTP {})", resp.status().as_u16()),
        },
        Err(e) => ConnectivityResult {
            service: "Pure".to_string(),
            success: false,
            message: format!("Error: {}", e),
        },
    }
}

pub fn validate_master_password(password: &str) -> Result<(), AppError> {
    let trimmed = password.trim();
    if trimmed.len() < 12 {
        return Err(AppError::InternalError(
            "La contraseña maestra debe tener al menos 12 caracteres.".to_string(),
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
