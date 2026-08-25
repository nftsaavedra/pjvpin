use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::publicaciones::dto::{
    CreatePublicacionRequest, PublicacionCientificaDto, UpdatePublicacionRequest,
};
use crate::publicaciones::models::PublicacionCientifica;
use crate::shared::error::AppError;
use crate::shared::time;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<PublicacionCientificaDto, AppError> {
    mongodb::bson::from_document::<PublicacionCientificaDto>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar publicación desde BSON: {e}"
        ))
    })
}

fn dto_to_model(dto: PublicacionCientificaDto) -> PublicacionCientifica {
    PublicacionCientifica {
        id: dto.id,
        id_publicacion: dto.id_publicacion,
        titulo: dto.titulo,
        doi: dto.doi.clone(),
        issn: dto.issn,
        anio: dto.anio,
        cuartil: dto.cuartil,
        tipo: dto.tipo,
        resumen: dto.resumen,
        palabras_clave: dto.palabras_clave,
        created_at: dto.created_at,
        updated_at: dto.updated_at,
        activo: dto.activo,
        handle_url: dto.handle_url,
        fecha_publicacion: dto.fecha_publicacion,
        editorial: dto.editorial,
        id_org_unit_editora: dto.id_org_unit_editora,
        revista_titulo: dto.revista_titulo,
        isbn: dto.isbn,
        scimago_cuartil: dto.scimago_cuartil,
        wos_cuartil: dto.wos_cuartil,
        es_revisado_por_pares: dto.es_revisado_por_pares,
        acceso_abierto: dto.acceso_abierto,
        idioma: dto.idioma,
        volumen: dto.volumen,
        numero_issue: dto.numero_issue,
        paginas: dto.paginas,
        dominio_origen: dto.dominio_origen,
        pure_uuid: dto.pure_uuid,
        estado_publicacion: dto.estado_publicacion,
        id_proyecto: dto.id_proyecto,
        perucris_uuid: dto.perucris_uuid,
    }
}

pub(crate) fn model_to_dto(m: &PublicacionCientifica) -> PublicacionCientificaDto {
    PublicacionCientificaDto {
        id: m.id.clone(),
        id_publicacion: m.id_publicacion.clone(),
        titulo: m.titulo.clone(),
        doi: m.doi.clone(),
        issn: m.issn.clone(),
        anio: m.anio,
        cuartil: m.cuartil.clone(),
        tipo: m.tipo.clone(),
        resumen: m.resumen.clone(),
        palabras_clave: m.palabras_clave.clone(),
        created_at: m.created_at,
        updated_at: m.updated_at,
        activo: m.activo,
        handle_url: m.handle_url.clone(),
        fecha_publicacion: m.fecha_publicacion,
        editorial: m.editorial.clone(),
        id_org_unit_editora: m.id_org_unit_editora.clone(),
        revista_titulo: m.revista_titulo.clone(),
        isbn: m.isbn.clone(),
        scimago_cuartil: m.scimago_cuartil.clone(),
        wos_cuartil: m.wos_cuartil.clone(),
        es_revisado_por_pares: m.es_revisado_por_pares,
        acceso_abierto: m.acceso_abierto.clone(),
        idioma: m.idioma.clone(),
        volumen: m.volumen.clone(),
        numero_issue: m.numero_issue.clone(),
        paginas: m.paginas.clone(),
        dominio_origen: m.dominio_origen.clone(),
        pure_uuid: m.pure_uuid.clone(),
        estado_publicacion: m.estado_publicacion.clone(),
        id_proyecto: m.id_proyecto.clone(),
        perucris_uuid: m.perucris_uuid.clone(),
    }
}

pub async fn create(
    db: &Database,
    request: CreatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let pub_entity = PublicacionCientifica::new(gen_uuid(), request)?;
    let dto = model_to_dto(&pub_entity);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar publicación a BSON: {e}"))
    })?;
    db.collection::<Document>("publicaciones_cientificas")
        .insert_one(doc)
        .await?;
    Ok(pub_entity)
}

pub async fn get_all(db: &Database) -> Result<Vec<PublicacionCientifica>, AppError> {
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn get_by_id(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    let doc_opt = db
        .collection::<Document>("publicaciones_cientificas")
        .find_one(doc! { "id_publicacion": id, "activo": 1 })
        .await?;
    let doc =
        doc_opt.ok_or_else(|| AppError::NotFound("Publicación no encontrada.".to_string()))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn get_by_investigador(
    db: &Database,
    investigador_id: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    // F3/D10: `autores_ids` fue removido; los autores viven en el pivot
    // `publicacion_autores`. Resolvemos la persona_id del investigador y
    // consultamos el pivot para obtener los ids de publicacion.
    use crate::shared::data_loader;
    let persona_id = data_loader::load_investigadores_map(db)
        .await?
        .get(investigador_id)
        .map(|i| i.persona_id.clone());
    let Some(persona_id) = persona_id else {
        return Ok(Vec::new());
    };
    let mut ids_publicacion: Vec<String> = Vec::new();
    {
        let cursor = db
            .collection::<Document>("publicacion_autores")
            .find(doc! { "id_persona": persona_id })
            .await?;
        let docs: Vec<Document> = cursor.try_collect().await?;
        for d in docs {
            if let Ok(p) = mongodb::bson::from_document::<
                crate::publicaciones::autores::PublicacionAutorDoc,
            >(d)
            {
                ids_publicacion.push(p.id_publicacion);
            }
        }
    }
    if ids_publicacion.is_empty() {
        return Ok(Vec::new());
    }
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "id_publicacion": { "$in": &ids_publicacion }, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn get_by_anio(db: &Database, anio: i32) -> Result<Vec<PublicacionCientifica>, AppError> {
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! { "anio": anio, "activo": 1 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

/// Lista las publicaciones Software asociadas a un proyecto (reemplaza
/// `get_productos_by_proyecto` tras la consolidacion D5).
pub async fn get_software_by_proyecto(
    db: &Database,
    id_proyecto: &str,
) -> Result<Vec<PublicacionCientifica>, AppError> {
    use crate::shared::vocab_mapper::PUBLICACION_TIPO_SOFTWARE;
    let cursor = db
        .collection::<Document>("publicaciones_cientificas")
        .find(doc! {
            "id_proyecto": id_proyecto,
            "tipo": PUBLICACION_TIPO_SOFTWARE,
            "activo": 1,
        })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter()
        .map(|d| doc_to_dto(d).map(dto_to_model))
        .collect()
}

pub async fn update(
    db: &Database,
    id: &str,
    request: UpdatePublicacionRequest,
) -> Result<PublicacionCientifica, AppError> {
    let now = time::now_ms();
    let mut set = doc! { "updated_at": now };

    if let Some(v) = request.titulo {
        set.insert("titulo", v);
    }
    if let Some(v) = request.doi {
        set.insert("doi", v);
    }
    if let Some(v) = request.issn {
        set.insert("issn", v);
    }
    if let Some(v) = request.anio {
        set.insert("anio", v);
    }
    if let Some(v) = request.cuartil {
        set.insert("cuartil", v);
    }
    if let Some(v) = request.tipo {
        set.insert("tipo", v);
    }
    if let Some(v) = request.resumen {
        set.insert("resumen", v);
    }
    if let Some(v) = request.palabras_clave {
        set.insert("palabras_clave", v);
    }
    if let Some(v) = request.handle_url {
        set.insert("handle_url", v);
    }
    if let Some(v) = request.fecha_publicacion {
        set.insert("fecha_publicacion", v);
    }
    if let Some(v) = request.editorial {
        set.insert("editorial", v);
    }
    if let Some(v) = request.id_org_unit_editora {
        set.insert("id_org_unit_editora", v);
    }
    if let Some(v) = request.revista_titulo {
        set.insert("revista_titulo", v);
    }
    if let Some(v) = request.isbn {
        set.insert("isbn", v);
    }
    if let Some(v) = request.scimago_cuartil {
        set.insert("scimago_cuartil", v);
    }
    if let Some(v) = request.wos_cuartil {
        set.insert("wos_cuartil", v);
    }
    if let Some(v) = request.es_revisado_por_pares {
        set.insert("es_revisado_por_pares", v);
    }
    if let Some(v) = request.acceso_abierto {
        set.insert("acceso_abierto", v);
    }
    if let Some(v) = request.idioma {
        set.insert("idioma", v);
    }
    if let Some(v) = request.volumen {
        set.insert("volumen", v);
    }
    if let Some(v) = request.numero_issue {
        set.insert("numero_issue", v);
    }
    if let Some(v) = request.paginas {
        set.insert("paginas", v);
    }
    if let Some(v) = request.dominio_origen {
        set.insert("dominio_origen", v);
    }
    if let Some(v) = request.pure_uuid {
        set.insert("pure_uuid", v);
    }
    if let Some(v) = request.estado_publicacion {
        set.insert("estado_publicacion", v);
    }
    if let Some(v) = request.id_proyecto {
        set.insert("id_proyecto", v);
    }
    if let Some(v) = request.perucris_uuid {
        set.insert("perucris_uuid", v);
    }

    db.collection::<Document>("publicaciones_cientificas")
        .update_one(doc! { "id_publicacion": id }, doc! { "$set": set })
        .await?;
    get_by_id(db, id).await
}

pub async fn delete(db: &Database, id: &str) -> Result<(), AppError> {
    db.collection::<Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 0, "updated_at": time::now_ms() } },
        )
        .await?;
    Ok(())
}

pub async fn reactivate(db: &Database, id: &str) -> Result<PublicacionCientifica, AppError> {
    db.collection::<Document>("publicaciones_cientificas")
        .update_one(
            doc! { "id_publicacion": id },
            doc! { "$set": { "activo": 1, "updated_at": time::now_ms() } },
        )
        .await?;
    get_by_id(db, id).await
}
