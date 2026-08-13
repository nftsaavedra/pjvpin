//! Modelos de dominio de la feature `ocde`.
//!
//! Sin serde; la conversion a BSON se hace en `repository.rs` via
//! `EntityOcdeFieldDoc`.

use crate::shared::error::AppError;
use crate::shared::vocab_mapper::ENTITY_TYPES_VALIDOS;

/// Pivot polimorfico `entity_ocde_fields`. Asocia un codigo SKOS del
/// vocabulario `ocde_ford` a una entidad del modelo.
#[derive(Debug, Clone, Default)]
pub struct EntidadCampoOcde {
    pub id: String,
    /// Tipo de la entidad (`vocab_mapper::ENTITY_TYPES_VALIDOS`).
    pub entity_type: String,
    /// PK canonica de la entidad (id_proyecto, id_equipamiento, ...).
    pub entity_id: String,
    /// Codigo SKOS dentro del esquema `ocde_ford` (FK -> catalogos).
    pub ocde_codigo: String,
}

impl EntidadCampoOcde {
    /// Construye un pivot. Valida:
    /// - `id`, `entity_id`, `ocde_codigo`: no vacios.
    /// - `entity_type`: en `ENTITY_TYPES_VALIDOS`.
    pub fn new(
        id: String,
        entity_type: String,
        entity_id: String,
        ocde_codigo: String,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de entity_ocde_field no puede estar vacio.".to_string(),
            ));
        }
        let entity_type_trim = entity_type.trim().to_string();
        if entity_type_trim.is_empty() {
            return Err(AppError::InternalError(
                "El entity_type es obligatorio.".to_string(),
            ));
        }
        if !ENTITY_TYPES_VALIDOS.iter().any(|e| *e == entity_type_trim) {
            return Err(AppError::InternalError(format!(
                "El entity_type '{}' no esta en los tipos validos ({}).",
                entity_type_trim,
                ENTITY_TYPES_VALIDOS.join(", ")
            )));
        }
        if entity_id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El entity_id no puede estar vacio.".to_string(),
            ));
        }
        let ocde_trim = ocde_codigo.trim().to_string();
        if ocde_trim.is_empty() {
            return Err(AppError::InternalError(
                "El codigo OCDE no puede estar vacio.".to_string(),
            ));
        }
        Ok(Self {
            id,
            entity_type: entity_type_trim,
            entity_id: entity_id.trim().to_string(),
            ocde_codigo: ocde_trim,
        })
    }

    /// Clave materializada de unicidad: (entity_type, entity_id, ocde_codigo).
    pub fn uniqueness_key(&self) -> (String, String, String) {
        (
            self.entity_type.clone(),
            self.entity_id.clone(),
            self.ocde_codigo.clone(),
        )
    }
}

/// DTO canónico (BSON + IPC) del pivot.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct EntityOcdeFieldDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub ocde_codigo: String,
}

impl From<EntidadCampoOcde> for EntityOcdeFieldDoc {
    fn from(m: EntidadCampoOcde) -> Self {
        Self {
            id: m.id,
            entity_type: m.entity_type,
            entity_id: m.entity_id,
            ocde_codigo: m.ocde_codigo,
        }
    }
}

impl From<EntityOcdeFieldDoc> for EntidadCampoOcde {
    fn from(d: EntityOcdeFieldDoc) -> Self {
        Self {
            id: d.id,
            entity_type: d.entity_type,
            entity_id: d.entity_id,
            ocde_codigo: d.ocde_codigo,
        }
    }
}
