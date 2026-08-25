//! Seed de los grados academicos por defecto (v0.1.0).
//!
//! Origen canonico: el esquema CONCYTEC `renati_level` (alineado con
//! PeruCRIS). Si el vocabulario CONCYTEC cambia, bumpear la version del
//! set embebido y actualizar `grados_default.json`.
//!
//! Patron: igual que `seed_catalogos` y `seed_ubigeos_if_empty` —
//! idempotente (`if_empty`) + re-seed forzado (`reseed_grados`) usado
//! en `PJVPIN_RESET_DEV`.

use mongodb::bson::doc;
use mongodb::Database;

use crate::grados::dto::{CreateGradoRequest, GradoAcademicoDoc};
use crate::shared::error::AppError;

const GRADOS_SEED_JSON: &str = include_str!("data/grados_default.json");

/// Estructura intermedia para deserializar el JSON embebido.
#[derive(Debug, serde::Deserialize)]
struct SeedGrado {
    id_grado: String,
    nombre: String,
    #[serde(default)]
    descripcion: Option<String>,
    #[serde(default)]
    codigo_skos: Option<String>,
}

/// Semilla la coleccion `grados` con los 5 valores por defecto si esta vacia.
pub async fn seed_grados_if_empty(db: &Database) -> Result<(), AppError> {
    let count = db
        .collection::<mongodb::bson::Document>("grados")
        .count_documents(doc! {})
        .await?;
    if count > 0 {
        tracing::debug!(count, "grados ya poblados, skip seed (defensivo)");
        return Ok(());
    }
    reseed_grados(db).await
}

/// Borra cualquier grado existente y reinserta el set embebido.
pub async fn reseed_grados(db: &Database) -> Result<(), AppError> {
    let entries: Vec<SeedGrado> = serde_json::from_str(GRADOS_SEED_JSON).map_err(|e| {
        AppError::InternalError(format!("No se pudo parsear grados_default.json: {e}"))
    })?;

    db.collection::<mongodb::bson::Document>("grados")
        .delete_many(doc! {})
        .await?;

    let now = crate::shared::time::now_ms();
    for entry in entries {
        let request = CreateGradoRequest {
            nombre: entry.nombre,
            descripcion: entry.descripcion,
            codigo_skos: entry.codigo_skos,
        };
        let grado = crate::grados::models::GradoAcademico::new(entry.id_grado, request)?;
        let doc_struct: GradoAcademicoDoc = grado.into();
        let bson_doc = mongodb::bson::to_document(&doc_struct)
            .map_err(|e| AppError::InternalError(format!("No se pudo serializar grado: {e}")))?;
        let _ = now; // timestamp ya viene en `GradoAcademico::new`
        db.collection::<mongodb::bson::Document>("grados")
            .insert_one(bson_doc)
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_json_es_valido_y_tiene_5_entradas() {
        let entries: Vec<SeedGrado> =
            serde_json::from_str(GRADOS_SEED_JSON).expect("JSON embebido debe parsear");
        assert_eq!(
            entries.len(),
            5,
            "Debe haber exactamente 5 grados por defecto"
        );
        // Codigos SKOS deben coincidir con el vocabulario CONCYTEC renati_level.
        let codigos: Vec<&str> = entries
            .iter()
            .filter_map(|e| e.codigo_skos.as_deref())
            .collect();
        assert!(codigos.contains(&"bachiller"));
        assert!(codigos.contains(&"licenciado"));
        assert!(codigos.contains(&"segunda_especialidad"));
        assert!(codigos.contains(&"maestro"));
        assert!(codigos.contains(&"doctor"));
    }

    #[test]
    fn seed_json_ids_son_unicos() {
        let entries: Vec<SeedGrado> = serde_json::from_str(GRADOS_SEED_JSON).unwrap();
        let mut ids: Vec<&str> = entries.iter().map(|e| e.id_grado.as_str()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), entries.len(), "Los id_grado deben ser unicos");
    }
}
