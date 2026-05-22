use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::Database;

use crate::personas::models::{CreatePersonaRequest, Persona, UpdatePersonaRequest};
use crate::shared::error::AppError;
use crate::shared::time;

pub async fn create(db: &Database, request: CreatePersonaRequest) -> Result<Persona, AppError> {
    let persona = Persona::new(request);
    db.collection::<Persona>("personas")
        .insert_one(&persona)
        .await?;
    Ok(persona)
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Persona, AppError> {
    db.collection::<Persona>("personas")
        .find_one(doc! { "id_persona": id, "activo": 1 })
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))
}

pub async fn find_by_dni(db: &Database, dni: &str) -> Result<Option<Persona>, AppError> {
    db.collection::<Persona>("personas")
        .find_one(doc! { "dni": dni.trim(), "activo": 1 })
        .await
        .map_err(Into::into)
}

pub async fn get_all(db: &Database) -> Result<Vec<Persona>, AppError> {
    db.collection::<Persona>("personas")
        .find(doc! { "activo": 1 })
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

pub async fn update(
    db: &Database,
    id: &str,
    request: UpdatePersonaRequest,
) -> Result<Persona, AppError> {
    let persona = db
        .collection::<Persona>("personas")
        .find_one(doc! { "id_persona": id, "activo": 1 })
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))?;

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

    db.collection::<Persona>("personas")
        .find_one_and_update(doc! { "id_persona": id, "activo": 1 }, doc! { "$set": set })
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))
}

pub async fn soft_delete(db: &Database, id: &str) -> Result<Persona, AppError> {
    let now = time::now_ms();
    db.collection::<Persona>("personas")
        .find_one_and_update(
            doc! { "id_persona": id, "activo": 1 },
            doc! { "$set": { "activo": 0, "updated_at": now } },
        )
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Persona con id {} no encontrada", id)))
}
