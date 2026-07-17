use std::{collections::HashMap, env, fs, path::Path};

use serde::Deserialize;

use crate::shared::defaults;
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub mongodb_uri: Option<String>,
    pub mongodb_db_name: String,
    pub mongodb_max_pool_size: u32,
    pub mongodb_min_pool_size: u32,
}

#[derive(Debug, Clone)]
pub struct ReniecConfig {
    pub api_base_url: String,
    pub token: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RenacytConfig {
    pub api_base_url: String,
    pub acto_version: String,
    pub ficha_base_url: String,
}

#[derive(Debug, Clone)]
pub struct PureConfig {
    pub api_base_url: String,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub database: DatabaseConfig,
    pub reniec: ReniecConfig,
    pub renacyt: RenacytConfig,
    pub pure: PureConfig,
}

impl DatabaseConfig {
    pub fn from_values(values: &HashMap<String, String>) -> Self {
        let mongodb_uri = env::var("PJVPIN_MONGODB_URI").ok();
        let mongodb_uri = values
            .get("PJVPIN_MONGODB_URI")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .or(mongodb_uri);

        let mongodb_db_name = values
            .get("PJVPIN_MONGODB_DB")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| defaults::DEFAULT_MONGODB_DB.to_string());

        let mongodb_max_pool_size = values
            .get("PJVPIN_MONGODB_MAX_POOL_SIZE")
            .and_then(|v| v.trim().parse::<u32>().ok())
            .filter(|&n| n > 0)
            .unwrap_or(defaults::DEFAULT_MONGODB_MAX_POOL_SIZE);

        let mongodb_min_pool_size = values
            .get("PJVPIN_MONGODB_MIN_POOL_SIZE")
            .and_then(|v| v.trim().parse::<u32>().ok())
            .filter(|&n| n <= mongodb_max_pool_size)
            .unwrap_or(defaults::DEFAULT_MONGODB_MIN_POOL_SIZE);

        Self {
            mongodb_uri,
            mongodb_db_name,
            mongodb_max_pool_size,
            mongodb_min_pool_size,
        }
    }

    pub fn requires_mongodb(&self) -> bool {
        true
    }
}

impl ReniecConfig {
    pub fn from_values(values: &HashMap<String, String>) -> Self {
        let api_base_url = values
            .get("PJVPIN_RENIEC_API_BASE_URL")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| defaults::RENIEC_API_BASE_URL.to_string());
        let token = values
            .get("PJVPIN_RENIEC_TOKEN")
            .cloned()
            .or_else(|| env::var("PJVPIN_RENIEC_TOKEN").ok())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        Self {
            api_base_url,
            token,
        }
    }
}

impl RenacytConfig {
    pub fn from_values(values: &HashMap<String, String>) -> Self {
        let api_base_url = values
            .get("PJVPIN_RENACYT_API_BASE_URL")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| defaults::RENACYT_API_BASE_URL.to_string());
        let acto_version = values
            .get("PJVPIN_RENACYT_ACTO_VERSION")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| defaults::RENACYT_ACTO_VERSION.to_string());
        let ficha_base_url = values
            .get("PJVPIN_RENACYT_FICHA_BASE_URL")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| defaults::RENACYT_FICHA_BASE_URL.to_string());

        Self {
            api_base_url,
            acto_version,
            ficha_base_url,
        }
    }
}

impl PureConfig {
    pub fn from_values(values: &HashMap<String, String>) -> Self {
        let api_base_url = values
            .get("PJVPIN_PURE_API_BASE_URL")
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| defaults::PURE_API_BASE_URL.to_string());
        let api_key = values
            .get("PJVPIN_PURE_API_KEY")
            .cloned()
            .or_else(|| values.get("PURE_API_KEY").cloned())
            .or_else(|| env::var("PJVPIN_PURE_API_KEY").ok())
            .or_else(|| env::var("PURE_API_KEY").ok())
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());

        Self {
            api_base_url,
            api_key,
        }
    }
}

pub fn load_runtime_config(
    user_config_path: &Path,
    project_env_path: Option<&Path>,
) -> Result<RuntimeConfig, AppError> {
    if let Some(parent) = user_config_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            AppError::ConfigurationError(format!(
                "No se pudo preparar el directorio de configuracion local: {}",
                error
            ))
        })?;
    }

    let mut values = HashMap::new();

    if let Some(env_path) = project_env_path {
        if env_path.exists() {
            let _ = merge_env_file(&mut values, env_path);
        }
    }

    if user_config_path.exists() {
        merge_json_file(&mut values, user_config_path)?;
    }

    let legacy_env_path = user_config_path.with_file_name("pjvpin.env");
    if legacy_env_path.exists() {
        merge_env_file(&mut values, &legacy_env_path)?;
    }

    merge_process_env(&mut values);

    Ok(RuntimeConfig {
        database: DatabaseConfig::from_values(&values),
        reniec: ReniecConfig::from_values(&values),
        renacyt: RenacytConfig::from_values(&values),
        pure: PureConfig::from_values(&values),
    })
}

fn merge_process_env(values: &mut HashMap<String, String>) {
    for key in [
        "PJVPIN_DB_BACKEND",
        "PJVPIN_MONGODB_URI",
        "PJVPIN_MONGODB_DB",
        "PJVPIN_RENIEC_API_BASE_URL",
        "PJVPIN_RENIEC_TOKEN",
        "PJVPIN_RENACYT_API_BASE_URL",
        "PJVPIN_RENACYT_ACTO_VERSION",
        "PJVPIN_RENACYT_FICHA_BASE_URL",
        "PJVPIN_PURE_API_BASE_URL",
        "PJVPIN_PURE_API_KEY",
        "PURE_API_KEY",
    ] {
        if let Ok(value) = env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                values.insert(key.to_string(), trimmed.to_string());
            }
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonConfigFile {
    database: Option<JsonDatabaseConfig>,
    reniec: Option<JsonReniecConfig>,
    renacyt: Option<JsonRenacytConfig>,
    pure: Option<JsonPureConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonDatabaseConfig {
    mongodb_uri: Option<String>,
    mongodb_db: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonReniecConfig {
    api_base_url: Option<String>,
    token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonRenacytConfig {
    api_base_url: Option<String>,
    acto_version: Option<String>,
    ficha_base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPureConfig {
    api_base_url: Option<String>,
    api_key: Option<String>,
}

fn merge_json_file(values: &mut HashMap<String, String>, path: &Path) -> Result<(), AppError> {
    let content = fs::read_to_string(path).map_err(|error| {
        AppError::ConfigurationError(format!(
            "No se pudo leer el archivo de configuracion JSON {:?}: {}",
            path, error
        ))
    })?;

    let parsed: JsonConfigFile = serde_json::from_str(&content).map_err(|error| {
        AppError::ConfigurationError(format!(
            "El archivo de configuracion JSON {:?} es invalido: {}",
            path, error
        ))
    })?;

    if let Some(database) = parsed.database {
        insert_if_non_empty(values, "PJVPIN_DB_BACKEND", Some("mongodb".to_string()));
        insert_if_non_empty(values, "PJVPIN_MONGODB_URI", database.mongodb_uri);
        insert_if_non_empty(values, "PJVPIN_MONGODB_DB", database.mongodb_db);
    }

    if let Some(reniec) = parsed.reniec {
        insert_if_non_empty(values, "PJVPIN_RENIEC_API_BASE_URL", reniec.api_base_url);
        insert_if_non_empty(values, "PJVPIN_RENIEC_TOKEN", reniec.token);
    }

    if let Some(renacyt) = parsed.renacyt {
        insert_if_non_empty(values, "PJVPIN_RENACYT_API_BASE_URL", renacyt.api_base_url);
        insert_if_non_empty(values, "PJVPIN_RENACYT_ACTO_VERSION", renacyt.acto_version);
        insert_if_non_empty(
            values,
            "PJVPIN_RENACYT_FICHA_BASE_URL",
            renacyt.ficha_base_url,
        );
    }

    if let Some(pure) = parsed.pure {
        insert_if_non_empty(values, "PJVPIN_PURE_API_BASE_URL", pure.api_base_url);
        insert_if_non_empty(values, "PJVPIN_PURE_API_KEY", pure.api_key);
    }

    Ok(())
}

fn insert_if_non_empty(
    values: &mut HashMap<String, String>,
    key: &str,
    maybe_value: Option<String>,
) {
    if let Some(value) = maybe_value {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            values.insert(key.to_string(), trimmed.to_string());
        }
    }
}

fn merge_env_file(values: &mut HashMap<String, String>, path: &Path) -> Result<(), AppError> {
    let content = fs::read_to_string(path).map_err(|error| {
        AppError::ConfigurationError(format!(
            "No se pudo leer el archivo de configuracion {:?}: {}",
            path, error
        ))
    })?;

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((raw_key, raw_value)) = line.split_once('=') else {
            continue;
        };

        let key = raw_key.trim();
        if key.is_empty() {
            continue;
        }

        let value = raw_value
            .trim()
            .trim_matches('"')
            .trim_matches('\'')
            .trim()
            .to_string();
        values.insert(key.to_string(), value);
    }

    Ok(())
}
