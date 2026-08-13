//! Pivot `patente_inventores` (patent_inventors).
//!
//! Resuelve la relacion M:N entre `patentes` y `personas` (un inventor
//! identificado por su `id_persona`). El atributo `orden` permite ordenar
//! a los inventores segun el formato legal (primer inventor, segundo, etc.).
//!
//! Las funciones de persistencia (CRUD) viven en el `repository.rs` de
//! `recursos` y se invocan en cascada desde los handlers de patentes.

use crate::shared::error::AppError;

#[derive(Debug, Clone, Default)]
pub struct PatenteInventor {
    pub id: String,
    pub id_patente: String,
    pub id_persona: String,
    pub orden: i32,
}

impl PatenteInventor {
    /// Construye un registro. Reglas:
    /// - `id`, `id_patente`, `id_persona`: no vacios.
    /// - `orden`: >= 1.
    pub fn new(
        id: String,
        id_patente: String,
        id_persona: String,
        orden: i32,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de patente_inventor no puede estar vacio.".to_string(),
            ));
        }
        if id_patente.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_patente no puede estar vacio.".to_string(),
            ));
        }
        if id_persona.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_persona no puede estar vacio.".to_string(),
            ));
        }
        if orden < 1 {
            return Err(AppError::InternalError(format!(
                "El orden del inventor debe ser >= 1 (recibido: {orden})."
            )));
        }
        Ok(Self {
            id,
            id_patente: id_patente.trim().to_string(),
            id_persona: id_persona.trim().to_string(),
            orden,
        })
    }

    pub fn uniqueness_key(&self) -> (String, String) {
        (self.id_patente.clone(), self.id_persona.clone())
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PatenteInventorDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_patente: String,
    pub id_persona: String,
    pub orden: i32,
}

impl From<PatenteInventor> for PatenteInventorDoc {
    fn from(m: PatenteInventor) -> Self {
        Self {
            id: m.id,
            id_patente: m.id_patente,
            id_persona: m.id_persona,
            orden: m.orden,
        }
    }
}

impl From<PatenteInventorDoc> for PatenteInventor {
    fn from(d: PatenteInventorDoc) -> Self {
        Self {
            id: d.id,
            id_patente: d.id_patente,
            id_persona: d.id_persona,
            orden: d.orden,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_acepta_inventor_valido() {
        let pi = PatenteInventor::new(
            "pi-1".to_string(),
            "pat-1".to_string(),
            "persona-1".to_string(),
            1,
        )
        .unwrap();
        assert_eq!(pi.orden, 1);
    }

    #[test]
    fn new_rechaza_orden_menor_a_1() {
        let r = PatenteInventor::new(
            "pi-1".to_string(),
            "pat-1".to_string(),
            "persona-1".to_string(),
            0,
        );
        assert!(r.is_err());
    }

    #[test]
    fn uniqueness_key_incluye_persona() {
        let pi1 = PatenteInventor::new(
            "pi-1".to_string(),
            "pat-1".to_string(),
            "persona-1".to_string(),
            1,
        )
        .unwrap();
        let pi2 = PatenteInventor::new(
            "pi-2".to_string(),
            "pat-1".to_string(),
            "persona-2".to_string(),
            1,
        )
        .unwrap();
        assert_ne!(pi1.uniqueness_key(), pi2.uniqueness_key());
    }

    #[test]
    fn doc_round_trip() {
        let pi = PatenteInventor::new(
            "pi-1".to_string(),
            "pat-1".to_string(),
            "persona-1".to_string(),
            2,
        )
        .unwrap();
        let doc: PatenteInventorDoc = pi.clone().into();
        let back: PatenteInventor = doc.into();
        assert_eq!(back.id, pi.id);
        assert_eq!(back.orden, pi.orden);
    }
}
