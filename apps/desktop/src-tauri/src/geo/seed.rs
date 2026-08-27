//! Seed de Ubigeo INEI.
//!
//! Carga el dataset oficial INEI de ubigeos (departamentos, provincias y
//! distritos) embebido como JSON en `data/ubigeo_inei.json`. El dataset
//! contiene 25 departamentos, 196 provincias y ~1890 distritos con sus
//! codigos de 6 digitos oficiales. Origen: Plataforma Nacional de Datos
//! Abiertos (INEI), licencia ODbL.
//!
//! El seed corre una sola vez si la coleccion esta vacia, salvo que el
//! flag de dev force-reset este activo (PJVPIN_RESET_DEV).

use mongodb::bson::{doc, Document};
use mongodb::Database;
use serde::Deserialize;

use crate::geo::models::Ubigeo;
use crate::geo::repository;
use crate::shared::error::AppError;
use crate::shared::time::now_ms;

/// Dataset INEI completo embebido (25 deptos + 196 provincias + ~1890 distritos).
const UBIGEO_INEI_JSON: &str = include_str!("data/ubigeo_inei.json");

/// Entrada del JSON embebido (formato flat: cada registro es un nivel INEI).
#[derive(Debug, Deserialize)]
struct UbigeoSrc {
    codigo: String,
    departamento: String,
    #[serde(default)]
    provincia: String,
    #[serde(default)]
    distrito: String,
}

/// Construye los registros Ubigeo desde el dataset INEI embebido.
fn build_inei_ubigeos() -> Result<Vec<Ubigeo>, AppError> {
    let src: Vec<UbigeoSrc> = serde_json::from_str(UBIGEO_INEI_JSON)
        .map_err(|e| AppError::InternalError(format!("No se pudo parsear ubigeo INEI: {e}")))?;
    let now = now_ms();
    let mut items: Vec<Ubigeo> = src
        .into_iter()
        .map(|u| Ubigeo {
            codigo: u.codigo,
            departamento: u.departamento,
            provincia: u.provincia,
            distrito: u.distrito,
            activo: 1,
            created_at: Some(now),
            updated_at: Some(now),
        })
        .collect();
    items.sort_by(|a, b| a.codigo.cmp(&b.codigo));
    Ok(items)
}

pub async fn seed_ubigeos_if_empty(db: &Database) -> Result<(), AppError> {
    let count = db
        .collection::<Document>("ubigeos")
        .count_documents(doc! {})
        .await?;
    if count > 0 {
        return Ok(());
    }
    reseed_ubigeos(db).await
}

/// Borra la coleccion y re-inserta el dataset INEI completo.
pub async fn reseed_ubigeos(db: &Database) -> Result<(), AppError> {
    // Borrado best-effort (ignora si la coleccion no existe).
    let _ = db.collection::<Document>("ubigeos").drop().await;
    for u in build_inei_ubigeos()? {
        repository::upsert(db, &u).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inei_dataset_parses_and_validates() {
        let items = build_inei_ubigeos().expect("dataset debe parsear");
        assert!(!items.is_empty());
        // Todos los codigos deben ser de 6 digitos ASCII.
        for u in &items {
            Ubigeo::validate_codigo(&u.codigo).expect("codigo de 6 digitos");
        }
        // Cada nivel debe tener al menos un registro.
        assert!(items.iter().any(|u| u.departamento.is_empty() == false));
        assert!(items.iter().any(|u| !u.provincia.is_empty()));
        assert!(items.iter().any(|u| !u.distrito.is_empty()));
    }

    #[test]
    fn inei_dataset_codes_unique() {
        let items = build_inei_ubigeos().expect("dataset debe parsear");
        let mut codes: Vec<&str> = items.iter().map(|u| u.codigo.as_str()).collect();
        let len = codes.len();
        codes.sort();
        codes.dedup();
        assert_eq!(codes.len(), len, "no debe haber codigos duplicados");
    }
}
