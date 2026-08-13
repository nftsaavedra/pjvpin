//! Helpers de integridad referencial sobre MongoDB.
//!
//! MongoDB Atlas no impone FK en el motor. Esta capa "Rust-side" simula la
//! semantica 3NF (RESTRICT / CASCADE) exigida por el modelo de datos
//! requerido por CONCYTEC/PeruCRIS, garantizando:
//!
//! - Antes de crear cualquier documento con FK, el documento referenciado
//!   existe.
//! - Antes de borrar un documento "maestro" (`org_units`, `investigadores`,
//!   `fundings`, `catalogos`, `geo`), se valida que ninguna coleccion pivote
//!   apunta a el; si existe, se rechaza con `AppError::ReferentialIntegrity`.
//!
//! Sin cache por simplicidad; los round-trips a MongoDB son aceptables. Un
//! TTL-cache (std::sync::OnceLock<HashMap>) puede agregarse si los profiling
//! muestran hot paths.

use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::shared::error::AppError;

/// Verifica que existe un documento con PK igual a `id` en la coleccion.
pub async fn ensure_exists(db: &Database, collection: &str, id: &str) -> Result<(), AppError> {
    if id.trim().is_empty() {
        return Err(AppError::ReferentialIntegrity(format!(
            "Referencia vacia hacia la coleccion '{}'.",
            collection
        )));
    }
    let doc_opt = lookup_by_pk(db, collection, id).await?;
    if doc_opt.is_some() {
        Ok(())
    } else {
        Err(missing(collection, id))
    }
}

/// Variante que distingue entre "no existe" y "existe pero desactivado".
/// Usar cuando la regla de negocio exige activar antes de reutilizar.
pub async fn ensure_active(db: &Database, collection: &str, id: &str) -> Result<(), AppError> {
    if id.trim().is_empty() {
        return Err(AppError::ReferentialIntegrity(format!(
            "Referencia vacia hacia la coleccion '{}'.",
            collection
        )));
    }
    let doc_opt = lookup_by_pk(db, collection, id).await?;
    match doc_opt {
        None => Err(missing(collection, id)),
        Some(d) => {
            let activo = d
                .get_i64("activo")
                .ok()
                .or_else(|| d.get_bool("activo").ok().map(|b| if b { 1 } else { 0 }));
            match activo {
                Some(1) => Ok(()),
                _ => Err(AppError::ReferentialIntegrity(format!(
                    "La referencia '{}/{}' esta desactivada.",
                    collection, id
                ))),
            }
        }
    }
}

/// Verifica que `codigo_skos` pertenece al esquema `esquema` y esta activo
/// en la coleccion de catalogos. Usado por todos los FK contra vocabularios
/// CONCYTEC (15 esquemas). Lookup por `esquema` y `codigo_skos` con `activo=1`.
pub async fn ensure_vocab_active(
    db: &Database,
    esquema: &str,
    codigo_skos: &str,
) -> Result<(), AppError> {
    if esquema.trim().is_empty() || codigo_skos.trim().is_empty() {
        return Err(AppError::ReferentialIntegrity(format!(
            "Referencia de vocabulario invalida ({}/{}).",
            esquema, codigo_skos
        )));
    }
    let doc_opt = db
        .collection::<Document>("catalogos")
        .find_one(doc! {
            "esquema": esquema,
            "codigo_skos": codigo_skos,
            "activo": 1i64
        })
        .await?;
    if doc_opt.is_some() {
        Ok(())
    } else {
        Err(AppError::ReferentialIntegrity(format!(
            "El codigo '{}' no esta registrado en el vocabulario '{}'.",
            codigo_skos, esquema
        )))
    }
}

/// ON DELETE RESTRICT: garantiza que ninguna coleccion en
/// `referencing_collections` tiene un documento apuntando a `id`.
pub async fn assert_not_referenced(
    db: &Database,
    target_collection: &str,
    target_id: &str,
    referencing_collections: &[(&str, &str)],
) -> Result<(), AppError> {
    if target_id.trim().is_empty() {
        return Ok(());
    }
    for (coll, fk_field) in referencing_collections {
        let fk_name: &str = fk_field;
        let count = db
            .collection::<Document>(coll)
            .count_documents(doc! { fk_name: &target_id })
            .await?;
        if count > 0 {
            return Err(AppError::ReferentialIntegrity(format!(
                "No se puede eliminar {}/{} porque {} documentos en '{}' lo referencian.",
                target_collection, target_id, count, coll
            )));
        }
    }
    Ok(())
}

/// ON DELETE CASCADE helper: elimina filas en colecciones pivote que apunten
/// al `parent_id`. Devuelve el total de filas borradas.
pub async fn delete_referencing(
    db: &Database,
    parent_id: &str,
    referencing_collections: &[(&str, &str)],
) -> Result<u64, AppError> {
    let mut total: u64 = 0;
    for (coll, fk_field) in referencing_collections {
        let fk_name: &str = fk_field;
        let res = db
            .collection::<Document>(coll)
            .delete_many(doc! { fk_name: &parent_id })
            .await?;
        total += res.deleted_count;
    }
    Ok(total)
}

/// Lookup un documento por cualquiera de sus PK canonicas (`_id` o los
/// campos `id_*`). MongoDB Atlas no requiere `_id` fijo; el sistema usa
/// identificadores semanticos por entidad.
async fn lookup_by_pk(
    db: &Database,
    collection: &str,
    id: &str,
) -> Result<Option<Document>, AppError> {
    let filter = doc! {
        "$or": [
            { "_id": id },
            { "id_org_unit": id },
            { "id_financiamiento": id },
            { "id_investigador": id },
            { "id_grupo": id },
            { "id_persona": id },
            { "id_proyecto": id },
            { "id_publicacion": id },
            { "id_patente": id },
            { "id_equipamiento": id },
            { "id_ubigeo": id },
            { "id_catalogo": id },
        ]
    };
    let result = db
        .collection::<Document>(collection)
        .find_one(filter)
        .await?;
    Ok(result)
}

fn missing(collection: &str, id: &str) -> AppError {
    AppError::ReferentialIntegrity(format!("La referencia '{}/{}' no existe.", collection, id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_error_message_includes_both() {
        let e = missing("foo", "bar");
        match e {
            AppError::ReferentialIntegrity(m) => {
                assert!(m.contains("foo"));
                assert!(m.contains("bar"));
            }
            _ => panic!("expected ReferentialIntegrity"),
        }
    }
}
