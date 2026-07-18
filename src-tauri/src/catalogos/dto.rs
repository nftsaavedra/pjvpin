//! DTOs de la feature `catalogos`.
//!
//! Separación hexagonal (alineada con `usuarios/dto.rs`):
//!
//! - **Persistencia (`CatalogoItemDoc`)**: usado por el repository para
//!   serializar/deserializar a/desde BSON `Document`. snake_case, sin
//!   `rename_all`, para mantener consistencia con las queries `doc! { ... }`
//!   y con el resto de features (la colección `catalogos` persiste en
//!   snake_case desde v0.1.0-alpha).
//!
//! - **IPC salida (`CatalogoItemDto`, `EliminarCatalogoResultadoDto`)**:
//!   structs del contrato wire hacia el frontend. snake_case para casar
//!   con las interfaces TS en `src/shared/tauri/types/catalogo.types.ts`.
//!
//! - **IPC entrada (`CreateCatalogoRequest`)**: acepta el formato camelCase
//!   que envía el frontend. `#[serde(rename_all = "camelCase")]` previene
//!   mismatches silenciosos si en el futuro se añaden campos multi-word.

use serde::{Deserialize, Serialize};

// ============================================================================
// Persistencia (BSON): snake_case, sin rename_all.
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogoItemDoc {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub orden: Option<i32>,
    pub activo: i64,
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

// ============================================================================
// IPC salida: snake_case (match con interfaces TS).
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct CatalogoItemDto {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub orden: Option<i32>,
    pub activo: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EliminarCatalogoResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

// ============================================================================
// IPC entrada: camelCase (TS idiomático).
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCatalogoRequest {
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub orden: Option<i32>,
}
