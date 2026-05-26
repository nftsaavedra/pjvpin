use std::collections::HashMap;

use crate::docentes::models::{
    CreateDocenteRequest, Docente, DocenteDetalle, EliminarDocenteResultado,
};
use crate::docentes::service::build_delete_result;
use crate::personas;
use crate::personas::models::CreatePersonaRequest;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::shared::data_loader;

pub async fn create_docente(
    db: &Database,
    request: CreateDocenteRequest,
) -> Result<Docente, AppError> {
    let persona = personas::repository::create(
        db,
        CreatePersonaRequest {
            dni: request.dni.clone(),
            nombres: request.nombres.clone(),
            apellido_paterno: request.apellido_paterno.clone(),
            apellido_materno: request.apellido_materno.clone(),
            correo: request.correo.clone(),
            telefono: request.telefono.clone(),
            direccion: request.direccion.clone(),
            sexo: request.sexo.clone(),
            fecha_nacimiento: request.fecha_nacimiento,
        },
    )
    .await?;

    let grado_existente = db
        .collection::<mongodb::bson::Document>("grados")
        .find_one(doc! { "id_grado": &request.id_grado })
        .await?;
    if grado_existente.is_none() {
        return Err(AppError::NotFound(
            "El grado seleccionado no existe.".to_string(),
        ));
    }

    let docente = Docente::new(persona.id_persona, &request);
    db.collection::<Docente>("docentes")
        .insert_one(&docente)
        .await?;
    Ok(docente)
}

pub async fn get_all_docentes(db: &Database) -> Result<Vec<Docente>, AppError> {
    let mut docentes = db
        .collection::<Docente>("docentes")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let personas = data_loader::load_personas_map(db).await?;
    docentes.sort_by(|a, b| {
        let na = personas
            .get(&a.persona_id)
            .map(|p| p.nombre_completo.to_lowercase())
            .unwrap_or_default();
        let nb = personas
            .get(&b.persona_id)
            .map(|p| p.nombre_completo.to_lowercase())
            .unwrap_or_default();
        na.cmp(&nb)
    });
    Ok(docentes)
}

pub async fn get_all_docentes_paginated(
    db: &Database,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Docente>, AppError> {
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;
    let filter = doc! { "activo": 1i64 };

    let total = db
        .collection::<Docente>("docentes")
        .count_documents(filter.clone())
        .await?;

    let mut cursor = db
        .collection::<Docente>("docentes")
        .find(filter)
        .sort(doc! { "id_docente": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut docentes: Vec<Docente> = Vec::new();
    while let Some(docente) = cursor.try_next().await? {
        docentes.push(docente);
    }

    let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
    Ok(PaginatedResult {
        items: docentes,
        total,
        page,
        limit,
        total_pages,
    })
}

pub async fn get_docente_by_dni(db: &Database, dni: &str) -> Result<Option<Docente>, AppError> {
    let persona = personas::repository::find_by_dni(db, dni).await?;
    match persona {
        Some(p) => db
            .collection::<Docente>("docentes")
            .find_one(doc! { "persona_id": &p.id_persona })
            .await
            .map_err(Into::into),
        None => Ok(None),
    }
}

pub async fn get_docente_by_id(db: &Database, id_docente: &str) -> Result<Docente, AppError> {
    db.collection::<Docente>("docentes")
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Docente no encontrado.".to_string()))
}

pub async fn update_docente_renacyt(db: &Database, docente: &Docente) -> Result<(), AppError> {
    db.collection::<Docente>("docentes")
        .replace_one(doc! { "id_docente": &docente.id_docente }, docente)
        .await?;

    Ok(())
}

pub async fn get_all_docentes_con_proyectos(
    db: &Database,
) -> Result<Vec<DocenteDetalle>, AppError> {
    let mut docentes = db
        .collection::<Docente>("docentes")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let personas = data_loader::load_personas_map(db).await?;
    docentes.sort_by(|a, b| {
        let na = personas
            .get(&a.persona_id)
            .map(|p| p.nombre_completo.to_lowercase())
            .unwrap_or_default();
        let nb = personas
            .get(&b.persona_id)
            .map(|p| p.nombre_completo.to_lowercase())
            .unwrap_or_default();
        na.cmp(&nb)
    });

    let grados = data_loader::load_grados_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut proyectos_por_docente: HashMap<String, Vec<String>> = HashMap::new();
    for participacion in participaciones {
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                proyectos_por_docente
                    .entry(participacion.id_docente)
                    .or_default()
                    .push(proyecto.titulo_proyecto.clone());
            }
        }
    }

    let detalles = docentes
        .into_iter()
        .map(|docente| {
            let proyectos_docente = proyectos_por_docente
                .remove(&docente.id_docente)
                .unwrap_or_default();
            let grado = grados
                .get(&docente.id_grado)
                .map(|grado| grado.nombre.clone())
                .unwrap_or_else(|| "Sin grado".to_string());
            let persona = personas
                .get(&docente.persona_id)
                .cloned()
                .expect("Persona must exist for docente");

            DocenteDetalle::from((docente, persona, grado, proyectos_docente))
        })
        .collect();

    Ok(detalles)
}

pub async fn get_docente_detalle_by_id(
    db: &Database,
    id_docente: &str,
) -> Result<DocenteDetalle, AppError> {
    let docente = get_docente_by_id(db, id_docente).await?;
    let persona = personas::repository::find_by_id(db, &docente.persona_id).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let proyectos_docente = participaciones
        .into_iter()
        .filter(|participacion| participacion.id_docente == docente.id_docente)
        .filter_map(|participacion| proyectos.get(&participacion.id_proyecto))
        .filter(|proyecto| proyecto.activo)
        .map(|proyecto| proyecto.titulo_proyecto.clone())
        .collect::<Vec<_>>();

    let grado = grados
        .get(&docente.id_grado)
        .map(|grado| grado.nombre.clone())
        .unwrap_or_else(|| "Sin grado".to_string());

    Ok(DocenteDetalle::from((
        docente,
        persona,
        grado,
        proyectos_docente,
    )))
}

pub async fn delete_docente(
    db: &Database,
    id_docente: &str,
) -> Result<EliminarDocenteResultado, AppError> {
    let participaciones = db
        .collection::<mongodb::bson::Document>("participaciones")
        .count_documents(doc! { "id_docente": id_docente })
        .await?;

    db.collection::<mongodb::bson::Document>("docentes")
        .update_one(
            doc! { "id_docente": id_docente },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;

    Ok(build_delete_result(participaciones > 0))
}

pub async fn reactivar_docente(db: &Database, id_docente: &str) -> Result<Docente, AppError> {
    db.collection::<mongodb::bson::Document>("docentes")
        .update_one(
            doc! { "id_docente": id_docente },
            doc! { "$set": { "activo": 1i64 } },
        )
        .await?;

    db.collection::<Docente>("docentes")
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Docente no encontrado.".to_string()))
}

pub async fn update_docente(
    db: &Database,
    id_docente: &str,
    request: &crate::docentes::models::UpdateDocenteRequest,
) -> Result<Docente, AppError> {
    let docente = get_docente_by_id(db, id_docente).await?;

    if request.nombres.is_some()
        || request.apellido_paterno.is_some()
        || request.apellido_materno.is_some()
        || request.correo.is_some()
        || request.telefono.is_some()
        || request.direccion.is_some()
    {
        use crate::personas::models::UpdatePersonaRequest;
        personas::repository::update(
            db,
            &docente.persona_id,
            UpdatePersonaRequest {
                nombres: request.nombres.clone(),
                apellido_paterno: request.apellido_paterno.clone(),
                apellido_materno: request.apellido_materno.clone(),
                correo: request.correo.clone(),
                telefono: request.telefono.clone(),
                direccion: request.direccion.clone(),
                sexo: request.sexo.clone(),
                fecha_nacimiento: request.fecha_nacimiento,
            },
        )
        .await?;
    }

    let now = crate::shared::time::now_ms();
    let mut set = doc! { "updated_at": now };

    if let Some(ref v) = request.id_grado {
        set.insert("id_grado", v);
    }
    if let Some(ref v) = request.grupo_investigacion_id {
        set.insert("grupo_investigacion_id", v);
    }

    let has_changes = request.id_grado.is_some() || request.grupo_investigacion_id.is_some();
    if has_changes {
        db.collection::<mongodb::bson::Document>("docentes")
            .update_one(doc! { "id_docente": id_docente }, doc! { "$set": set })
            .await?;
    }

    db.collection::<Docente>("docentes")
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Docente no encontrado.".to_string()))
}
