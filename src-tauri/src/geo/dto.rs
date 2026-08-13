//! DTOs de la feature `geo`.
//!
//! - `UbigeoDoc` (BSON) y `UbigeoDto` (IPC salida) usan snake_case
//!   consistente con el resto de features.
//! - `CreateUbigeoRequest` (IPC entrada) usa `#[serde(rename_all =
//!   "camelCase")]` para aceptar el formato que envia el frontend.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UbigeoDoc {
    pub codigo: String,
    pub departamento: String,
    pub provincia: String,
    pub distrito: String,
    pub activo: i64,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UbigeoDto {
    pub codigo: String,
    pub departamento: String,
    pub provincia: String,
    pub distrito: String,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUbigeoRequest {
    pub departamento: String,
    pub provincia: String,
    pub distrito: String,
}
