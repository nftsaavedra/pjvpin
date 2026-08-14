//! Macros compartidas para features que comparten forma de persistencia.
//!
//! `impl_pivot_repository!` cubre los 5 pivots M:N del alineamiento CONCYTEC/PeruCRIS
//! (`proyecto_organizaciones`, `proyecto_financiamientos`, `patente_inventores`,
//! `patente_titulares`, `publicaciones/autores`). Centraliza insert, listado por
//! padre, borrado simple, borrado en cascada del padre e indices UNIQUE para
//! evitar duplicacion cross-feature y mantener el principio DRY.
//!
//! Convenciones de los pivots:
//! - Modelo de dominio con `From<Doc>` para round-trip desde BSON.
//! - Doc con `#[serde(rename = "_id")] id` y campos FK tipados.
//! - `uniqueness_key()` define la clave de unicidad materializada (la macro
//!   acepta los nombres de campo para construir el indice compuesto).
//! - `parent_field` es el FK al padre (ej. `id_proyecto`) usado para
//!   `list_by_<fn>` y `delete_for_<fn>` (cascade).
//!
//! Reglas de uso:
//! - El feature declara el modelo y el Doc en el archivo del pivot.
//! - El feature invoca la macro en su `repository.rs` o en el archivo del
//!   pivot si no hay `repository.rs` separado.
//! - Las validaciones de FK (ensure_exists) se hacen antes de invocar `insert`,
//!   idealmente en el handler o en una capa superior. La macro asume que el
//!   modelo ya fue validado por su `new()`.

/// Genera las funciones de persistencia de un pivot M:N.
///
/// Genera:
/// - `insert(db, model)` — serializa a BSON e inserta.
/// - `$list_fn(db, parent_id)` — lista por el campo padre (nombre pasado).
/// - `delete(db, id)` — borrado fisico por `_id`.
/// - `$delete_cascade_fn(db, parent_id)` — borrado fisico en cascada.
/// - `ensure_indexes(db)` — UNIQUE compuesto por `uniqueness_fields` +
///   indice simple por `parent_field` para cascades rapidas.
///
/// Type parameters:
/// - `$model:ty` — modelo de dominio con `From<Doc>` (round-trip).
/// - `$doc:ty` — DTO BSON con `_id` y los campos del pivot.
/// - `$collection:expr` — nombre de la coleccion Mongo (string literal).
/// - `$parent_field:ident` — campo FK al padre (ej. `id_proyecto`).
/// - `$list_fn:ident` — nombre de la funcion `list_by_*` (ej. `list_by_proyecto`).
/// - `$delete_cascade_fn:ident` — nombre de la funcion cascade (ej. `delete_for_proyecto`).
/// - `$uniqueness_fields:expr` — array `&[&str]` con los nombres de campo
///   que forman la clave de unicidad.
/// - `$error_label:expr` — string para mensajes de error y nombre del indice.
#[macro_export]
macro_rules! impl_pivot_repository {
    (
        $model:ty,
        $doc:ty,
        $collection:expr,
        $parent_field:ident,
        $list_fn:ident,
        $delete_cascade_fn:ident,
        $uniqueness_fields:expr,
        $error_label:expr
    ) => {
        /// Inserta un registro nuevo en la coleccion del pivot.
        /// El caller es responsable de haber validado el modelo (incluyendo
        /// unicidad y FKs) con el constructor `Model::new`.
        pub async fn insert(
            db: &mongodb::Database,
            model: &$model,
        ) -> Result<(), $crate::shared::error::AppError> {
            let dto: $doc = model.clone().into();
            let doc = mongodb::bson::to_document(&dto).map_err(|e| {
                $crate::shared::error::AppError::InternalError(format!(
                    "No se pudo serializar el pivot {} a BSON: {e}",
                    $error_label
                ))
            })?;
            db.collection::<mongodb::bson::Document>($collection)
                .insert_one(doc)
                .await?;
            Ok(())
        }

        /// Lista los registros del pivot cuyo campo padre coincide con `parent_id`.
        pub async fn $list_fn(
            db: &mongodb::Database,
            parent_id: &str,
        ) -> Result<Vec<$model>, $crate::shared::error::AppError> {
            use futures_util::TryStreamExt;
            let cursor = db
                .collection::<mongodb::bson::Document>($collection)
                .find(mongodb::bson::doc! { stringify!($parent_field): parent_id })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            docs.into_iter()
                .map(|d| {
                    let dto: $doc = mongodb::bson::from_document(d).map_err(|e| {
                        $crate::shared::error::AppError::InternalError(format!(
                            "No se pudo deserializar el pivot {} desde BSON: {e}",
                            $error_label
                        ))
                    })?;
                    Ok(<$model as From<$doc>>::from(dto))
                })
                .collect::<Result<Vec<$model>, $crate::shared::error::AppError>>()
        }

        /// Borra en cascada todos los registros del pivot cuyo campo padre
        /// coincide con `parent_id`. Usado por los handlers de borrado del
        /// padre para mantener consistencia referencial.
        pub async fn $delete_cascade_fn(
            db: &mongodb::Database,
            parent_id: &str,
        ) -> Result<u64, $crate::shared::error::AppError> {
            let result = db
                .collection::<mongodb::bson::Document>($collection)
                .delete_many(mongodb::bson::doc! { stringify!($parent_field): parent_id })
                .await?;
            Ok(result.deleted_count)
        }

        /// Borra un registro del pivot por su `_id`.
        pub async fn delete(
            db: &mongodb::Database,
            id: &str,
        ) -> Result<(), $crate::shared::error::AppError> {
            db.collection::<mongodb::bson::Document>($collection)
                .delete_one(mongodb::bson::doc! { "_id": id })
                .await?;
            Ok(())
        }

        /// Crea los indices del pivot:
        /// - UNIQUE compuesto por los campos de `$uniqueness_fields`.
        /// - Simple por el campo padre para acelerar list/cascade.
        pub async fn ensure_indexes(
            db: &mongodb::Database,
        ) -> Result<(), $crate::shared::error::AppError> {
            use mongodb::bson::doc;
            use mongodb::IndexModel;

            let uniqueness_keys: mongodb::bson::Document = $uniqueness_fields
                .iter()
                .map(|k| (*k, 1i32))
                .collect::<Vec<(&str, i32)>>()
                .into_iter()
                .fold(doc! {}, |mut acc, (k, v)| {
                    acc.insert(k, v);
                    acc
                });
            db.collection::<mongodb::bson::Document>($collection)
                .create_index(
                    IndexModel::builder()
                        .keys(uniqueness_keys)
                        .options(
                            mongodb::options::IndexOptions::builder()
                                .unique(true)
                                .name(Some(format!("uniq_{}", $error_label).replace(' ', "_")))
                                .build(),
                        )
                        .build(),
                )
                .await?;
            db.collection::<mongodb::bson::Document>($collection)
                .create_index(
                    IndexModel::builder()
                        .keys(doc! { stringify!($parent_field): 1i32 })
                        .build(),
                )
                .await?;
            Ok(())
        }
    };
}
