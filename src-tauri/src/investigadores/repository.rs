use std::collections::HashMap;
use std::convert::TryFrom;

use futures_util::TryStreamExt;
use mongodb::{bson::doc, bson::Document, Database};

use crate::investigadores::dto::{
    CreateInvestigadorRequest, EliminarInvestigadorResultadoDto, InvestigadorDetalleDto,
    InvestigadorDto, UpdateInvestigadorRequest,
};
use crate::investigadores::models::Investigador;
use crate::investigadores::service::build_delete_result;
use crate::personas;
use crate::personas::dto::CreatePersonaRequest;
use crate::shared::data_loader;
use crate::shared::error::AppError;
use crate::shared::pagination::PaginatedResult;

const COLLECTION_INVESTIGADORES: &str = "investigadores";

fn doc_to_dto(doc: Document) -> Result<InvestigadorDto, AppError> {
    mongodb::bson::from_document::<InvestigadorDto>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar investigador desde BSON: {e}"
        ))
    })
}

fn dto_to_model(dto: InvestigadorDto) -> Investigador {
    Investigador::try_from(dto).expect("InvestigadorDto -> Investigador conversion failed")
}

fn model_to_dto(m: &Investigador) -> InvestigadorDto {
    InvestigadorDto {
        id_investigador: m.id_investigador.clone(),
        persona_id: m.persona_id.clone(),
        id_grado: m.id_grado.clone(),
        activo: m.activo,
        updated_at: m.updated_at,
        perfil: m.perfil.clone(),
        renacyt_codigo_registro: m.renacyt_codigo_registro.clone(),
        renacyt_id_investigador: m.renacyt_id_investigador.clone(),
        renacyt_nivel: m.renacyt_nivel.clone(),
        renacyt_grupo: m.renacyt_grupo.clone(),
        renacyt_condicion: m.renacyt_condicion.clone(),
        renacyt_fecha_informe_calificacion: m.renacyt_fecha_informe_calificacion,
        renacyt_fecha_registro: m.renacyt_fecha_registro,
        renacyt_fecha_ultima_revision: m.renacyt_fecha_ultima_revision,
        renacyt_orcid: m.renacyt_orcid.clone(),
        renacyt_scopus_author_id: m.renacyt_scopus_author_id.clone(),
        renacyt_fecha_ultima_sincronizacion: m.renacyt_fecha_ultima_sincronizacion,
        renacyt_ficha_url: m.renacyt_ficha_url.clone(),
        renacyt_formaciones_academicas_json: m.renacyt_formaciones_academicas_json.clone(),
        grupo_investigacion_id: m.grupo_investigacion_id.clone(),
    }
}

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
        .collection::<Document>("grados")
        .find_one(doc! { "id_grado": &request.id_grado })
        .await?;
    if grado_existente.is_none() {
        return Err(AppError::NotFound(
            "El grado seleccionado no existe.".to_string(),
        ));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let investigador = Investigador::new(id, &request)?.with_persona_id(persona.id_persona);
    let dto = model_to_dto(&investigador);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar investigador a BSON: {e}"))
    })?;
    db.collection::<Document>(COLLECTION_INVESTIGADORES)
        .insert_one(doc)
        .await?;
    Ok(investigador)
}

pub async fn get_all_investigadores(db: &Database) -> Result<Vec<Investigador>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .find(doc! { "activo": 1i64 })
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut investigadores: Vec<Investigador> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_model(doc_to_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;
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
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .count_documents(filter.clone())
        .await?;

    let cursor = db
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .find(filter)
        .sort(doc! { "id_investigador": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let investigadores: Vec<Investigador> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_model(doc_to_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;

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
        Some(p) => {
            let doc_opt = db
                .collection::<Document>(COLLECTION_INVESTIGADORES)
                .find_one(doc! { "persona_id": &p.id_persona })
                .await?;
            Ok(doc_opt.map(|d| dto_to_model(doc_to_dto(d).expect("BSON decode"))))
        }
        None => Ok(None),
    }
}

pub async fn get_investigador_by_id(
    db: &Database,
    id_investigador: &str,
) -> Result<Investigador, AppError> {
    let doc_opt = db
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .find_one(doc! { "id_investigador": id_investigador })
        .await?;
    let doc =
        doc_opt.ok_or_else(|| AppError::NotFound("Investigador no encontrado.".to_string()))?;
    Ok(dto_to_model(doc_to_dto(doc)?))
}

pub async fn update_investigador_renacyt(
    db: &Database,
    investigador: &Investigador,
) -> Result<(), AppError> {
    let dto = model_to_dto(investigador);
    let doc = mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar investigador a BSON: {e}"))
    })?;
    db.collection::<Document>(COLLECTION_INVESTIGADORES)
        .replace_one(
            doc! { "id_investigador": &investigador.id_investigador },
            doc,
        )
        .await?;
    Ok(())
}

pub async fn get_all_investigadores_con_proyectos(
    db: &Database,
) -> Result<Vec<InvestigadorDetalleDto>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .find(doc! {})
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let mut investigadores: Vec<Investigador> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_model(doc_to_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;
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
                    .entry(participacion.id_investigador)
                    .or_default()
                    .push(proyecto.titulo_proyecto.clone());
            }
        }
    }

    let detalles = investigadores
        .into_iter()
        .map(|investigador| {
            let proyectos_investigador = proyectos_por_investigador
                .remove(&investigador.id_investigador)
                .unwrap_or_default();
            let grado = grados
                .get(&investigador.id_grado)
                .map(|grado| grado.nombre.clone())
                .unwrap_or_else(|| "Sin grado".to_string());
            let persona = personas
                .get(&investigador.persona_id)
                .cloned()
                .expect("Persona must exist for investigador");

            InvestigadorDetalleDto::from_parts(investigador, persona, grado, proyectos_investigador)
        })
        .collect();

    Ok(detalles)
}

pub async fn get_investigador_detalle_by_id(
    db: &Database,
    id_investigador: &str,
) -> Result<InvestigadorDetalleDto, AppError> {
    let investigador = get_investigador_by_id(db, id_investigador).await?;
    let persona = personas::repository::find_by_id(db, &investigador.persona_id).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let proyectos_investigador = participaciones
        .into_iter()
        .filter(|participacion| participacion.id_investigador == investigador.id_investigador)
        .filter_map(|participacion| proyectos.get(&participacion.id_proyecto))
        .filter(|proyecto| proyecto.activo)
        .map(|proyecto| proyecto.titulo_proyecto.clone())
        .collect::<Vec<_>>();

    let grado = grados
        .get(&investigador.id_grado)
        .map(|grado| grado.nombre.clone())
        .unwrap_or_else(|| "Sin grado".to_string());

    Ok(InvestigadorDetalleDto::from_parts(
        investigador,
        persona,
        grado,
        proyectos_investigador,
    ))
}

pub async fn delete_investigador(
    db: &Database,
    id_investigador: &str,
) -> Result<EliminarInvestigadorResultadoDto, AppError> {
    let participaciones = db
        .collection::<Document>("participaciones")
        .count_documents(doc! { "id_investigador": id_investigador })
        .await?;

    db.collection::<Document>(COLLECTION_INVESTIGADORES)
        .update_one(
            doc! { "id_investigador": id_investigador },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;

    Ok(build_delete_result(participaciones > 0))
}

pub async fn reactivar_investigador(
    db: &Database,
    id_investigador: &str,
) -> Result<Investigador, AppError> {
    db.collection::<Document>(COLLECTION_INVESTIGADORES)
        .update_one(
            doc! { "id_investigador": id_investigador },
            doc! { "$set": { "activo": 1i64 } },
        )
        .await?;

    get_investigador_by_id(db, id_investigador).await
}

pub async fn update_investigador(
    db: &Database,
    id_investigador: &str,
    request: &UpdateInvestigadorRequest,
) -> Result<Investigador, AppError> {
    let investigador = get_investigador_by_id(db, id_investigador).await?;

    if request.nombres.is_some()
        || request.apellido_paterno.is_some()
        || request.apellido_materno.is_some()
        || request.correo.is_some()
        || request.telefono.is_some()
        || request.direccion.is_some()
    {
        use crate::personas::dto::UpdatePersonaRequest;
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
        db.collection::<Document>(COLLECTION_INVESTIGADORES)
            .update_one(
                doc! { "id_investigador": id_investigador },
                doc! { "$set": set },
            )
            .await?;
    }

    get_investigador_by_id(db, id_investigador).await
}

/// Carga todos los investigadores (activos e inactivos) indexados por `id_investigador`.
pub async fn load_all_map(db: &Database) -> Result<HashMap<String, Investigador>, AppError> {
    let cursor = db
        .collection::<Document>(COLLECTION_INVESTIGADORES)
        .find(doc! {})
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    let investigadores: Vec<Investigador> = docs
        .into_iter()
        .map(|d| Ok::<_, AppError>(dto_to_model(doc_to_dto(d)?)))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(investigadores
        .into_iter()
        .map(|i| (i.id_investigador.clone(), i))
        .collect())
}
