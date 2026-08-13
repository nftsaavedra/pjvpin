//! Modelos de dominio de la feature `geo`.
//!
//! Dominio puro: sin `serde`, sin `uuid`. Las invariantes se validan en
//! `new()`. La conversion a/desde BSON `Document` se hace en
//! `crate::geo::repository` via `UbigeoDoc`.

use crate::geo::dto::CreateUbigeoRequest;
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
    pub fn new(codigo: String, request: CreateUbigeoRequest) -> Result<Self, AppError> {
        let codigo = codigo.trim().to_string();
        Self::check_codigo(&codigo)?;

        if request.departamento.trim().is_empty()
            || request.provincia.trim().is_empty()
            || request.distrito.trim().is_empty()
        {
            return Err(AppError::InternalError(
                "Departamento, provincia y distrito son obligatorios.".to_string(),
            ));
        }

        let now = crate::shared::time::now_ms();
        Ok(Self {
            codigo,
            departamento: request.departamento.trim().to_string(),
            provincia: request.provincia.trim().to_string(),
            distrito: request.distrito.trim().to_string(),
            activo: 1,
            created_at: Some(now),
            updated_at: Some(now),
        })
    }

    /// Validador de codigo (util para FK enforcement sin construir VO).
    pub fn validate_codigo(codigo: &str) -> Result<(), AppError> {
        Self::check_codigo(codigo.trim())
    }

    fn check_codigo(value: &str) -> Result<(), AppError> {
        if value.len() != UBIGEO_LEN {
            return Err(AppError::InternalError(format!(
                "El codigo de ubigeo debe tener exactamente {UBIGEO_LEN} digitos."
            )));
        }
        if !value.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::InternalError(
                "El codigo de ubigeo solo admite digitos ASCII.".to_string(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(dep: &str, prov: &str, dist: &str) -> CreateUbigeoRequest {
        CreateUbigeoRequest {
            departamento: dep.to_string(),
            provincia: prov.to_string(),
            distrito: dist.to_string(),
        }
    }

    #[test]
    fn new_accepts_valid_six_digits() {
        let u = Ubigeo::new("150101".to_string(), req("Lima", "Lima", "Lima")).unwrap();
        assert_eq!(u.codigo, "150101");
        assert_eq!(u.activo, 1);
    }

    #[test]
    fn new_rejects_short_codigo() {
        assert!(Ubigeo::new("15010".to_string(), req("Lima", "Lima", "Lima")).is_err());
    }

    #[test]
    fn new_rejects_long_codigo() {
        assert!(Ubigeo::new("1501011".to_string(), req("Lima", "Lima", "Lima")).is_err());
    }

    #[test]
    fn new_rejects_non_digit_codigo() {
        assert!(Ubigeo::new("15010a".to_string(), req("Lima", "Lima", "Lima")).is_err());
    }

    #[test]
    fn new_trims_codigo() {
        let u = Ubigeo::new("  150101  ".to_string(), req("Lima", "Lima", "Lima")).unwrap();
        assert_eq!(u.codigo, "150101");
    }

    #[test]
    fn new_rejects_empty_fields() {
        assert!(Ubigeo::new("150101".to_string(), req("", "Lima", "Lima")).is_err());
        assert!(Ubigeo::new("150101".to_string(), req("Lima", "", "Lima")).is_err());
        assert!(Ubigeo::new("150101".to_string(), req("Lima", "Lima", "")).is_err());
    }

    #[test]
    fn validate_codigo_helper() {
        assert!(Ubigeo::validate_codigo("150101").is_ok());
        assert!(Ubigeo::validate_codigo("abc").is_err());
        assert!(Ubigeo::validate_codigo("  150101  ").is_ok());
    }
}
