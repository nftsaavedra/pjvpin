use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::options::IndexOptions;
use mongodb::{Database, IndexModel};

use crate::catalogos::dto::{CatalogoItemDoc, CreateCatalogoRequest, EliminarCatalogoResultadoDto};
use crate::catalogos::models::CatalogoItem;
use crate::shared::error::AppError;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_model(doc: Document) -> Result<CatalogoItem, AppError> {
    let parsed = mongodb::bson::from_document::<CatalogoItemDoc>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar catálogo desde BSON: {e}"))
    })?;
    Ok(CatalogoItem::from(parsed))
}

pub async fn create_catalogo(
    db: &Database,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let item = CatalogoItem::new(gen_uuid(), request)?;
    let doc_struct: CatalogoItemDoc = item.clone().into();
    let doc = mongodb::bson::to_document(&doc_struct).map_err(|e| {
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
        .map(doc_to_model)
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
        .map(doc_to_model)
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
    doc_to_model(doc)
}

pub async fn update_catalogo(
    db: &Database,
    id: &str,
    request: CreateCatalogoRequest,
) -> Result<CatalogoItem, AppError> {
    let existing = get_catalogo_by_id(db, id).await?;
    // Guard de integridad: los items oficiales CONCYTEC (editable=0) solo
    // se actualizan via reimport de vocabularios, nunca por edicion directa.
    if existing.editable == 0 {
        return Err(AppError::InternalError(
            "Los vocablos oficiales CONCYTEC no se pueden editar directamente. \
             Use 'Reimportar vocabulario' para actualizarlos."
                .to_string(),
        ));
    }
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
        if let Err(e) = create_catalogo(
            db,
            CreateCatalogoRequest {
                tipo: tipo.to_string(),
                codigo: codigo.to_string(),
                nombre: nombre.to_string(),
                descripcion: None,
                orden: Some(orden),
                esquema: None,
                codigo_skos: None,
                padre_codigo: None,
                nivel: None,
                etiquetas: None,
                editable: true,
            },
        )
        .await
        {
            if matches!(e, AppError::UniqueConstraintViolation(_)) {
                tracing::debug!(tipo, codigo, "catalogo ya existe, skip (seed defensivo)");
                continue;
            }
            return Err(e);
        }
    }
    Ok(())
}

/// Carga catálogos activos en un `HashMap` indexado por `(tipo, codigo)`.
/// Lista los vocabularios CONCYTEC disponibles (esquemas distintos). Solo
/// devuelve esquemas que tengan al menos un item activo. Util para poblar el
/// selector de esquemas en la UI de gestion de vocabularios.
pub async fn list_vocabularios(db: &Database) -> Result<Vec<String>, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<Document>("catalogos")
        .find(doc! { "activo": 1i64, "esquema": { "$exists": true, "$ne": null } })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut esquemas: Vec<String> = docs
        .into_iter()
        .filter_map(|d| d.get_str("esquema").ok().map(|s| s.to_string()))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    esquemas.sort();
    Ok(esquemas)
}

/// Lista los items activos de un esquema CONCYTEC, opcionalmente filtrado
/// por `padre_codigo` (SKOS broader) para construir el arbol jerarquico.
pub async fn list_vocab_items_by_esquema(
    db: &Database,
    esquema: &str,
    padre_codigo: Option<&str>,
) -> Result<Vec<CatalogoItem>, AppError> {
    use futures_util::TryStreamExt;
    if esquema.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el esquema de vocabulario.".to_string(),
        ));
    }
    let mut filter = doc! { "esquema": esquema, "activo": 1i64 };
    if let Some(p) = padre_codigo {
        filter.insert("padre_codigo", p);
    }
    let cursor = db.collection::<Document>("catalogos").find(filter).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut items: Vec<CatalogoItem> = docs
        .into_iter()
        .map(doc_to_model)
        .collect::<Result<Vec<_>, _>>()?;
    items.sort_by(|a, b| {
        a.nivel
            .unwrap_or(999)
            .cmp(&b.nivel.unwrap_or(999))
            .then_with(|| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()))
    });
    Ok(items)
}

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
        let m = doc_to_model(d)?;
        map.insert((m.tipo.clone(), m.codigo.clone()), m);
    }
    Ok(map)
}

/// Garantiza indices UNIQUE para evitar duplicados y acelerar lookups por
/// esquema + codigo_skos (validacion de FK en `shared::refs::ensure_vocab_active`).
///
/// Idempotente: dropea TODOS los indices non-_id y los recrea con el spec
/// actual. Asi evita `IndexOptionsConflict` en cualquier combinacion de
/// upgrades (el spec antiguo en DB con nombre auto/explicito v1 ya no
/// interfiere).
pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    let coll = db.collection::<Document>("catalogos");
    let _ = coll.drop_indexes().await;
    coll.create_index(
        IndexModel::builder()
            .keys(doc! { "tipo": 1, "codigo": 1 })
            .options(Some(IndexOptions::builder().unique(true).build()))
            .build(),
    )
    .await?;
    coll.create_index(
        IndexModel::builder()
            .keys(doc! { "esquema": 1, "codigo_skos": 1 })
            .options(Some(
                IndexOptions::builder().unique(true).sparse(true).build(),
            ))
            .build(),
    )
    .await?;
    coll.create_index(
        IndexModel::builder()
            .keys(doc! { "esquema": 1, "padre_codigo": 1 })
            .build(),
    )
    .await?;
    Ok(())
}
