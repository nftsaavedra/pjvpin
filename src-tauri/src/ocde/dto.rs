//! DTOs de la feature `ocde` (pivot polimorfico `entity_ocde_fields`).
//!
//! Separacion hexagonal (alineada con `catalogos/dto.rs`):
//!
//! - **Persistencia (`EntityOcdeFieldDoc`)**: usado por el repository para
//!   serializar/deserializar a/desde BSON `Document`. snake_case, sin
//!   `rename_all` (la coleccion persiste en snake_case desde v0.1.0-alpha).
//!
//! El modelo de dominio (`EntidadCampoOcde`) vive en `models.rs` y NO
//! deriva `serde` (validacion en `new()`). El DTO es el unico punto de
//! contacto con persistencia e IPC.

use serde::{Deserialize, Serialize};

/// DTO canónico (BSON + IPC) del pivot `entity_ocde_fields`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EntityOcdeFieldDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub ocde_codigo: String,
}

impl From<crate::ocde::models::EntidadCampoOcde> for EntityOcdeFieldDoc {
    fn from(m: crate::ocde::models::EntidadCampoOcde) -> Self {
        Self {
            id: m.id,
            entity_type: m.entity_type,
            entity_id: m.entity_id,
            ocde_codigo: m.ocde_codigo,
        }
    }
}

impl From<EntityOcdeFieldDoc> for crate::ocde::models::EntidadCampoOcde {
    fn from(d: EntityOcdeFieldDoc) -> Self {
        Self {
            id: d.id,
            entity_type: d.entity_type,
            entity_id: d.entity_id,
            ocde_codigo: d.ocde_codigo,
        }
    }
}
