//! Pivot `patente_titulares` (patent_holders).
//!
//! Resuelve la relacion M:N entre `patentes` y `org_units`/`personas`. Una
//! patente puede tener varios titulares, cada uno con un `holder_type` que
//! indica el tipo concreto de la entidad (ORG_UNIT o PERSON). El atributo
//! `orden` mantiene la prioridad/apoderamiento.
//!
//! Las funciones de persistencia (CRUD) viven en el `repository.rs` de
//! `recursos` y se invocan en cascada desde los handlers de patentes.

use crate::shared::error::AppError;
use crate::shared::vocab_mapper::HOLDER_TYPES_VALIDOS;

#[derive(Debug, Clone, Default)]
pub struct PatenteTitular {
    pub id: String,
    pub id_patente: String,
    /// `vocab_mapper::HOLDER_TYPES_VALIDOS` (ORG_UNIT o PERSON).
    pub holder_type: String,
    pub id_org_unit: Option<String>,
    pub id_persona: Option<String>,
    pub orden: i32,
}

impl PatenteTitular {
    /// Construye un registro. Reglas:
    /// - `id`, `id_patente`: no vacios.
    /// - `holder_type`: en `HOLDER_TYPES_VALIDOS`.
    /// - Exactly one of `id_org_unit` / `id_persona` debe ser `Some`.
    /// - `orden`: >= 1.
    pub fn new(
        id: String,
        id_patente: String,
        holder_type: String,
        id_org_unit: Option<String>,
        id_persona: Option<String>,
        orden: i32,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de patente_titular no puede estar vacio.".to_string(),
            ));
        }
        if id_patente.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_patente no puede estar vacio.".to_string(),
            ));
        }
        let holder_type_trim = holder_type.trim().to_string();
        if holder_type_trim.is_empty() {
            return Err(AppError::InternalError(
                "El holder_type es obligatorio.".to_string(),
            ));
        }
        if !HOLDER_TYPES_VALIDOS.iter().any(|h| *h == holder_type_trim) {
            return Err(AppError::InternalError(format!(
                "El holder_type '{}' no esta en los tipos validos ({}).",
                holder_type_trim,
                HOLDER_TYPES_VALIDOS.join(", ")
            )));
        }
        let id_org_norm = id_org_unit
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let id_per_norm = id_persona
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let tiene_org = id_org_norm.is_some();
        let tiene_per = id_per_norm.is_some();
        if tiene_org == tiene_per {
            return Err(AppError::InternalError(
                "El titular debe referenciar exactamente una de id_org_unit o id_persona, no ambas ni ninguna."
                    .to_string(),
            ));
        }
        if orden < 1 {
            return Err(AppError::InternalError(format!(
                "El orden del titular debe ser >= 1 (recibido: {orden})."
            )));
        }
        Ok(Self {
            id,
            id_patente: id_patente.trim().to_string(),
            holder_type: holder_type_trim,
            id_org_unit: id_org_norm,
            id_persona: id_per_norm,
            orden,
        })
    }

    /// Identidad materializada del holder para indizar unicidad.
    /// Devuelve (holder_type, id). Si el holder_type es ORG_UNIT retorna
    /// id_org_unit; si PERSON retorna id_persona.
    pub fn entity_id(&self) -> String {
        match self.holder_type.as_str() {
            crate::shared::vocab_mapper::HOLDER_TYPE_ORG_UNIT => {
                self.id_org_unit.clone().unwrap_or_default()
            }
            crate::shared::vocab_mapper::HOLDER_TYPE_PERSON => {
                self.id_persona.clone().unwrap_or_default()
            }
            _ => String::new(),
        }
    }

    pub fn uniqueness_key(&self) -> (String, String, String) {
        (
            self.id_patente.clone(),
            self.holder_type.clone(),
            self.entity_id(),
        )
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PatenteTitularDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_patente: String,
    pub holder_type: String,
    #[serde(default)]
    pub id_org_unit: Option<String>,
    #[serde(default)]
    pub id_persona: Option<String>,
    pub orden: i32,
}

impl From<PatenteTitular> for PatenteTitularDoc {
    fn from(m: PatenteTitular) -> Self {
        Self {
            id: m.id,
            id_patente: m.id_patente,
            holder_type: m.holder_type,
            id_org_unit: m.id_org_unit,
            id_persona: m.id_persona,
            orden: m.orden,
        }
    }
}

impl From<PatenteTitularDoc> for PatenteTitular {
    fn from(d: PatenteTitularDoc) -> Self {
        Self {
            id: d.id,
            id_patente: d.id_patente,
            holder_type: d.holder_type,
            id_org_unit: d.id_org_unit,
            id_persona: d.id_persona,
            orden: d.orden,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_acepta_holder_org_unit() {
        let pt = PatenteTitular::new(
            "pt-1".to_string(),
            "pat-1".to_string(),
            crate::shared::vocab_mapper::HOLDER_TYPE_ORG_UNIT.to_string(),
            Some("org-1".to_string()),
            None,
            1,
        )
        .unwrap();
        assert_eq!(pt.holder_type, "ORG_UNIT");
    }

    #[test]
    fn new_acepta_holder_person() {
        let pt = PatenteTitular::new(
            "pt-1".to_string(),
            "pat-1".to_string(),
            crate::shared::vocab_mapper::HOLDER_TYPE_PERSON.to_string(),
            None,
            Some("persona-1".to_string()),
            1,
        )
        .unwrap();
        assert_eq!(pt.holder_type, "PERSON");
    }

    #[test]
    fn new_rechaza_holder_type_invalido() {
        let r = PatenteTitular::new(
            "pt-1".to_string(),
            "pat-1".to_string(),
            "COMPANY".to_string(),
            Some("org-1".to_string()),
            None,
            1,
        );
        assert!(r.is_err());
    }

    #[test]
    fn doc_round_trip() {
        let pt = PatenteTitular::new(
            "pt-1".to_string(),
            "pat-1".to_string(),
            crate::shared::vocab_mapper::HOLDER_TYPE_ORG_UNIT.to_string(),
            Some("org-1".to_string()),
            None,
            1,
        )
        .unwrap();
        let doc: PatenteTitularDoc = pt.clone().into();
        let back: PatenteTitular = doc.into();
        assert_eq!(back.id, pt.id);
    }
}
