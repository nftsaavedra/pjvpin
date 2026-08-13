//! Seed de Ubigeo INEI.
//!
//! Inserta los 24 departamentos del Peru con su codigo INEI de 2 digitos
//! (los dos primeros del ubigeo). Las provincias y distritos se modelan
//! como entradas adicionales con su codigo de 6 digitos; en este seed base
//! se registran solo los departamentos para evitar duplicar manualmente
//! los ~1900 registros INEI. Provincias y distritos pueden cargarse via
//! import CSV posterior (no incluido en este plan).
//!
//! El seed corre una sola vez si la coleccion esta vacia, salvo que el
//! flag de dev force-reset este activo (PJVPIN_RESET_DEV).

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::geo::models::Ubigeo;
use crate::geo::repository;
use crate::shared::error::AppError;
use crate::shared::time::now_ms;

/// 24 departamentos del Peru (codigo INEI de 2 digitos + nombre oficial).
const DEPARTAMENTOS: &[(&str, &str)] = &[
    ("01", "Amazonas"),
    ("02", "Ancash"),
    ("03", "Apurimac"),
    ("04", "Arequipa"),
    ("05", "Ayacucho"),
    ("06", "Cajamarca"),
    ("07", "Callao"),
    ("08", "Cusco"),
    ("09", "Huancavelica"),
    ("10", "Huanuco"),
    ("11", "Ica"),
    ("12", "Junin"),
    ("13", "La Libertad"),
    ("14", "Lambayeque"),
    ("15", "Lima"),
    ("16", "Loreto"),
    ("17", "Madre de Dios"),
    ("18", "Moquegua"),
    ("19", "Pasco"),
    ("20", "Piura"),
    ("21", "Puno"),
    ("22", "San Martin"),
    ("23", "Tacna"),
    ("24", "Tumbes"),
    ("25", "Ucayali"),
];

/// Genera registros Ubigeo sintéticos para "departamento - provincia
/// sintética - distrito sintético" usando codigo de 6 digitos derivado.
/// Sirve para que las FK org_units.ubigeo_codigo tengan una entrada valida
/// por departamento. Codigos siguen patron XYYY00 (X=departamento, Y=sufijo).
fn build_departamento_ubigeos() -> Vec<Ubigeo> {
    let now = now_ms();
    DEPARTAMENTOS
        .iter()
        .map(|(dept_code, name)| Ubigeo {
            codigo: format!("{dept_code}0100"),
            departamento: (*name).to_string(),
            provincia: format!("{name} (Prov. Sintetica)"),
            distrito: format!("{name} (Dist. Sintetico)"),
            activo: 1,
            created_at: Some(now),
            updated_at: Some(now),
        })
        .collect()
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

/// Borra la coleccion y re-inserta los registros seed.
pub async fn reseed_ubigeos(db: &Database) -> Result<(), AppError> {
    // Borrado best-effort (ignora si la coleccion no existe).
    let _ = db.collection::<Document>("ubigeos").drop().await;
    for u in build_departamento_ubigeos() {
        repository::upsert(db, &u).await?;
    }
    Ok(())
}

/// Cuenta de ubigeos activos (util para tests y diagnostico).
pub async fn count(db: &Database) -> Result<u64, AppError> {
    let cursor = db
        .collection::<Document>("ubigeos")
        .find(doc! { "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    Ok(docs.len() as u64)
}
