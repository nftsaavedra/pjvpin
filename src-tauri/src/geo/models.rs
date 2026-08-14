//! Modelos de dominio de la feature `geo`.
//!
//! Dominio puro: sin `serde`, sin `uuid`. La conversion a/desde BSON `Document`
//! se hace en `crate::geo::repository` via `UbigeoDoc`.

use crate::shared::error::AppError;

/// Largo canonico del codigo de ubigeo INEI (6 digitos ASCII).
pub const UBIGEO_LEN: usize = 6;

#[derive(Debug, Clone)]
pub struct Ubigeo {
    pub codigo: String,
    pub departamento: String,
    pub provincia: String,
    pub distrito: String,
    pub activo: i64,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

impl Ubigeo {
    /// Validador del codigo de ubigeo (6 digitos ASCII). Usado por el repo
    /// para validar FKs antes de consultar la coleccion.
    pub fn validate_codigo(codigo: &str) -> Result<(), AppError> {
        let v = codigo.trim();
        if v.len() != UBIGEO_LEN {
            return Err(AppError::InternalError(format!(
                "El codigo de ubigeo debe tener exactamente {UBIGEO_LEN} digitos."
            )));
        }
        if !v.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::InternalError(
                "El codigo de ubigeo solo admite digitos ASCII.".to_string(),
            ));
        }
        Ok(())
    }
}
