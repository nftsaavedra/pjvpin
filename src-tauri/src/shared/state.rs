use std::collections::HashMap;

use mongodb::Database;
use tokio::sync::RwLock;

use crate::investigadores::dto::ReniecDniLookupResult;
use crate::shared::config::{PureConfig, RenacytConfig, ReniecConfig, RuntimeConfig};
use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::shared::time;
use crate::shared::tokens::TokenResolver;

const SESSION_TIMEOUT_MS: i64 = 30 * 60 * 1000;

#[derive(Clone)]
pub struct SessionEntry {
    pub user_id: String,
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
        let user_id = {
            let entry = sessions
                .get_mut(&token)
                .ok_or("Sesion invalida o expirada")?;

            if now - entry.last_activity_at > SESSION_TIMEOUT_MS
                || now - entry.created_at > SESSION_TIMEOUT_MS * 8
            {
                return Err("Sesion expirada por inactividad");
            }

            entry.last_activity_at = now;
            entry.user_id.clone()
        };

        self.cleanup_expired_locked(&mut sessions).await;

        Ok(user_id)
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

    async fn cleanup_expired_locked(&self, sessions: &mut HashMap<String, SessionEntry>) {
        let now = time::now_ms();
        let expired: Vec<String> = sessions
            .iter()
            .filter(|(_, entry)| now - entry.last_activity_at > SESSION_TIMEOUT_MS)
            .map(|(token, _)| token.clone())
            .collect();

        if !expired.is_empty() {
            for token in &expired {
                sessions.remove(token);
            }
            let mut wmap = self.window_map.write().await;
            wmap.retain(|_, t| !expired.contains(t));
        }
    }

    pub async fn cleanup_expired(&self) {
        let mut sessions = self.sessions.write().await;
        self.cleanup_expired_locked(&mut sessions).await;
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
    pub tokens: TokenResolver,
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
        let runtime = RuntimeConfig {
            database: crate::shared::config::DatabaseConfig {
                mongodb_uri: None,
                mongodb_db_name: String::new(),
                mongodb_max_pool_size: 0,
                mongodb_min_pool_size: 0,
            },
            reniec: reniec.clone(),
            renacyt: renacyt.clone(),
            pure: pure_config.clone(),
        };
        Self {
            mongo,
            reniec,
            renacyt,
            pure_config,
            tokens: TokenResolver::from_config(&runtime),
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
        let key = Dni::new(dni).ok()?.into_string();
        let cache = self.cache.read().await;
        cache.get(&key).and_then(|entry| {
            if now - entry.cached_at < Self::TTL_MS {
                Some(entry.result.clone())
            } else {
                None
            }
        })
    }

    pub async fn put(&self, dni: &str, result: ReniecDniLookupResult) {
        let Ok(key) = Dni::new(dni) else {
            return;
        };
        let mut cache = self.cache.write().await;
        cache.insert(
            key.into_string(),
            ReniecCacheEntry {
                result,
                cached_at: time::now_ms(),
            },
        );
    }
}
