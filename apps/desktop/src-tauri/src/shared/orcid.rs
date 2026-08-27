//! Value Object `Orcid`.
//!
//! Encapsula la regla de dominio de un identificador ORCID: exactamente
//! 16 digitos ASCII formateados como `NNNN-NNNN-NNNN-NNN[0-9X]`, validados
//! mediante la suma de verificacion ISO 7064 mod 11-2.
//!
//! Mismo patron que `shared::dni::Dni`: sin `serde`, sin persistencia directa;
//! los repositorios reciben `&str` o `Option<&str>` y la conversion se hace
//! en la capa de borde.

use crate::shared::error::AppError;

/// Largo canonico de la cadena ORCID con guiones (19 caracteres).
pub const ORCID_LEN: usize = 19;

/// Value Object inmutable de ORCID.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Orcid(String);

impl Orcid {
    /// Construye un `Orcid` validado y normalizado con guiones. Aplica trim y
    /// exige el formato `NNNN-NNNN-NNNN-NNNX` con checksum ISO 7064 11-2 valido.
    pub fn new(value: &str) -> Result<Self, AppError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(AppError::InternalError(
                "Ingrese el identificador ORCID.".to_string(),
            ));
        }
        let normalized = Self::normalize(trimmed)?;
        Self::check_format(&normalized)?;
        Self::check_checksum(&normalized)?;
        Ok(Self(normalized))
    }

    /// Variante opcional para campos `Option`. Devuelve `Ok(None)` si la
    /// entrada esta vacia o solo contiene espacios.
    pub fn new_opt(value: Option<&str>) -> Result<Option<Self>, AppError> {
        match value {
            None => Ok(None),
            Some(v) if v.trim().is_empty() => Ok(None),
            Some(v) => Ok(Some(Self::new(v)?)),
        }
    }

    /// Desenvuelve el valor canonico. Usar solo en bordes (persistencia, IPC).
    pub fn into_string(self) -> String {
        self.0
    }

    /// Convierte un ORCID sin guiones a su forma canonica con guiones.
    /// - 16 digitos ASCII -> inserta guiones cada 4.
    /// - 19 chars ya formateados -> se devuelven tal cual.
    fn normalize(value: &str) -> Result<String, AppError> {
        let cleaned: String = value.chars().filter(|c| *c != ' ' && *c != '-').collect();
        if cleaned.len() == 16
            && cleaned
                .chars()
                .all(|c| c.is_ascii_digit() || c == 'X' || c == 'x')
        {
            let upper: String = cleaned.to_ascii_uppercase();
            let mut out = String::with_capacity(ORCID_LEN);
            for (i, ch) in upper.chars().enumerate() {
                if i > 0 && i % 4 == 0 {
                    out.push('-');
                }
                out.push(ch);
            }
            return Ok(out);
        }
        if value.len() == ORCID_LEN && value.chars().all(|c| c.is_ascii_digit() || c == '-') {
            return Ok(value.to_string());
        }
        Err(AppError::InternalError(
            "El ORCID debe tener 16 digitos (con o sin guiones), opcionalmente con una X final."
                .to_string(),
        ))
    }

    fn check_format(value: &str) -> Result<(), AppError> {
        if value.len() != ORCID_LEN {
            return Err(AppError::InternalError(format!(
                "El ORCID debe tener exactamente {ORCID_LEN} caracteres con guiones."
            )));
        }
        for (i, ch) in value.chars().enumerate() {
            let is_dash = ch == '-';
            let expected_dash = matches!(i, 4 | 9 | 14);
            if expected_dash && !is_dash {
                return Err(AppError::InternalError(
                    "Formato ORCID invalido (se esperaban guiones en posiciones 4, 9 y 14)."
                        .to_string(),
                ));
            }
            if !is_dash && !(ch.is_ascii_digit() || ch == 'X') {
                return Err(AppError::InternalError(
                    "El ORCID solo admite digitos ASCII y X como caracter final.".to_string(),
                ));
            }
        }
        Ok(())
    }

    /// Valida el checksum ISO 7064 mod 11-2.
    ///
    /// Algoritmo: la cadena ORCID (incluyendo las X final) representa 17
    /// caracteres. Se calcula el valor numerico de cada uno (X=10) y se aplica
    /// `t = (t + d) mod 11; t = (t * 2) mod 11` partiendo de t = 10. Tras los
    /// 17 caracteres, `t` debe ser 1.
    fn check_checksum(value: &str) -> Result<(), AppError> {
        let mut t: u32 = 10;
        for ch in value.chars() {
            let d = match ch {
                '-' => continue,
                '0'..='9' => ch.to_digit(10).unwrap(),
                'X' | 'x' => 10,
                _ => {
                    return Err(AppError::InternalError(
                        "Caracter invalido en ORCID durante validacion.".to_string(),
                    ));
                }
            };
            t = (t + d) % 11;
            t = (t * 2) % 11;
        }
        if t != 1 {
            return Err(AppError::InternalError(
                "El ORCID no supera la validacion de checksum ISO 7064 11-2.".to_string(),
            ));
        }
        Ok(())
    }
}

impl std::fmt::Display for Orcid {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for Orcid {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Cuerpo de 15 ceros produce check '5'; ORCID totalmente canonico valido
    /// bajo ISO 7064 11-2: `0000-0000-0000-0005`.
    const VALID_ORCID: &str = "0000-0000-0000-0005";
    const VALID_ORCID_COMPACT: &str = "0000000000000005";

    #[test]
    fn accepts_formatted_with_checksum() {
        let o = Orcid::new(VALID_ORCID).unwrap();
        assert_eq!(o.as_ref(), VALID_ORCID);
    }

    #[test]
    fn normalizes_unformatted_input() {
        let o = Orcid::new(VALID_ORCID_COMPACT).unwrap();
        assert_eq!(o.as_ref(), VALID_ORCID);
    }

    #[test]
    fn trims_whitespace() {
        let o = Orcid::new(&format!("  {VALID_ORCID}  ")).unwrap();
        assert_eq!(o.as_ref(), VALID_ORCID);
    }

    #[test]
    fn rejects_empty() {
        assert!(Orcid::new("").is_err());
        assert!(Orcid::new("   ").is_err());
    }

    #[test]
    fn rejects_wrong_length() {
        assert!(Orcid::new("0000-0002-1825-009").is_err());
        assert!(Orcid::new("0000-0002-1825-00977").is_err());
    }

    #[test]
    fn rejects_bad_format() {
        assert!(Orcid::new("0000_0002_1825_0097").is_err());
        assert!(Orcid::new("000a-0002-1825-0097").is_err());
    }

    #[test]
    fn rejects_bad_checksum() {
        // Reemplazamos el ultimo caracter '5' por '6' -> checksum invalido.
        assert!(Orcid::new("0000-0000-0000-0006").is_err());
    }

    #[test]
    fn rejects_terminator_x_after_all_zeros() {
        // Cuerpo 15 ceros + 'X' no cumple el algoritmo (debe ser '5').
        assert!(Orcid::new("0000-0000-0000-000X").is_err());
    }

    #[test]
    fn new_opt_handles_none_and_empty() {
        assert!(Orcid::new_opt(None).unwrap().is_none());
        assert!(Orcid::new_opt(Some("")).unwrap().is_none());
        assert!(Orcid::new_opt(Some("   ")).unwrap().is_none());
        assert!(Orcid::new_opt(Some(VALID_ORCID)).unwrap().is_some());
    }

    #[test]
    fn display_and_into_string() {
        let o = Orcid::new(VALID_ORCID).unwrap();
        assert_eq!(format!("{o}"), VALID_ORCID);
        assert_eq!(o.clone().into_string(), VALID_ORCID);
    }
}
