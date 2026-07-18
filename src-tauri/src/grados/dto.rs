//! DTOs de la feature `grados`.
//!
//! Separación hexagonal (alineada con `usuarios/dto.rs` y `catalogos/dto.rs`):
//!
//! - **Persistencia (`GradoAcademicoDoc`)**: BSON. snake_case, sin
//!   `rename_all`, consistente con la colección `grados` desde v0.1.0-alpha.
//!
//! - **IPC salida (`GradoAcademicoDto`, `EliminarGradoResultadoDto`)**:
//!   wire hacia el frontend. snake_case para casar con la interface TS
//!   `GradoAcademico` en `catalogo.types.ts`.
//!
//! - **IPC entrada (`CreateGradoRequest`)**: camelCase vía
//!   `#[serde(rename_all = "camelCase")]`. Hoy funciona por single-word
//!   fields pero el rename previene mismatches silenciosos futuros.

use serde::{Deserialize, Serialize};

// ============================================================================
// Persistencia (BSON): snake_case, sin rename_all.
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradoAcademicoDoc {
    pub id_grado: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    pub activo: i64,
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

// ============================================================================
// IPC salida: snake_case.
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct GradoAcademicoDto {
    pub id_grado: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub activo: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EliminarGradoResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

// ============================================================================
// IPC entrada: camelCase.
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGradoRequest {
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
}
