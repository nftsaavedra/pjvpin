use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usuario {
    pub id_usuario: String,
    pub username: String,
    pub nombre_completo: String,
    pub rol: String,
    pub activo: i64,
    #[serde(default)]
    pub investigador_id: Option<String>,
    #[serde(default)]
    pub persona_id: Option<String>,
    #[serde(default)]
    pub dni: Option<String>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsuarioConPassword {
    pub id_usuario: String,
    pub username: String,
    pub nombre_completo: String,
    pub rol: String,
    pub password_hash: String,
    pub activo: i64,
    #[serde(default)]
    pub investigador_id: Option<String>,
    #[serde(default)]
    pub persona_id: Option<String>,
    #[serde(default)]
    pub dni: Option<String>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUsuarioRequest {
    pub username: String,
    pub dni: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub rol: String,
    pub password: String,
    #[serde(default)]
    pub investigador_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapUsuarioRequest {
    pub username: String,
    pub dni: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub password: String,
    #[serde(default)]
    pub rol: Option<String>,
    #[serde(default)]
    pub mongodb_uri: Option<String>,
    #[serde(default)]
    pub mongodb_db: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUsuarioRequest {
    pub username: String,
    pub rol: String,
    pub password: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginUsuarioRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub has_users: bool,
    pub requires_setup: bool,
}

impl UsuarioConPassword {
    pub fn new(request: CreateUsuarioRequest, password_hash: String) -> Self {
        let now = crate::shared::time::now_ms();

        let nombre_completo = compose_nombre_completo(
            request.nombres.as_deref(),
            request.apellido_paterno.as_deref(),
            request.apellido_materno.as_deref(),
        );

        Self {
            id_usuario: Uuid::new_v4().to_string(),
            username: request.username.trim().to_lowercase(),
            nombre_completo,
            rol: request.rol.trim().to_string(),
            password_hash,
            activo: 1,
            investigador_id: request.investigador_id,
            persona_id: None,
            dni: Some(request.dni.trim().to_string()),
            updated_at: Some(now),
        }
    }

    pub fn public_view(&self) -> Usuario {
        Usuario {
            id_usuario: self.id_usuario.clone(),
            username: self.username.clone(),
            nombre_completo: self.nombre_completo.clone(),
            rol: self.rol.clone(),
            activo: self.activo,
            investigador_id: self.investigador_id.clone(),
            persona_id: self.persona_id.clone(),
            dni: self.dni.clone(),
            updated_at: self.updated_at,
        }
    }
}

pub fn compose_nombre_completo(
    nombres: Option<&str>,
    apellido_paterno: Option<&str>,
    apellido_materno: Option<&str>,
) -> String {
    [nombres, apellido_paterno, apellido_materno]
        .iter()
        .filter_map(|s| s.map(|v| v.trim()))
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}
