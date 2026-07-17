use std::collections::HashMap;

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::personas::dto::{PersonaDto, UpdatePersonaRequest};
use crate::personas::models::Persona;
use crate::shared::error::AppError;
use crate::shared::time;

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn doc_to_dto(doc: Document) -> Result<PersonaDto, AppError> {
    mongodb::bson::from_document::<PersonaDto>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar persona desde BSON: {e}"))
    })
}

fn dto_to_model(dto: PersonaDto) -> Persona {
    Persona {
        id_persona: dto.id_persona,
        dni: dto.dni,
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        nombre_completo: dto.nombre_completo,
        correo: dto.correo,
        telefono: dto.telefono,
        direccion: dto.direccion,
        sexo: dto.sexo,
        fecha_nacimiento: dto.fecha_nacimiento,
        activo: dto.activo,
        created_at: dto.created_at,
        updated_at: dto.updated_at,
    }
}

fn model_to_dto(m: &Persona) -> PersonaDto {
    PersonaDto {
        id_persona: m.id_persona.clone(),
        dni: m.dni.clone(),
        nombres: m.nombres.clone(),
        apellido_paterno: m.apellido_paterno.clone(),
        apellido_materno: m.apellido_materno.clone(),
        nombre_completo: m.nombre_completo.clone(),
        correo: m.correo.clone(),
        telefono: m.telefono.clone(),
        direccion: m.direccion.clone(),
        sexo: m.sexo.clone(),
        fecha_nacimiento: m.fecha_nacimiento,
        activo: m.activo,
        created_at: m.created_at,
        updated_at: m.updated_at,
    }
}

pub async fn create(
    db: &Database,
    request: crate::personas::dto::CreatePersonaRequest,
) -> Result<Persona, AppError> {
    let persona = Persona::new(gen_uuid(), request)?;
    let dto = model_to_dto(&persona);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar persona a BSON: {e}"))
    })?;
    db.collection::<Document>("personas")
        .insert_one(doc)
        .await?;
    Ok(persona)
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Persona, AppError> {
    let doc_opt = db
        .collection::<Document>("personas")
        .find_one(doc! { "id_persona": id, "activo": 1 })
        .await?;
    let doc = doc_opt
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn find_by_dni(db: &Database, dni: &str) -> Result<Option<Persona>, AppError> {
    let dni = crate::shared::dni::Dni::new(dni)?.into_string();
    let doc_opt = db
        .collection::<Document>("personas")
        .find_one(doc! { "dni": dni, "activo": 1 })
        .await?;
    doc_opt.map(|d| doc_to_dto(d).map(dto_to_model)).transpose()
}

/// Busca una persona por `id_persona` sin filtrar por `activo`.
/// Usado por features que necesitan auditar incluso personas inactivas.
pub async fn find_by_id_persona(db: &Database, id: &str) -> Result<Option<Persona>, AppError> {
    let doc_opt = db
        .collection::<Document>("personas")
        .find_one(doc! { "id_persona": id })
        .await?;
    doc_opt.map(|d| doc_to_dto(d).map(dto_to_model)).transpose()
}

/// Carga todas las personas activas en un `HashMap` indexado por `id_persona`.
pub async fn load_all_map(db: &Database) -> Result<HashMap<String, Persona>, AppError> {
    let cursor = db.collection::<Document>("personas").find(doc! {}).await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map = HashMap::new();
    for d in docs {
        let dto = doc_to_dto(d)?;
        let m = dto_to_model(dto);
        map.insert(m.id_persona.clone(), m);
    }
    Ok(map)
}

/// Carga personas por lista de ids en un `HashMap`.
pub async fn find_by_ids(
    db: &Database,
    ids: &[String],
) -> Result<HashMap<String, Persona>, AppError> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    let cursor = db
        .collection::<Document>("personas")
        .find(doc! { "id_persona": { "$in": ids } })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut map = HashMap::new();
    for d in docs {
        let dto = doc_to_dto(d)?;
        let m = dto_to_model(dto);
        map.insert(m.id_persona.clone(), m);
    }
    Ok(map)
}

pub async fn update(
    db: &Database,
    id: &str,
    request: UpdatePersonaRequest,
) -> Result<Persona, AppError> {
    let persona_doc = db
        .collection::<Document>("personas")
        .find_one(doc! { "id_persona": id, "activo": 1 })
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))?;
    let persona = dto_to_model(doc_to_dto(persona_doc)?);

    let now = time::now_ms();
    let mut set = doc! { "updated_at": now };

    let nuevos_nombres = request
        .nombres
        .as_ref()
        .map(|v| v.trim().to_string())
        .or_else(|| persona.nombres.clone())
        .unwrap_or_default();
    let nuevo_apellido_paterno = request
        .apellido_paterno
        .as_ref()
        .map(|v| v.trim().to_string())
        .or_else(|| persona.apellido_paterno.clone())
        .unwrap_or_default();
    let nuevo_apellido_materno = request
        .apellido_materno
        .as_ref()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .or_else(|| persona.apellido_materno.clone());

    if let Some(ref v) = request.nombres {
        set.insert("nombres", v.trim());
    }
    if let Some(ref v) = request.apellido_paterno {
        set.insert("apellido_paterno", v.trim());
    }
    if let Some(ref v) = request.apellido_materno {
        set.insert("apellido_materno", v.trim());
    }
    if let Some(ref v) = request.correo {
        set.insert("correo", v.trim());
    }
    if let Some(ref v) = request.telefono {
        set.insert("telefono", v.trim());
    }
    if let Some(ref v) = request.direccion {
        set.insert("direccion", v.trim());
    }
    if let Some(ref v) = request.sexo {
        set.insert("sexo", v.trim());
    }
    if let Some(v) = request.fecha_nacimiento {
        set.insert("fecha_nacimiento", v);
    }

    let mut nombre_parts: Vec<&str> = vec![&nuevos_nombres, &nuevo_apellido_paterno];
    if let Some(ref am) = nuevo_apellido_materno {
        nombre_parts.push(am.as_str());
    }
    let nombre_completo = nombre_parts
        .iter()
        .filter(|v| !v.is_empty())
        .copied()
        .collect::<Vec<_>>()
        .join(" ");
    set.insert("nombre_completo", nombre_completo);

    let updated_doc = db
        .collection::<Document>("personas")
        .find_one_and_update(doc! { "id_persona": id, "activo": 1 }, doc! { "$set": set })
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))?;
    Ok(dto_to_model(doc_to_dto(updated_doc)?))
}
