//! Helpers para validar jerarquias autoreferenciales (`parent_id`).
//!
//! Impiden que un nodo sea su propio padre y que se formen ciclos al
//! ascender por la cadena de `parent_id`. Usado por `org_units` y
//! `fundings`.

use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::shared::error::AppError;

/// Constante de seguridad: limite superior del recorrido de la cadena de
/// padres. Cualquier jerarquia real deberia estar muy por debajo.
const MAX_ASCENT_DEPTH: usize = 10_000;

/// Garantiza que `parent_id != child_id`.
pub fn assert_not_self_parent(child_id: &str, parent_id: &str) -> Result<(), AppError> {
    if !parent_id.is_empty() && parent_id == child_id {
        return Err(AppError::ReferentialIntegrity(format!(
            "Una unidad no puede ser su propio padre ('{}').",
            child_id
        )));
    }
    Ok(())
}

/// Verifica que ascender recursivamente por `parent_field` desde `id`
/// llega a `None` sin visitar a `id` de nuevo (ciclo). Si la cadena excede
/// `MAX_ASCENT_DEPTH` se asume ciclo defensivo.
pub async fn assert_no_cycle(
    db: &Database,
    collection: &str,
    id: &str,
    parent_field: &str,
) -> Result<(), AppError> {
    if id.trim().is_empty() {
        return Err(AppError::InternalError(
            "Id vacio para validacion de jerarquia.".to_string(),
        ));
    }
    let mut current: Option<String> = Some(id.to_string());
    let mut visited = 0usize;

    while let Some(cur) = current {
        if visited > MAX_ASCENT_DEPTH {
            return Err(AppError::ReferentialIntegrity(format!(
                "Jerarquia excesivamente profunda (>{}); posible ciclo.",
                MAX_ASCENT_DEPTH
            )));
        }
        let parent_opt = fetch_parent(db, collection, &cur, parent_field).await?;
        match parent_opt {
            None => return Ok(()),
            Some(p) if p.is_empty() => return Ok(()),
            Some(p) if p == cur => {
                return Err(AppError::ReferentialIntegrity(
                    "Ciclo detectado: el padre apunta al mismo nodo.".to_string(),
                ));
            }
            Some(p) => {
                current = Some(p);
            }
        }
        visited += 1;
    }
    Ok(())
}

async fn fetch_parent(
    db: &Database,
    collection: &str,
    id: &str,
    parent_field: &str,
) -> Result<Option<String>, AppError> {
    let filter = doc! { "$or": [
        { "_id": id },
        { "id_org_unit": id },
        { "id_financiamiento": id },
    ]};
    let doc_opt = db
        .collection::<Document>(collection)
        .find_one(filter)
        .await?;
    let parent = doc_opt.and_then(|d| d.get_str(parent_field).ok().map(|v| v.to_string()));
    Ok(parent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_parent_rejected() {
        let r = assert_not_self_parent("abc", "abc");
        assert!(r.is_err());
    }

    #[test]
    fn empty_parent_allowed() {
        let r = assert_not_self_parent("abc", "");
        assert!(r.is_ok());
    }

    #[test]
    fn different_ids_allowed() {
        let r = assert_not_self_parent("abc", "def");
        assert!(r.is_ok());
    }
}
