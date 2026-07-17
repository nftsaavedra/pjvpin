//! Resolucion centralizada de credenciales externas (tokens, API keys).
//!
//! Antes: cada cliente HTTP (reniec_client, pure_client) repetia el mismo patron
//! de `config.token.as_deref().ok_or_else(|| AppError::ConfigurationError(...))`
//! con mensajes de error divergentes. Ahora ambos clientes (y futuros) obtienen
//! sus credenciales a traves de [`TokenResolver`], que centraliza:
//!
//! - Mensajes de error canonicos (mismo hint sobre env vars para todos).
//! - Logs de trazado consistentes si el token esta ausente.
//! - Punto unico de migracion futura a Windows Credential Manager
//!   (AGENTS.md -> Deuda Tecnica -> Cifrado de config en disco).
//!
//! RENACYT no requiere token (endpoint publico); no se incluye en este resolver.

use crate::shared::config::RuntimeConfig;
use crate::shared::error::AppError;

const RENIEC_TOKEN_MISSING: &str = "La integracion RENIEC no esta configurada. \
     Defina PJVPIN_RENIEC_TOKEN en .env (desarrollo) o en pjvpin.env (produccion).";

const PURE_API_KEY_MISSING: &str =
    "No se encontro la API key de Pure. \
     Configure PJVPIN_PURE_API_KEY (o PURE_API_KEY) en .env (desarrollo) o en pjvpin.env (produccion).";

/// Servicio de resolucion de credenciales externas.
///
/// Se construye una vez en el bootstrap desde [`RuntimeConfig`] y se guarda
/// en `AppState` para que handlers, clientes HTTP y servicios lo consulten.
///
/// # Garantias
/// - Inmutable tras la construccion (las credenciales no se rotan en runtime;
///   reiniciar la app si se actualiza el .env).
/// - `resolve_*` devuelven `&str` borrowed del storage interno (sin clones).
/// - Errores [`AppError::ConfigurationError`] con el mismo formato canonico.
pub struct TokenResolver {
    reniec_token: Option<String>,
    pure_api_key: Option<String>,
}

impl TokenResolver {
    pub fn from_config(config: &RuntimeConfig) -> Self {
        Self {
            reniec_token: config.reniec.token.clone(),
            pure_api_key: config.pure.api_key.clone(),
        }
    }

    /// `true` si el token de RENIEC esta configurado.
    pub fn has_reniec(&self) -> bool {
        self.reniec_token.is_some()
    }

    /// `true` si la API key de Pure esta configurada.
    pub fn has_pure(&self) -> bool {
        self.pure_api_key.is_some()
    }

    /// Resuelve el bearer token de RENIEC o devuelve un `ConfigurationError`
    /// canonico apuntando a la variable de entorno correspondiente.
    pub fn resolve_reniec_token(&self) -> Result<&str, AppError> {
        self.reniec_token
            .as_deref()
            .ok_or_else(|| AppError::ConfigurationError(RENIEC_TOKEN_MISSING.to_string()))
    }

    /// Resuelve la API key de Pure o devuelve un `ConfigurationError` canonico
    /// apuntando a las variables de entorno aceptadas.
    pub fn resolve_pure_api_key(&self) -> Result<&str, AppError> {
        self.pure_api_key
            .as_deref()
            .ok_or_else(|| AppError::ConfigurationError(PURE_API_KEY_MISSING.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::config::{
        DatabaseConfig, PureConfig, RenacytConfig, ReniecConfig, RuntimeConfig,
    };

    fn cfg(reniec_token: Option<&str>, pure_key: Option<&str>) -> RuntimeConfig {
        RuntimeConfig {
            database: DatabaseConfig {
                mongodb_uri: None,
                mongodb_db_name: "pjvpin".into(),
                mongodb_max_pool_size: 10,
                mongodb_min_pool_size: 1,
            },
            reniec: ReniecConfig {
                api_base_url: "https://x".into(),
                token: reniec_token.map(str::to_string),
            },
            renacyt: RenacytConfig {
                api_base_url: "https://x".into(),
                acto_version: "2021".into(),
                ficha_base_url: "https://x".into(),
            },
            pure: PureConfig {
                api_base_url: "https://x".into(),
                api_key: pure_key.map(str::to_string),
            },
        }
    }

    #[test]
    fn has_flags_reflect_config() {
        let r = TokenResolver::from_config(&cfg(Some("t"), None));
        assert!(r.has_reniec());
        assert!(!r.has_pure());
    }

    #[test]
    fn resolve_reniec_returns_value() {
        let r = TokenResolver::from_config(&cfg(Some("tk"), None));
        assert_eq!(r.resolve_reniec_token().unwrap(), "tk");
    }

    #[test]
    fn resolve_reniec_missing_returns_canonical_error() {
        let r = TokenResolver::from_config(&cfg(None, None));
        let err = r.resolve_reniec_token().unwrap_err();
        match err {
            AppError::ConfigurationError(msg) => {
                assert!(msg.contains("PJVPIN_RENIEC_TOKEN"));
            }
            _ => panic!("expected ConfigurationError"),
        }
    }

    #[test]
    fn resolve_pure_returns_value() {
        let r = TokenResolver::from_config(&cfg(None, Some("k")));
        assert_eq!(r.resolve_pure_api_key().unwrap(), "k");
    }

    #[test]
    fn resolve_pure_missing_returns_canonical_error() {
        let r = TokenResolver::from_config(&cfg(None, None));
        let err = r.resolve_pure_api_key().unwrap_err();
        match err {
            AppError::ConfigurationError(msg) => {
                assert!(msg.contains("PJVPIN_PURE_API_KEY"));
            }
            _ => panic!("expected ConfigurationError"),
        }
    }
}
