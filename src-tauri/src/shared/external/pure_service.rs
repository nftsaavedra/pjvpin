use std::convert::TryFrom;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::options::UpdateOptions;

use crate::investigadores::dto::{PublicacionDto, SyncPublicacionesResult};
use crate::investigadores::models::Publicacion;
use crate::shared::error::AppError;
use crate::shared::external::pure_client;
use crate::shared::state::AppState;
use crate::shared::time;

pub async fn sync_publicaciones(
    state: &AppState,
    investigador_id: &str,
) -> Result<SyncPublicacionesResult, AppError> {
    let db = state.mongo_db()?;

    let investigador =
        crate::investigadores::repository::get_investigador_by_id(db, investigador_id).await?;

    let scopus_author_id = investigador
        .renacyt_scopus_author_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::InternalError(
                "El investigador no tiene un Scopus Author ID registrado. \
                Sincronice primero los datos RENACYT del investigador para obtenerlo."
                    .to_string(),
            )
        })?;

    let pure_person_uuid = pure_client::resolve_person_uuid(&state.pure_config, scopus_author_id)
        .await
        .unwrap_or(None);

    let fetched =
        pure_client::fetch_research_outputs_by_scopus_id(&state.pure_config, scopus_author_id)
            .await?;

    let total_encontradas = fetched.len();
    let mut nuevas = 0usize;
    let mut actualizadas = 0usize;
    let now_ms = time::now_ms();

    let col = db.collection::<Document>("publicaciones");

    for fp in fetched {
        let filter = doc! { "pure_uuid": &fp.pure_uuid };

        let set_doc = doc! {
            "investigador_id":      investigador_id,
            "titulo":               &fp.titulo,
            "tipo_publicacion":     fp.tipo_publicacion.as_deref(),
            "doi":                  fp.doi.as_deref(),
            "scopus_eid":           fp.scopus_eid.as_deref(),
            "anio_publicacion":     fp.anio_publicacion,
            "autores_json":         &fp.autores_json,
            "estado_publicacion":   fp.estado_publicacion.as_deref(),
            "journal_titulo":       fp.journal_titulo.as_deref(),
            "issn":                 fp.issn.as_deref(),
            "pure_sincronizado_at": now_ms,
            "updated_at":           now_ms,
        };

        let new_id = uuid::Uuid::new_v4().to_string();
        let set_on_insert_doc = doc! {
            "id_publicacion": &new_id,
            "pure_uuid":      &fp.pure_uuid,
            "proyecto_id":    mongodb::bson::Bson::Null,
            "created_at":     now_ms,
        };

        let update = doc! {
            "$set":         set_doc,
            "$setOnInsert": set_on_insert_doc,
        };

        let opts = UpdateOptions::builder().upsert(true).build();
        let result = col.update_one(filter, update).with_options(opts).await?;

        if result.upserted_id.is_some() {
            nuevas += 1;
        } else if result.modified_count > 0 {
            actualizadas += 1;
        }
    }

    Ok(SyncPublicacionesResult {
        persona_id: investigador_id.to_string(),
        scopus_author_id: scopus_author_id.to_string(),
        pure_person_uuid,
        total_encontradas,
        nuevas,
        actualizadas,
    })
}

pub async fn get_publicaciones(
    state: &AppState,
    investigador_id: &str,
) -> Result<Vec<Publicacion>, AppError> {
    let db = state.mongo_db()?;
    let cursor = db
        .collection::<Document>("publicaciones")
        .find(doc! { "investigador_id": investigador_id })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| {
            let dto: PublicacionDto = mongodb::bson::from_document(d).map_err(|e| {
                AppError::InternalError(format!("No se pudo deserializar publicación: {e}"))
            })?;
            Publicacion::try_from(dto)
        })
        .collect()
}
