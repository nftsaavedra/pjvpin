use std::collections::HashMap;

use crate::investigadores::models::{
    CreateInvestigadorRequest, EliminarInvestigadorResultado, Investigador, InvestigadorDetalle,
};
use crate::investigadores::service::build_delete_result;
use crate::personas;
use crate::personas::models::CreatePersonaRequest;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::shared::data_loader;

const COLLECTION_INVESTIGADORES: &str = "docentes";

pub async fn create_investigador(
    db: &Database,
    request: CreateInvestigadorRequest,
) -> Result<Investigador, AppError> {
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

    let investigador = Investigador::new(persona.id_persona, &request);
    db.collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .insert_one(&investigador)
        .await?;
    Ok(investigador)
}

pub async fn get_all_investigadores(db: &Database) -> Result<Vec<Investigador>, AppError> {
    let mut investigadores = db
        .collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let personas = data_loader::load_personas_map(db).await?;
    investigadores.sort_by(|a, b| {
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
    Ok(investigadores)
}

pub async fn get_all_investigadores_paginated(
    db: &Database,
    page: u32,
    limit: u32,
) -> Result<PaginatedResult<Investigador>, AppError> {
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;
    let filter = doc! { "activo": 1i64 };

    let total = db
        .collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .count_documents(filter.clone())
        .await?;

    let mut cursor = db
        .collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find(filter)
        .sort(doc! { "id_docente": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut investigadores: Vec<Investigador> = Vec::new();
    while let Some(investigador) = cursor.try_next().await? {
        investigadores.push(investigador);
    }

    let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
    Ok(PaginatedResult {
        items: investigadores,
        total,
        page,
        limit,
        total_pages,
    })
}

pub async fn get_investigador_by_dni(
    db: &Database,
    dni: &str,
) -> Result<Option<Investigador>, AppError> {
    let persona = personas::repository::find_by_dni(db, dni).await?;
    match persona {
        Some(p) => db
            .collection::<Investigador>(COLLECTION_INVESTIGADORES)
            .find_one(doc! { "persona_id": &p.id_persona })
            .await
            .map_err(Into::into),
        None => Ok(None),
    }
}

pub async fn get_investigador_by_id(
    db: &Database,
    id_docente: &str,
) -> Result<Investigador, AppError> {
    db.collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Investigador no encontrado.".to_string()))
}

pub async fn update_investigador_renacyt(
    db: &Database,
    investigador: &Investigador,
) -> Result<(), AppError> {
    db.collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .replace_one(
            doc! { "id_docente": &investigador.id_docente },
            investigador,
        )
        .await?;

    Ok(())
}

pub async fn get_all_investigadores_con_proyectos(
    db: &Database,
) -> Result<Vec<InvestigadorDetalle>, AppError> {
    let mut investigadores = db
        .collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let personas = data_loader::load_personas_map(db).await?;
    investigadores.sort_by(|a, b| {
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

    let mut proyectos_por_investigador: HashMap<String, Vec<String>> = HashMap::new();
    for participacion in participaciones {
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                proyectos_por_investigador
                    .entry(participacion.id_docente)
                    .or_default()
                    .push(proyecto.titulo_proyecto.clone());
            }
        }
    }

    let detalles = investigadores
        .into_iter()
        .map(|investigador| {
            let proyectos_investigador = proyectos_por_investigador
                .remove(&investigador.id_docente)
                .unwrap_or_default();
            let grado = grados
                .get(&investigador.id_grado)
                .map(|grado| grado.nombre.clone())
                .unwrap_or_else(|| "Sin grado".to_string());
            let persona = personas
                .get(&investigador.persona_id)
                .cloned()
                .expect("Persona must exist for investigador");

            InvestigadorDetalle::from((investigador, persona, grado, proyectos_investigador))
        })
        .collect();

    Ok(detalles)
}

pub async fn get_investigador_detalle_by_id(
    db: &Database,
    id_docente: &str,
) -> Result<InvestigadorDetalle, AppError> {
    let investigador = get_investigador_by_id(db, id_docente).await?;
    let persona = personas::repository::find_by_id(db, &investigador.persona_id).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let proyectos_investigador = participaciones
        .into_iter()
        .filter(|participacion| participacion.id_docente == investigador.id_docente)
        .filter_map(|participacion| proyectos.get(&participacion.id_proyecto))
        .filter(|proyecto| proyecto.activo)
        .map(|proyecto| proyecto.titulo_proyecto.clone())
        .collect::<Vec<_>>();

    let grado = grados
        .get(&investigador.id_grado)
        .map(|grado| grado.nombre.clone())
        .unwrap_or_else(|| "Sin grado".to_string());

    Ok(InvestigadorDetalle::from((
        investigador,
        persona,
        grado,
        proyectos_investigador,
    )))
}

pub async fn delete_investigador(
    db: &Database,
    id_docente: &str,
) -> Result<EliminarInvestigadorResultado, AppError> {
    let participaciones = db
        .collection::<mongodb::bson::Document>("participaciones")
        .count_documents(doc! { "id_docente": id_docente })
        .await?;

    db.collection::<mongodb::bson::Document>(COLLECTION_INVESTIGADORES)
        .update_one(
            doc! { "id_docente": id_docente },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;

    Ok(build_delete_result(participaciones > 0))
}

pub async fn reactivar_investigador(
    db: &Database,
    id_docente: &str,
) -> Result<Investigador, AppError> {
    db.collection::<mongodb::bson::Document>(COLLECTION_INVESTIGADORES)
        .update_one(
            doc! { "id_docente": id_docente },
            doc! { "$set": { "activo": 1i64 } },
        )
        .await?;

    db.collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Investigador no encontrado.".to_string()))
}

pub async fn update_investigador(
    db: &Database,
    id_docente: &str,
    request: &crate::investigadores::models::UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let investigador = get_investigador_by_id(db, id_docente).await?;

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
            &investigador.persona_id,
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
    if let Some(ref v) = request.perfil {
        set.insert("perfil", v);
    }

    let has_changes = request.id_grado.is_some()
        || request.grupo_investigacion_id.is_some()
        || request.perfil.is_some();
    if has_changes {
        db.collection::<mongodb::bson::Document>(COLLECTION_INVESTIGADORES)
            .update_one(doc! { "id_docente": id_docente }, doc! { "$set": set })
            .await?;
    }

    db.collection::<Investigador>(COLLECTION_INVESTIGADORES)
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Investigador no encontrado.".to_string()))
}
