//! Pivot `proyecto_financiamientos` (project_fundings).
//!
//! Resuelve la relacion M:N entre `proyectos` y `financiamientos`. Permite
//! asignar un monto (`monto_asignado`) y una moneda ISO 4217 a cada par
//! (proyecto, financiamiento). Un proyecto puede tener multiples fondos
//! financiando el mismo u otros rubros.
//!
//! Las funciones de persistencia (CRUD sobre la coleccion) viven en
//! `repository.rs` (modulo padre) y se invocan desde los handlers de
//! proyectos al crear/actualizar/eliminar. Aqui solo se conserva el modelo
//! de dominio y el DTO para mantener el principio hexagonal.

use crate::shared::error::AppError;
use crate::shared::vocab_mapper::is_iso_4217;

const DEFAULT_MONEDA: &str = "PEN";

/// Modelo de dominio de `proyecto_financiamientos`.
#[derive(Debug, Clone, Default)]
pub struct ProyectoFinanciamiento {
    pub id: String,
    pub id_proyecto: String,
    pub id_financiamiento: String,
    pub monto_asignado: Option<f64>,
    pub moneda: String,
}

impl ProyectoFinanciamiento {
    /// Construye un registro. Aplica validaciones:
    /// - `id`, `id_proyecto`, `id_financiamiento`: no vacios.
    /// - `moneda`: ISO 4217 (3 letras ASCII uppercase). Default "PEN".
    /// - `monto_asignado`: si presente, debe ser finito y >= 0.
    pub fn new(
        id: String,
        id_proyecto: String,
        id_financiamiento: String,
        monto_asignado: Option<f64>,
        moneda: Option<String>,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de proyecto_financiamiento no puede estar vacio.".to_string(),
            ));
        }
        if id_proyecto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_proyecto no puede estar vacio.".to_string(),
            ));
        }
        if id_financiamiento.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_financiamiento no puede estar vacio.".to_string(),
            ));
        }
        let moneda_trim = moneda
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_MONEDA.to_string());
        if !is_iso_4217(&moneda_trim) {
            return Err(AppError::InternalError(format!(
                "La moneda '{}' no es un codigo ISO 4217 valido (3 letras ASCII uppercase).",
                moneda_trim
            )));
        }
        if let Some(m) = monto_asignado {
            if !m.is_finite() || m < 0.0 {
                return Err(AppError::InternalError(format!(
                    "El monto_asignado debe ser un numero finito >= 0 (recibido: {m})."
                )));
            }
        }
        Ok(Self {
            id,
            id_proyecto: id_proyecto.trim().to_string(),
            id_financiamiento: id_financiamiento.trim().to_string(),
            monto_asignado,
            moneda: moneda_trim,
        })
    }

    /// Clave materializada de unicidad: (id_proyecto, id_financiamiento).
    pub fn uniqueness_key(&self) -> (String, String) {
        (self.id_proyecto.clone(), self.id_financiamiento.clone())
    }
}

/// DTO canónico (BSON + IPC) del pivot.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ProyectoFinanciamientoDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_proyecto: String,
    pub id_financiamiento: String,
    #[serde(default)]
    pub monto_asignado: Option<f64>,
    pub moneda: String,
}

impl From<ProyectoFinanciamiento> for ProyectoFinanciamientoDoc {
    fn from(m: ProyectoFinanciamiento) -> Self {
        Self {
            id: m.id,
            id_proyecto: m.id_proyecto,
            id_financiamiento: m.id_financiamiento,
            monto_asignado: m.monto_asignado,
            moneda: m.moneda,
        }
    }
}

impl From<ProyectoFinanciamientoDoc> for ProyectoFinanciamiento {
    fn from(d: ProyectoFinanciamientoDoc) -> Self {
        Self {
            id: d.id,
            id_proyecto: d.id_proyecto,
            id_financiamiento: d.id_financiamiento,
            monto_asignado: d.monto_asignado,
            moneda: d.moneda,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_acepta_registro_valido() {
        let pf = ProyectoFinanciamiento::new(
            "pf-1".to_string(),
            "p-1".to_string(),
            "fin-1".to_string(),
            Some(5000.0),
            Some("PEN".to_string()),
        )
        .unwrap();
        assert_eq!(pf.moneda, "PEN");
        assert_eq!(pf.monto_asignado, Some(5000.0));
    }

    #[test]
    fn new_rechaza_moneda_invalida() {
        let r = ProyectoFinanciamiento::new(
            "pf-1".to_string(),
            "p-1".to_string(),
            "fin-1".to_string(),
            None,
            Some("pesos".to_string()),
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_rechaza_monto_negativo() {
        let r = ProyectoFinanciamiento::new(
            "pf-1".to_string(),
            "p-1".to_string(),
            "fin-1".to_string(),
            Some(-100.0),
            Some("PEN".to_string()),
        );
        assert!(r.is_err());
    }

    #[test]
    fn doc_round_trip() {
        let pf = ProyectoFinanciamiento::new(
            "pf-1".to_string(),
            "p-1".to_string(),
            "fin-1".to_string(),
            Some(5000.0),
            Some("PEN".to_string()),
        )
        .unwrap();
        let doc: ProyectoFinanciamientoDoc = pf.clone().into();
        let back: ProyectoFinanciamiento = doc.into();
        assert_eq!(back.id, pf.id);
        assert_eq!(back.moneda, pf.moneda);
    }
}
