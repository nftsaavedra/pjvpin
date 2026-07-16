use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::catalogos::dto::{CatalogoItemDto, CreateCatalogoRequest, EliminarCatalogoResultadoDto};
use crate::catalogos::models::CatalogoItem;
use crate::shared::error::AppError;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<CatalogoItemDto, AppError> {
    mongodb::bson::from_document::<CatalogoItemDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar catálogo desde BSON: {e}"))
    })
}

fn dto_to_model(dto: CatalogoItemDto) -> CatalogoItem {
    CatalogoItem {
        id_catalogo: dto.id_catalogo,
        tipo: dto.tipo,
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        orden: dto.orden,
        activo: dto.activo,
        updated_at: dto.updated_at,
    }
}

fn model_to_dto(m: &CatalogoItem) -> CatalogoItemDto {
    CatalogoItemDto {
        id_catalogo: m.id_catalogo.clone(),
        tipo: m.tipo.clone(),
        codigo: m.codigo.clone(),
        nombre: m.nombre.clone(),
        descripcion: m.descripcion.clone(),
        orden: m.orden,
        activo: m.activo,
        updated_at: m.updated_at,
    }
}

pub async fn create_catalogo(
    db: &Database,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let item = CatalogoItem::new(gen_uuid(), request)?;
    let dto = model_to_dto(&item);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar catálogo a BSON: {e}"))
    })?;
    db.collection::<Document>("catalogos")
        .insert_one(doc)
        .await?;
    Ok(item)
}

pub async fn get_catalogos_by_tipo(
    db: &Database,
    tipo: &str,
) -> Result<Vec<CatalogoItem>, AppError> {
    let cursor = db
        .collection::<Document>("catalogos")
        .find(doc! { "tipo": tipo, "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut items: Vec<CatalogoItem> = docs
        .into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect::<Result<Vec<_>, _>>()?;
    items.sort_by(|a, b| {
        a.orden
            .unwrap_or(999)
            .cmp(&b.orden.unwrap_or(999))
            .then_with(|| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()))
    });
    Ok(items)
}

pub async fn get_all_catalogos(db: &Database, tipo: &str) -> Result<Vec<CatalogoItem>, AppError> {
    let cursor = db
        .collection::<Document>("catalogos")
        .find(doc! { "tipo": tipo })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut items: Vec<CatalogoItem> = docs
        .into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect::<Result<Vec<_>, _>>()?;
    items.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
    Ok(items)
}

pub async fn get_catalogo_by_id(db: &Database, id: &str) -> Result<CatalogoItem, AppError> {
    let doc_opt = db
        .collection::<Document>("catalogos")
        .find_one(doc! { "id_catalogo": id })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Catálogo no encontrado.".to_string()))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn update_catalogo(
    db: &Database,
    id: &str,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let now = crate::shared::time::now_ms();
    db.collection::<Document>("catalogos")
        .update_one(
            doc! { "id_catalogo": id },
            doc! { "$set": {
                "codigo": request.codigo,
                "nombre": request.nombre,
                "descripcion": request.descripcion,
                "orden": request.orden,
                "updated_at": now,
            }},
        )
        .await?;
    get_catalogo_by_id(db, id).await
}

pub async fn delete_catalogo(
    db: &Database,
    id: &str,
) -> Result<EliminarCatalogoResultadoDto, AppError> {
    db.collection::<Document>("catalogos")
        .update_one(
            doc! { "id_catalogo": id },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;
    Ok(EliminarCatalogoResultadoDto {
        accion: "desactivado".to_string(),
        mensaje: "Catálogo desactivado correctamente.".to_string(),
    })
}

pub async fn reactivar_catalogo(db: &Database, id: &str) -> Result<CatalogoItem, AppError> {
    db.collection::<Document>("catalogos")
        .update_one(
            doc! { "id_catalogo": id },
            doc! { "$set": { "activo": 1i64 } },
        )
        .await?;
    get_catalogo_by_id(db, id).await
}

pub async fn seed_catalogos(db: &Database) -> Result<(), AppError> {
    let count = db
        .collection::<Document>("catalogos")
        .count_documents(doc! {})
        .await?;
    if count > 0 {
        return Ok(());
    }

    let seed = vec![
        ("tipo_patente", "invencion", "Invención", 1),
        ("tipo_patente", "modelo_utilidad", "Modelo de Utilidad", 2),
        ("tipo_patente", "diseno_industrial", "Diseño Industrial", 3),
        ("estado_patente", "solicitada", "Solicitada", 1),
        ("estado_patente", "en_examen", "En Examen", 2),
        ("estado_patente", "concedida", "Concedida", 3),
        ("estado_patente", "rechazada", "Rechazada", 4),
        ("tipo_producto", "software", "Software", 1),
        ("tipo_producto", "prototipo", "Prototipo", 2),
        ("tipo_producto", "metodologia", "Metodología", 3),
        ("tipo_producto", "norma", "Norma Técnica", 4),
        ("tipo_producto", "base_datos", "Base de Datos", 5),
        (
            "etapa_producto",
            "conceptualizacion",
            "Conceptualización",
            1,
        ),
        ("etapa_producto", "prototipo", "Prototipo", 2),
        ("etapa_producto", "validacion", "Validación", 3),
        ("etapa_producto", "produccion", "Producción", 4),
        ("etapa_producto", "comercializacion", "Comercialización", 5),
        ("tipo_financiamiento", "nacional", "Nacional", 1),
        ("tipo_financiamiento", "internacional", "Internacional", 2),
        (
            "tipo_financiamiento",
            "propio",
            "Propio / Autofinanciado",
            3,
        ),
        (
            "tipo_financiamiento",
            "concursable",
            "Fondos Concursables",
            4,
        ),
        ("estado_financiero", "aprobado", "Aprobado", 1),
        ("estado_financiero", "desembolsado", "Desembolsado", 2),
        ("estado_financiero", "en_proceso", "En Proceso", 3),
        ("estado_financiero", "finalizado", "Finalizado", 4),
        ("estado_financiero", "cancelado", "Cancelado", 5),
        ("moneda", "PEN", "Sol Peruano (PEN)", 1),
        ("moneda", "USD", "Dólar (USD)", 2),
        ("moneda", "EUR", "Euro (EUR)", 3),
    ];

    for (tipo, codigo, nombre, orden) in seed {
        create_catalogo(
            db,
            CreateCatalogoRequest {
                tipo: tipo.to_string(),
                codigo: codigo.to_string(),
                nombre: nombre.to_string(),
                descripcion: None,
                orden: Some(orden),
            },
        )
        .await?;
    }
    Ok(())
}

/// Carga catálogos activos en un `HashMap` indexado por `(tipo, codigo)`.
pub async fn load_all_map(
    db: &Database,
) -> Result<HashMap<(String, String), CatalogoItem>, AppError> {
    let cursor = db
        .collection::<Document>("catalogos")
        .find(doc! { "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map = HashMap::new();
    for d in docs {
        let m = dto_to_model(doc_to_dto(d)?);
        map.insert((m.tipo.clone(), m.codigo.clone()), m);
    }
    Ok(map)
}
