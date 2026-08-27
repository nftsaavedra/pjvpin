use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::proyectos::models::ParticipacionRecord;
use crate::recursos::models::{Equipamiento, Patente};
use crate::reportes::dto::*;
use crate::shared::data_loader;
use crate::shared::error::AppError;

// ═══════════════════════════════════════════════════════════════════════════════
// Reporte Investigador Integral
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn build_reporte_investigador_integral(
    db: &Database,
    id_investigador: &str,
) -> Result<ReporteInvestigadorIntegral, AppError> {
    let catalogo_map = data_loader::load_catalogos_map(db).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let investigadores_map = data_loader::load_investigadores_map(db).await?;
    let proyectos_map = data_loader::load_proyectos_map(db).await?;
    let todas_participaciones = data_loader::load_participaciones(db).await?;
    let personas = data_loader::load_personas_map(db).await?;

    let investigador =
        crate::investigadores::repository::get_investigador_by_id(db, id_investigador).await?;

    let grado_nombre = grados
        .get(&investigador.id_grado)
        .map(|g| g.nombre.clone())
        .unwrap_or_default();

    let (grupo_nombre, grupo_id) = investigador
        .grupo_investigacion_id
        .as_ref()
        .and_then(|gid| grupos.get(gid))
        .map(|g| (Some(g.nombre.clone()), Some(g.id_grupo.clone())))
        .unwrap_or((None, None));

    let persona_doc = personas.get(&investigador.persona_id);
    let perfil = PerfilInvestigadorReporte {
        id_investigador: investigador.id_investigador.clone(),
        dni: persona_doc.map(|p| p.dni.clone()).unwrap_or_default(),
        nombres_apellidos: persona_doc
            .map(|p| p.nombre_completo.clone())
            .unwrap_or_default(),
        nombres: persona_doc.and_then(|p| p.nombres.clone()),
        apellido_paterno: persona_doc.and_then(|p| p.apellido_paterno.clone()),
        apellido_materno: persona_doc.and_then(|p| p.apellido_materno.clone()),
        grado_nombre,
        grado_id: investigador.id_grado.clone(),
        renacyt_codigo_registro: investigador.renacyt_codigo_registro.clone(),
        renacyt_id_investigador: investigador.renacyt_id_investigador.clone(),
        renacyt_nivel: investigador.renacyt_nivel.clone(),
        renacyt_grupo: investigador.renacyt_grupo.clone(),
        renacyt_condicion: investigador.renacyt_condicion.clone(),
        renacyt_fecha_informe_calificacion: investigador.renacyt_fecha_informe_calificacion,
        renacyt_fecha_registro: investigador.renacyt_fecha_registro,
        renacyt_fecha_ultima_revision: investigador.renacyt_fecha_ultima_revision,
        renacyt_orcid: investigador.renacyt_orcid.clone(),
        renacyt_scopus_author_id: investigador.renacyt_scopus_author_id.clone(),
        renacyt_ficha_url: investigador.renacyt_ficha_url.clone(),
        renacyt_formaciones_academicas_json: investigador
            .renacyt_formaciones_academicas_json
            .clone(),
        grupo_nombre,
        grupo_id,
    };

    let mis_participaciones: Vec<&ParticipacionRecord> = todas_participaciones
        .iter()
        .filter(|p| p.id_investigador == id_investigador)
        .collect();

    let mut proyectos_detalle: Vec<ProyectoInvestigadorDetalle> = Vec::new();
    let mut proyecto_ids: Vec<String> = Vec::new();

    for participacion in &mis_participaciones {
        let proyecto_id = &participacion.id_proyecto;
        proyecto_ids.push(proyecto_id.clone());

        let proyecto = match proyectos_map.get(proyecto_id) {
            Some(p) => p,
            None => continue,
        };

        let colegas: Vec<ColegaProyecto> = todas_participaciones
            .iter()
            .filter(|p| p.id_proyecto == *proyecto_id && p.id_investigador != id_investigador)
            .filter_map(|p| {
                investigadores_map.get(&p.id_investigador).map(|d| {
                    let colega_grado = grados
                        .get(&d.id_grado)
                        .map(|g| g.nombre.clone())
                        .unwrap_or_default();
                    ColegaProyecto {
                        id_investigador: d.id_investigador.clone(),
                        nombres_apellidos: personas
                            .get(&d.persona_id)
                            .map(|p| p.nombre_completo.clone())
                            .unwrap_or_default(),
                        grado_nombre: colega_grado,
                        es_responsable: p.es_responsable,
                    }
                })
            })
            .collect();

        let patentes_count = db
            .collection::<mongodb::bson::Document>("patentes")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        // D5: "productos" ahora son publicaciones con tipo=Software.
        let software_count = db
            .collection::<mongodb::bson::Document>("publicaciones_cientificas")
            .count_documents(doc! {
                "id_proyecto": proyecto_id,
                "tipo": crate::shared::vocab_mapper::PUBLICACION_TIPO_SOFTWARE,
            })
            .await? as usize;
        let equipamientos_count = db
            .collection::<mongodb::bson::Document>("equipamientos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        // F2: financiamientos por proyecto via pivot `proyecto_financiamientos`
        // (reemplaza query legacy por campo `proyecto_id` en financiamientos).
        let financiamientos_count = db
            .collection::<mongodb::bson::Document>("proyecto_financiamientos")
            .count_documents(doc! { "id_proyecto": proyecto_id })
            .await? as usize;

        proyectos_detalle.push(ProyectoInvestigadorDetalle {
            id_proyecto: proyecto.id_proyecto.clone(),
            titulo_proyecto: proyecto.titulo_proyecto.clone(),
            es_responsable: participacion.es_responsable,
            activo: proyecto.activo,
            campo_ocde: proyecto.campo_ocde.clone(),
            programas_relacionados: proyecto.programas_relacionados.clone(),
            colegas,
            recursos_en_proyecto: RecursosProyectoResumen {
                patentes: patentes_count,
                software: software_count,
                equipamientos: equipamientos_count,
                financiamientos: financiamientos_count,
            },
        });
    }

    let total_proyectos = proyectos_detalle.len();

    use crate::recursos::dto::{EquipamientoDto, PatenteDto};
    use std::convert::TryFrom;

    // F2: patentes por investigador via pivot `patente_inventores`
    // (reemplaza query legacy por campo `investigador_id` en patentes).
    let patentes_raw: Vec<Patente> = {
        let id_persona = &investigador.persona_id;
        let mut ids_patente: Vec<String> = Vec::new();
        {
            let cursor = db
                .collection::<mongodb::bson::Document>("patente_inventores")
                .find(doc! { "id_persona": id_persona })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            for d in docs {
                if let Ok(id) = mongodb::bson::from_document::<
                    crate::recursos::patente_inventores::PatenteInventorDoc,
                >(d)
                {
                    ids_patente.push(id.id_patente);
                }
            }
        }
        if ids_patente.is_empty() {
            Vec::new()
        } else {
            let cursor = db
                .collection::<mongodb::bson::Document>("patentes")
                .find(doc! { "id_patente": { "$in": &ids_patente }, "activo": 1 })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            docs.into_iter()
                .map(|d| {
                    let dto: PatenteDto = mongodb::bson::from_document(d)
                        .map_err(|e| AppError::InternalError(format!("BSON->PatenteDto: {e}")))?;
                    Patente::try_from(dto)
                })
                .collect::<Result<Vec<_>, _>>()?
        }
    };

    let total_patentes = patentes_raw.len();
    let patentes: Vec<PatenteConEtiquetas> = patentes_raw
        .iter()
        .map(|p| PatenteConEtiquetas::from_patente(p, &catalogo_map))
        .collect();

    // F2 + D5: productos (Software) por investigador via pivot `publicacion_autores`
    // (reemplaza query legacy por campo `autores_ids` en publicaciones_cientificas).
    let software_raw: Vec<crate::publicaciones::models::PublicacionCientifica> = {
        let id_persona = &investigador.persona_id;
        let mut ids_publicacion: Vec<String> = Vec::new();
        {
            let cursor = db
                .collection::<mongodb::bson::Document>("publicacion_autores")
                .find(doc! { "id_persona": id_persona })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
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
            Vec::new()
        } else {
            let cursor = db
                .collection::<mongodb::bson::Document>("publicaciones_cientificas")
                .find(doc! {
                    "id_publicacion": { "$in": &ids_publicacion },
                    "tipo": crate::shared::vocab_mapper::PUBLICACION_TIPO_SOFTWARE,
                })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            docs.into_iter()
                .map(|d| {
                    let dto: crate::publicaciones::dto::PublicacionCientificaDto =
                        mongodb::bson::from_document(d).map_err(|e| {
                            AppError::InternalError(format!("BSON->PublicacionCientificaDto: {e}"))
                        })?;
                    crate::publicaciones::models::PublicacionCientifica::try_from(dto)
                })
                .collect::<Result<Vec<_>, _>>()?
        }
    };

    let total_software = software_raw.len();
    let software: Vec<SoftwareConEtiquetas> = software_raw
        .iter()
        .map(SoftwareConEtiquetas::from_publicacion)
        .collect();

    // F2: equipamientos por proyecto via cadena de financiamiento 3NF/CERIF:
    // proyecto_financiamientos -> financiamiento -> equipamiento.id_financiamiento.
    // Reemplaza query legacy por campo `proyecto_id` en equipamientos.
    let equipamientos_raw: Vec<Equipamiento> = if proyecto_ids.is_empty() {
        Vec::new()
    } else {
        // Paso 1: ids de financiamiento vinculados a los proyectos del investigador.
        let mut ids_financiamiento: Vec<String> = Vec::new();
        {
            let cursor = db
                .collection::<mongodb::bson::Document>("proyecto_financiamientos")
                .find(doc! { "id_proyecto": { "$in": &proyecto_ids } })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            for d in docs {
                if let Ok(p) = mongodb::bson::from_document::<
                    crate::proyectos::proyecto_financiamientos::ProyectoFinanciamientoDoc,
                >(d)
                {
                    ids_financiamiento.push(p.id_financiamiento);
                }
            }
        }
        if ids_financiamiento.is_empty() {
            Vec::new()
        } else {
            let cursor = db
                .collection::<mongodb::bson::Document>("equipamientos")
                .find(doc! {
                    "id_financiamiento": { "$in": &ids_financiamiento },
                    "activo": 1,
                })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            docs.into_iter()
                .map(|d| {
                    let dto: EquipamientoDto = mongodb::bson::from_document(d).map_err(|e| {
                        AppError::InternalError(format!("BSON->EquipamientoDto: {e}"))
                    })?;
                    Equipamiento::try_from(dto)
                })
                .collect::<Result<Vec<_>, _>>()?
        }
    };

    let total_equipamientos = equipamientos_raw.len();
    let equipamientos: Vec<EquipamientoConEtiquetas> = equipamientos_raw
        .iter()
        .map(|e| EquipamientoConEtiquetas::from_equipamiento(e, &catalogo_map))
        .collect();

    // B1: publicaciones por investigador via pivot `publicacion_autores`
    // (reemplaza la coleccion legacy `publicaciones`). Una publicacion cuenta
    // una vez por persona que figure como autora.
    let publicaciones_raw: Vec<crate::publicaciones::models::PublicacionCientifica> = {
        let id_persona = &investigador.persona_id;
        let mut ids_publicacion: Vec<String> = Vec::new();
        {
            let cursor = db
                .collection::<mongodb::bson::Document>("publicacion_autores")
                .find(doc! { "id_persona": id_persona })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
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
            Vec::new()
        } else {
            let cursor = db
                .collection::<mongodb::bson::Document>("publicaciones_cientificas")
                .find(doc! { "id_publicacion": { "$in": &ids_publicacion }, "activo": 1 })
                .await?;
            let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
            docs.into_iter()
                .map(|d| {
                    let dto: crate::publicaciones::dto::PublicacionCientificaDto =
                        mongodb::bson::from_document(d).map_err(|e| {
                            AppError::InternalError(format!("BSON->PublicacionCientificaDto: {e}"))
                        })?;
                    crate::publicaciones::models::PublicacionCientifica::try_from(dto)
                })
                .collect::<Result<Vec<_>, _>>()?
        }
    };

    let total_publicaciones = publicaciones_raw.len();
    let publicaciones: Vec<PublicacionConEtiquetas> = publicaciones_raw
        .iter()
        .map(PublicacionConEtiquetas::from_publicacion)
        .collect();

    let trazabilidad = TrazabilidadInvestigador {
        updated_at: investigador.updated_at,
        fecha_ultima_sincronizacion_renacyt: investigador.renacyt_fecha_ultima_sincronizacion,
        fecha_ultima_sincronizacion_pure: None,
    };

    Ok(ReporteInvestigadorIntegral {
        perfil,
        proyectos: proyectos_detalle,
        total_proyectos,
        recursos: RecursosInvestigadorResumen {
            patentes,
            software,
            equipamientos,
            total_patentes,
            total_software,
            total_equipamientos,
        },
        publicaciones,
        total_publicaciones,
        trazabilidad,
    })
}
