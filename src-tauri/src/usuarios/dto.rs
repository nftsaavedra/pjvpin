//! DTOs de la feature `usuarios`.
//!
//! Esta capa de DTOs contiene el contrato wire entre el backend Rust y el
//! frontend TypeScript (Tauri IPC). Los DTOs llevan los `#[derive]` de
//! `serde` y `mongodb::bson::serde_helpers` necesarios para serializar a JSON
//! (IPC) y a BSON (persistencia).
//!
//! Los structs de dominio puros viven en `crate::usuarios::models` y NO
//! dependen de `serde` ni de `uuid`. La conversion entre DTOs y modelos se
//! hace via `impl From<...> for ...` explicitos al borde (commands/handlers).
//!
//! Convenciones:
//! - Todos los structs de salida (enviados al frontend) usan
//!   `#[serde(rename_all = "camelCase")]` para preservar las mismas keys que
//!   consume hoy el frontend TS (sin break).
//! - Los structs de entrada (requests IPC) usan `#[serde(rename_all = "camelCase")]`
//!   para aceptar el formato que envia el frontend.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsuarioDto {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsuarioConPasswordDto {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatusDto {
    pub has_users: bool,
    pub requires_setup: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUsuarioRequest {
    pub username: String,
    pub dni: String,
    #[serde(default)]
    pub nombres: Option<String>,
    #[serde(default)]
    pub apellido_paterno: Option<String>,
    #[serde(default)]
    pub apellido_materno: Option<String>,
    pub rol: String,
    pub password: String,
    #[serde(default)]
    pub investigador_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapUsuarioRequest {
    pub username: String,
    pub dni: String,
    #[serde(default)]
    pub nombres: Option<String>,
    #[serde(default)]
    pub apellido_paterno: Option<String>,
    #[serde(default)]
    pub apellido_materno: Option<String>,
    pub password: String,
    #[serde(default)]
    pub rol: Option<String>,
    #[serde(default)]
    pub mongodb_uri: Option<String>,
    #[serde(default)]
    pub mongodb_db: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUsuarioRequest {
    pub username: String,
    pub rol: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginUsuarioRequest {
    pub username: String,
    pub password: String,
}
