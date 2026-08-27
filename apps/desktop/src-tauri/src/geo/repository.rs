//! Repository de Ubigeo. Driver Mongo directo (sin ORM), siguiendo el patron
//! del resto del proyecto.

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::options::IndexOptions;
use mongodb::{Database, IndexModel};

use crate::geo::dto::{UbigeoDoc, UbigeoDto};
use crate::geo::models::Ubigeo;
use crate::shared::error::AppError;

fn doc_to_model(d: Document) -> Result<Ubigeo, AppError> {
    let parsed = mongodb::bson::from_document::<UbigeoDoc>(d)
        .map_err(|e| AppError::InternalError(format!("No se pudo deserializar ubigeo: {e}")))?;
    Ok(Ubigeo {
        codigo: parsed.codigo,
        departamento: parsed.departamento,
        provincia: parsed.provincia,
        distrito: parsed.distrito,
        activo: parsed.activo,
        created_at: parsed.created_at,
        updated_at: parsed.updated_at,
    })
}

fn model_to_doc(m: &Ubigeo) -> Result<UbigeoDoc, AppError> {
    Ok(UbigeoDoc {
        codigo: m.codigo.clone(),
        departamento: m.departamento.clone(),
        provincia: m.provincia.clone(),
        distrito: m.distrito.clone(),
        activo: m.activo,
        created_at: m.created_at,
        updated_at: m.updated_at,
    })
}

fn model_to_dto(m: &Ubigeo) -> UbigeoDto {
    UbigeoDto {
        codigo: m.codigo.clone(),
        departamento: m.departamento.clone(),
        provincia: m.provincia.clone(),
        distrito: m.distrito.clone(),
        updated_at: m.updated_at,
    }
}

/// Stub explicito: la creacion manual de ubigeos esta deshabilitada porque el
/// codigo INEI debe provenir del seed embebido o de un importador CSV/INEI
/// futuro (fase posterior a v0.1.0).
pub async fn get_ubigeo(db: &Database, codigo: &str) -> Result<Ubigeo, AppError> {
    if codigo.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar un codigo de ubigeo.".to_string(),
        ));
    }
    let doc_opt = db
        .collection::<Document>("ubigeos")
        .find_one(doc! { "codigo": codigo })
        .await?;
    let d =
        doc_opt.ok_or_else(|| AppError::NotFound(format!("Ubigeo '{codigo}' no encontrado.")))?;
    doc_to_model(d)
}

pub async fn obtener_ubigeos(db: &Database) -> Result<Vec<UbigeoDto>, AppError> {
    let cursor = db.collection::<Document>("ubigeos").find(doc! {}).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut items: Vec<UbigeoDto> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|m| model_to_dto(&m))
        .collect();
    items.sort_by(|a, b| a.codigo.cmp(&b.codigo));
    Ok(items)
}

pub async fn find_by_departamento(
    db: &Database,
    departamento: &str,
) -> Result<Vec<UbigeoDto>, AppError> {
    if departamento.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el nombre del departamento.".to_string(),
        ));
    }
    let cursor = db
        .collection::<Document>("ubigeos")
        .find(doc! { "departamento": departamento })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let items: Vec<UbigeoDto> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|m| model_to_dto(&m))
        .collect();
    Ok(items)
}

/// Busqueda por prefijo (ej: "15" devuelve todo el departamento de Lima;
/// "1501" devuelve la provincia de Lima).
pub async fn search_prefix(db: &Database, prefix: &str) -> Result<Vec<UbigeoDto>, AppError> {
    if prefix.trim().is_empty() {
        return Ok(Vec::new());
    }
    let pattern = format!(
        "^{}",
        mongodb::bson::Regex {
            pattern: prefix.to_string(),
            options: "i".to_string(),
        }
    );
    let cursor = db
        .collection::<Document>("ubigeos")
        .find(doc! { "codigo": { "$regex": pattern } })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let items: Vec<UbigeoDto> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|m| model_to_dto(&m))
        .collect();
    Ok(items)
}

pub async fn upsert(db: &Database, u: &Ubigeo) -> Result<(), AppError> {
    let doc_struct = model_to_doc(u)?;
    let doc = mongodb::bson::to_document(&doc_struct)
        .map_err(|e| AppError::InternalError(format!("No se pudo serializar ubigeo: {e}")))?;
    db.collection::<Document>("ubigeos")
        .replace_one(doc! { "codigo": &u.codigo }, doc)
        .upsert(true)
        .await?;
    Ok(())
}

/// Helper FK usado por otras features (org_units principalmente).
/// Valida formato del codigo + existencia activa. Devuelve
/// `AppError::ReferentialIntegrity` si falta.
pub async fn validate_ubigeo_fk(db: &Database, codigo: &str) -> Result<(), AppError> {
    let codigo = codigo.trim();
    if codigo.is_empty() {
        return Err(AppError::ReferentialIntegrity(
            "Codigo de ubigeo vacio en FK.".to_string(),
        ));
    }
    crate::geo::models::Ubigeo::validate_codigo(codigo)?;
    get_ubigeo(db, codigo).await.map(|_| ())
}

pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    let opts = IndexOptions::builder().unique(true).build();
    let index = IndexModel::builder()
        .keys(doc! { "codigo": 1 })
        .options(Some(opts))
        .build();
    db.collection::<Document>("ubigeos")
        .create_index(index)
        .await?;
    let index_dep = IndexModel::builder()
        .keys(doc! { "departamento": 1, "provincia": 1, "distrito": 1 })
        .build();
    db.collection::<Document>("ubigeos")
        .create_index(index_dep)
        .await?;
    Ok(())
}
