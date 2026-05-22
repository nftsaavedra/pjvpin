use std::collections::HashMap;

use mongodb::Database;
use tokio::sync::RwLock;

use crate::docentes::models::ReniecDniLookupResult;
use crate::shared::config::{PureConfig, RenacytConfig, ReniecConfig};
use crate::shared::error::AppError;
use crate::shared::time;

const SESSION_TIMEOUT_MS: i64 = 30 * 60 * 1000;

#[derive(Clone)]
pub struct SessionEntry {
    pub user_id: String,
    pub session_token: String,
    pub last_activity_at: i64,
    pub created_at: i64,
}

pub struct SessionStore {
    sessions: RwLock<HashMap<String, SessionEntry>>,
    window_map: RwLock<HashMap<String, String>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            window_map: RwLock::new(HashMap::new()),
        }
    }

    pub async fn create_session(&self, window_label: &str, user_id: String) -> String {
        let now = time::now_ms();
        let token = uuid::Uuid::new_v4().to_string();

        let mut sessions = self.sessions.write().await;
        let mut wmap = self.window_map.write().await;

        if let Some(old_token) = wmap.get(window_label) {
            sessions.remove(old_token);
        }

        sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.clone(),
                session_token: token.clone(),
                last_activity_at: now,
                created_at: now,
            },
        );
        wmap.insert(window_label.to_string(), token.clone());
        token
    }

    pub async fn validate_and_get_user_id(
        &self,
        window_label: &str,
    ) -> Result<String, &'static str> {
        let now = time::now_ms();

        let token = {
            let wmap = self.window_map.read().await;
            wmap.get(window_label).cloned()
        }
        .ok_or("No hay sesion activa")?;

        let mut sessions = self.sessions.write().await;
        let entry = sessions
            .get_mut(&token)
            .ok_or("Sesion invalida o expirada")?;

        if now - entry.last_activity_at > SESSION_TIMEOUT_MS {
            sessions.remove(&token);
            return Err("Sesion expirada por inactividad");
        }

        entry.last_activity_at = now;
        Ok(entry.user_id.clone())
    }

    pub async fn touch_session(&self, window_label: &str) {
        let wmap = self.window_map.read().await;
        if let Some(token) = wmap.get(window_label) {
            let mut sessions = self.sessions.write().await;
            if let Some(entry) = sessions.get_mut(token) {
                entry.last_activity_at = time::now_ms();
            }
        }
    }

    pub async fn destroy_session(&self, window_label: &str) {
        let mut wmap = self.window_map.write().await;
        if let Some(token) = wmap.remove(window_label) {
            let mut sessions = self.sessions.write().await;
            sessions.remove(&token);
        }
    }

    pub async fn cleanup_expired(&self) {
        let now = time::now_ms();
        let mut expired_tokens: Vec<String> = Vec::new();
        {
            let sessions = self.sessions.read().await;
            for (token, entry) in sessions.iter() {
                if now - entry.last_activity_at > SESSION_TIMEOUT_MS {
                    expired_tokens.push(token.clone());
                }
            }
        }
        if !expired_tokens.is_empty() {
            let mut sessions = self.sessions.write().await;
            let mut wmap = self.window_map.write().await;
            for token in &expired_tokens {
                sessions.remove(token);
            }
            wmap.retain(|_, t| !expired_tokens.contains(t));
        }
    }
}

pub struct LoginRateLimiter {
    attempts: RwLock<HashMap<String, Vec<i64>>>,
}

impl LoginRateLimiter {
    pub fn new() -> Self {
        Self {
            attempts: RwLock::new(HashMap::new()),
        }
    }

    pub async fn check_and_record(&self, key: &str) -> Result<(), AppError> {
        let now = time::now_ms();
        let window = 15 * 60 * 1000;
        let max_attempts = 5;

        let mut attempts = self.attempts.write().await;
        let entry = attempts.entry(key.to_string()).or_default();
        entry.retain(|&t| now - t < window);

        if entry.len() >= max_attempts {
            let oldest = entry.first().copied().unwrap_or(now);
            let wait_secs = (window - (now - oldest)) / 1000;
            return Err(AppError::InternalError(format!(
                "Demasiados intentos. Espere al menos {} segundos.",
                wait_secs
            )));
        }

        entry.push(now);
        Ok(())
    }

    pub async fn clear(&self, key: &str) {
        let mut attempts = self.attempts.write().await;
        attempts.remove(key);
    }
}

pub struct AppState {
    pub mongo: Option<Database>,
    pub reniec: ReniecConfig,
    pub renacyt: RenacytConfig,
    pub pure_config: PureConfig,
    sessions: SessionStore,
    pub rate_limiter: LoginRateLimiter,
    pub reniec_cache: ReniecCache,
}

impl AppState {
    pub fn new(
        mongo: Option<Database>,
        reniec: ReniecConfig,
        renacyt: RenacytConfig,
        pure_config: PureConfig,
    ) -> Self {
        Self {
            mongo,
            reniec,
            renacyt,
            pure_config,
            sessions: SessionStore::new(),
            rate_limiter: LoginRateLimiter::new(),
            reniec_cache: ReniecCache::new(),
        }
    }

    pub fn mongo_db(&self) -> Result<&Database, AppError> {
        self.mongo.as_ref().ok_or_else(|| {
            AppError::ConfigurationError(
                "MongoDB no esta inicializado para la configuracion actual.".to_string(),
            )
        })
    }

    pub fn reniec_config(&self) -> &ReniecConfig {
        &self.reniec
    }

    pub fn renacyt_config(&self) -> &RenacytConfig {
        &self.renacyt
    }

    pub async fn create_user_session(&self, window_label: &str, user_id: String) -> String {
        self.sessions.create_session(window_label, user_id).await
    }

    pub async fn set_current_session(&self, window_label: &str, user_id: String) {
        self.sessions.create_session(window_label, user_id).await;
    }

    pub async fn get_current_session_user_id(&self, window_label: &str) -> Option<String> {
        self.sessions
            .validate_and_get_user_id(window_label)
            .await
            .ok()
    }

    pub async fn validate_session(&self, window_label: &str) -> Result<String, &'static str> {
        self.sessions.validate_and_get_user_id(window_label).await
    }

    pub async fn touch_current_session(&self, window_label: &str) {
        self.sessions.touch_session(window_label).await;
    }

    pub async fn clear_current_session(&self, window_label: &str) {
        self.sessions.destroy_session(window_label).await;
    }

    pub async fn cleanup_sessions(&self) {
        self.sessions.cleanup_expired().await;
    }
}

pub struct ReniecCache {
    cache: RwLock<HashMap<String, ReniecCacheEntry>>,
}

struct ReniecCacheEntry {
    result: ReniecDniLookupResult,
    cached_at: i64,
}

impl ReniecCache {
    const TTL_MS: i64 = 60 * 60 * 1000;

    pub fn new() -> Self {
        Self {
            cache: RwLock::new(HashMap::new()),
        }
    }

    pub async fn get(&self, dni: &str) -> Option<ReniecDniLookupResult> {
        let now = time::now_ms();
        let cache = self.cache.read().await;
        cache.get(dni.trim()).and_then(|entry| {
            if now - entry.cached_at < Self::TTL_MS {
                Some(entry.result.clone())
            } else {
                None
            }
        })
    }

    pub async fn put(&self, dni: &str, result: ReniecDniLookupResult) {
        let mut cache = self.cache.write().await;
        cache.insert(
            dni.trim().to_string(),
            ReniecCacheEntry {
                result,
                cached_at: time::now_ms(),
            },
        );
    }
}
