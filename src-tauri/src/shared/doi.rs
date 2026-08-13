//! Value Object `Doi`.
//!
//! Encapsula la validacion sintactica ligera de un Digital Object Identifier
//! (`10.xxxx/...`). Centraliza el regex para no esparcirlo en formularios.

use crate::shared::error::AppError;

/// Largo maximo aceptado para un DOI (incluyendo el sufijo).
pub const DOI_MAX_LEN: usize = 255;

/// Value Object inmutable de DOI. Garantiza el prefijo `10.` y al menos un
/// separador `/` en la cadena.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Doi(String);

impl Doi {
    /// Construye un `Doi` validado. Aplica trim y exige el patron `10.PREFIX/SUFFIX`.
    pub fn new(value: &str) -> Result<Self, AppError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(AppError::InternalError(
                "Ingrese un DOI valido.".to_string(),
            ));
        }
        if trimmed.len() > DOI_MAX_LEN {
            return Err(AppError::InternalError(format!(
                "El DOI excede la longitud maxima de {DOI_MAX_LEN} caracteres."
            )));
        }
        if !trimmed.starts_with("10.") {
            return Err(AppError::InternalError(
                "El DOI debe comenzar con el prefijo '10.'.".to_string(),
            ));
        }
        if let Some(slash_pos) = trimmed.find('/') {
            let prefix = &trimmed[..slash_pos];
            let suffix = &trimmed[slash_pos + 1..];
            if prefix.len() <= 3 {
                return Err(AppError::InternalError(
                    "El prefijo DOI (antes del '/') debe tener al menos un digito.".to_string(),
                ));
            }
            if prefix[3..].chars().any(|c| !c.is_ascii_digit()) {
                return Err(AppError::InternalError(
                    "El prefijo DOI solo admite digitos despues de '10.'.".to_string(),
                ));
            }
            if suffix.is_empty() {
                return Err(AppError::InternalError(
                    "El DOI debe incluir un sufijo despues del '/'. ".to_string(),
                ));
            }
            if suffix.chars().any(|c| c.is_whitespace()) {
                return Err(AppError::InternalError(
                    "El DOI no puede contener espacios en blanco.".to_string(),
                ));
            }
        } else {
            return Err(AppError::InternalError(
                "El DOI debe contener el separador '/' entre prefijo y sufijo.".to_string(),
            ));
        }
        Ok(Self(trimmed.to_string()))
    }

    /// Variante opcional para campos `Option`.
    pub fn new_opt(value: Option<&str>) -> Result<Option<Self>, AppError> {
        match value {
            None => Ok(None),
            Some(v) if v.trim().is_empty() => Ok(None),
            Some(v) => Ok(Some(Self::new(v)?)),
        }
    }

    pub fn into_string(self) -> String {
        self.0
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Doi {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for Doi {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_doi() {
        let d = Doi::new("10.1000/xyz123").unwrap();
        assert_eq!(d.as_str(), "10.1000/xyz123");
    }

    #[test]
    fn trims_whitespace() {
        let d = Doi::new("  10.1000/xyz123  ").unwrap();
        assert_eq!(d.as_str(), "10.1000/xyz123");
    }

    #[test]
    fn rejects_empty() {
        assert!(Doi::new("").is_err());
        assert!(Doi::new("   ").is_err());
    }

    #[test]
    fn rejects_missing_prefix() {
        assert!(Doi::new("100.100/abc").is_err());
        assert!(Doi::new("11.1000/abc").is_err());
    }

    #[test]
    fn rejects_missing_slash() {
        assert!(Doi::new("10.1234").is_err());
    }

    #[test]
    fn rejects_empty_suffix() {
        assert!(Doi::new("10.1234/").is_err());
    }

    #[test]
    fn rejects_whitespace_in_suffix() {
        assert!(Doi::new("10.1234/abc def").is_err());
    }

    #[test]
    fn new_opt_handles_none_and_empty() {
        assert!(Doi::new_opt(None).unwrap().is_none());
        assert!(Doi::new_opt(Some("")).unwrap().is_none());
        assert!(Doi::new_opt(Some("   ")).unwrap().is_none());
        assert!(Doi::new_opt(Some("10.1/abc")).unwrap().is_some());
    }

    #[test]
    fn display_and_into_string() {
        let d = Doi::new("10.1/abc").unwrap();
        assert_eq!(format!("{d}"), "10.1/abc");
        assert_eq!(d.clone().into_string(), "10.1/abc");
    }
}
