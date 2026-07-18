//! DTOs de la feature `usuarios`.
//!
//! Esta capa se divide en dos responsabilidades bien separadas (Hexagonal):
//!
//! - **Persistencia (`*Doc`)**: structs usados unicamente por el repository para
//!   serializar/deserializar a/desde BSON `Document`. Llevan claves en
//!   `snake_case` (sin `rename_all`) para mantener consistencia con las
//!   queries `doc! { "id_usuario": ... }` y con el indice unico definido en
//!   `shared/db.rs` (que tambien es snake_case). Asi, los documentos en
//!   MongoDB se persisten en snake_case, igual que el resto de features
//!   (`personas`, `investigadores`, `proyectos`, `grupos`, `grados`, etc.).
//!
//! - **IPC (`UsuarioDto`, `*Request`)**: structs del contrato wire entre el
//!   backend Rust y el frontend TypeScript (Tauri IPC). Los de salida
//!   (`UsuarioDto`, `AuthStatusDto`) serializan en **snake_case** (sin
//!   `rename_all`) para casar con las interfaces TS que los consumen
//!   (`Usuario`, `AuthStatus`). Los de entrada (`*Request`) usan
//!   `#[serde(rename_all = "camelCase")]` para aceptar el formato camelCase
//!   que envia el frontend (idiomático en TS).
//!
//! Los modelos de dominio puros viven en `crate::usuarios::models` y NO
//! dependen de `serde`. La conversion entre modelos y DTOs/Docs se hace via
//! `impl From<...>` explicitos al borde (commands/handlers/repository).

use serde::{Deserialize, Serialize};

// ============================================================================
// Persistencia (BSON): snake_case, sin rename_all.
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsuarioDoc {
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
pub struct UsuarioConPasswordDoc {
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

// ============================================================================
// IPC (wire Tauri -> frontend): snake_case para coincidir con las
// interfaces TS (`Usuario`, `AuthStatus`). Los inputs del frontend se
// mantienen en camelCase via los `*Request` de mas abajo.
// ============================================================================

#[derive(Debug, Clone, Serialize)]
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
