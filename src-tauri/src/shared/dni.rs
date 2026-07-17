//! Value Object `Dni`.
//!
//! Encapsula la regla de dominio del Documento Nacional de Identidad peruano:
//! exactamente 8 digitos ASCII. Centraliza la validacion + trim para evitar
//! esparcir `dni.trim() + len() + is_ascii_digit()` por todo el codebase.
//!
//! Es un VO puro: sin `serde` (los DTOs siguen siendo `String`), sin persistencia
//! directa. Los repositorios reciben `&Dni` o `&str` y la conversion se hace en
//! la capa de borde.

use crate::shared::error::AppError;

/// Largo canonico de un DNI peruano (8 digitos).
pub const DNI_LEN: usize = 8;

/// Value Object inmutable de DNI.
///
/// Construir siempre via [`Dni::new`]. Para validacion sin construir el VO,
/// usar [`Dni::validate`]. Desenvolver con [`Dni::into_string`] en la capa
/// de borde (persistencia, IPC).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Dni(String);

impl Dni {
    /// Construye un `Dni` validado. Aplica trim y exige 8 digitos ASCII.
    pub fn new(value: &str) -> Result<Self, AppError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(AppError::InternalError(
                "Ingrese el DNI del usuario.".to_string(),
            ));
        }
        Self::check_format(trimmed)?;
        Ok(Self(trimmed.to_string()))
    }

    /// Validador sin construir el VO. Util cuando solo se necesita un check.
    pub fn validate(value: &str) -> Result<(), AppError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(AppError::InternalError(
                "Ingrese el DNI del usuario.".to_string(),
            ));
        }
        Self::check_format(trimmed)
    }

    /// Desenvuelve el valor canonico. Usar solo en bordes (persistencia, IPC).
    pub fn into_string(self) -> String {
        self.0
    }

    fn check_format(value: &str) -> Result<(), AppError> {
        if value.len() != DNI_LEN || !value.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::InternalError(format!(
                "El DNI debe tener exactamente {DNI_LEN} digitos numericos."
            )));
        }
        Ok(())
    }
}

impl std::fmt::Display for Dni {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for Dni {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_accepts_8_digits() {
        let d = Dni::new("45678912").unwrap();
        assert_eq!(d.as_ref(), "45678912");
    }

    #[test]
    fn new_trims_whitespace() {
        let d = Dni::new("  45678912  ").unwrap();
        assert_eq!(d.as_ref(), "45678912");
    }

    #[test]
    fn new_rejects_empty() {
        assert!(Dni::new("").is_err());
    }

    #[test]
    fn new_rejects_whitespace_only() {
        assert!(Dni::new("   ").is_err());
    }

    #[test]
    fn new_rejects_seven_digits() {
        assert!(Dni::new("4567891").is_err());
    }

    #[test]
    fn new_rejects_nine_digits() {
        assert!(Dni::new("456789123").is_err());
    }

    #[test]
    fn new_rejects_non_ascii_digits() {
        assert!(Dni::new("45678abc").is_err());
    }

    #[test]
    fn new_rejects_unicode_digits() {
        // '\u{0660}' es el digito arabigo-indico '٠', no es ASCII.
        assert!(Dni::new("4567\u{0660}12").is_err());
    }

    #[test]
    fn validate_matches_new() {
        assert!(Dni::validate("45678912").is_ok());
        assert!(Dni::validate("bad").is_err());
    }

    #[test]
    fn display_and_as_ref() {
        let d = Dni::new("45678912").unwrap();
        assert_eq!(format!("{d}"), "45678912");
        let s: &str = d.as_ref();
        assert_eq!(s, "45678912");
    }

    #[test]
    fn into_string_preserves_value() {
        let d = Dni::new("45678912").unwrap();
        assert_eq!(d.into_string(), "45678912");
    }

    #[test]
    fn equality_and_hash() {
        use std::collections::HashSet;
        let a = Dni::new("45678912").unwrap();
        let b = Dni::new("  45678912  ").unwrap();
        assert_eq!(a, b);
        let mut set = HashSet::new();
        set.insert(a);
        set.insert(b);
        assert_eq!(set.len(), 1);
    }
}
