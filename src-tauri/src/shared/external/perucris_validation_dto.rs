//! DTOs del subsistema de validacion de sincronizacion PeruCRIS.
//!
//! Espejo Rust de los tipos en `src/shared/tauri/types/perucris.types.ts`.
//! Cualquier cambio aqui debe reflejarse en el TS mirror y viceversa.

use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ValidationTipo {
    OrgUnit,
    Person,
    Project,
    Publication,
    Patent,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeruCrisValidationItem {
    pub tipo: ValidationTipo,
    pub id_local: String,
    pub identificadores_esperados: HashMap<String, Option<String>>,
    pub encontrado_en_perucris: bool,
    pub perucris_uuid: Option<String>,
    pub perucris_handle: Option<String>,
    pub last_modified_perucris: Option<String>,
    pub diferencias: Vec<String>,
}

impl PeruCrisValidationItem {
    pub fn new(tipo: ValidationTipo, id_local: String) -> Self {
        Self {
            tipo,
            id_local,
            identificadores_esperados: HashMap::new(),
            encontrado_en_perucris: false,
            perucris_uuid: None,
            perucris_handle: None,
            last_modified_perucris: None,
            diferencias: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeruCrisValidationReport {
    pub ejecutado_at: i64,
    pub total_evaluados: usize,
    pub total_encontrados: usize,
    pub total_faltantes: usize,
    pub total_con_diferencias: usize,
    pub tiempo_total_ms: i64,
    pub fuente_perucris: String,
    pub items: Vec<PeruCrisValidationItem>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn item_nuevo_arranca_vacio() {
        let item = PeruCrisValidationItem::new(ValidationTipo::OrgUnit, "org-1".into());
        assert_eq!(item.tipo, ValidationTipo::OrgUnit);
        assert_eq!(item.id_local, "org-1");
        assert!(!item.encontrado_en_perucris);
        assert!(item.diferencias.is_empty());
        assert!(item.identificadores_esperados.is_empty());
    }
}
