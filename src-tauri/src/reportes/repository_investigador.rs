use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::investigadores::models::Investigador;
use crate::proyectos::models::ParticipacionRecord;
use crate::recursos::models::{Equipamiento, Patente, Producto};
use crate::reportes::entity_reports::*;
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
        let productos_count = db
            .collection::<mongodb::bson::Document>("productos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        let equipamientos_count = db
            .collection::<mongodb::bson::Document>("equipamientos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        let financiamientos_count = db
            .collection::<mongodb::bson::Document>("financiamientos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
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
                productos: productos_count,
                equipamientos: equipamientos_count,
                financiamientos: financiamientos_count,
            },
        });
    }

    let total_proyectos = proyectos_detalle.len();

    use crate::recursos::dto::{EquipamientoDto, PatenteDto, ProductoDto};
    use std::convert::TryFrom;

    let patentes_raw: Vec<Patente> = {
        let cursor = db
            .collection::<mongodb::bson::Document>("patentes")
            .find(doc! { "investigador_id": id_investigador })
            .await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        docs.into_iter()
            .map(|d| {
                let dto: PatenteDto = mongodb::bson::from_document(d)
                    .map_err(|e| AppError::InternalError(format!("BSON->PatenteDto: {e}")))?;
                Patente::try_from(dto)
            })
            .collect::<Result<Vec<_>, _>>()?
    };

    let total_patentes = patentes_raw.len();
    let patentes: Vec<PatenteConEtiquetas> = patentes_raw
        .iter()
        .map(|p| PatenteConEtiquetas::from_patente(p, &catalogo_map))
        .collect();

    let productos_raw: Vec<Producto> = {
        let cursor = db
            .collection::<mongodb::bson::Document>("productos")
            .find(doc! { "investigador_id": id_investigador })
            .await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        docs.into_iter()
            .map(|d| {
                let dto: ProductoDto = mongodb::bson::from_document(d)
                    .map_err(|e| AppError::InternalError(format!("BSON->ProductoDto: {e}")))?;
                Producto::try_from(dto)
            })
            .collect::<Result<Vec<_>, _>>()?
    };

    let total_productos = productos_raw.len();
    let productos: Vec<ProductoConEtiquetas> = productos_raw
        .iter()
        .map(|p| ProductoConEtiquetas::from_producto(p, &catalogo_map))
        .collect();

    let equipamientos_raw: Vec<Equipamiento> = if proyecto_ids.is_empty() {
        Vec::new()
    } else {
        let cursor = db
            .collection::<mongodb::bson::Document>("equipamientos")
            .find(doc! { "proyecto_id": { "$in": &proyecto_ids } })
            .await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        docs.into_iter()
            .map(|d| {
                let dto: EquipamientoDto = mongodb::bson::from_document(d)
                    .map_err(|e| AppError::InternalError(format!("BSON->EquipamientoDto: {e}")))?;
                Equipamiento::try_from(dto)
            })
            .collect::<Result<Vec<_>, _>>()?
    };

    let total_equipamientos = equipamientos_raw.len();
    let equipamientos: Vec<EquipamientoConEtiquetas> = equipamientos_raw
        .iter()
        .map(|e| EquipamientoConEtiquetas::from_equipamiento(e, &catalogo_map))
        .collect();

    let publicaciones_raw: Vec<crate::investigadores::models::Publicacion> = {
        use crate::investigadores::dto::PublicacionDto;
        use std::convert::TryFrom;
        let cursor = db
            .collection::<mongodb::bson::Document>("publicaciones")
            .find(doc! { "investigador_id": id_investigador })
            .await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        docs.into_iter()
            .map(|d| {
                let dto: PublicacionDto = mongodb::bson::from_document(d)
                    .map_err(|e| AppError::InternalError(format!("BSON->PublicacionDto: {e}")))?;
                crate::investigadores::models::Publicacion::try_from(dto)
            })
            .collect::<Result<Vec<_>, _>>()?
    };

    let total_publicaciones = publicaciones_raw.len();
    let publicaciones: Vec<PublicacionConEtiquetas> = publicaciones_raw
        .iter()
        .map(|p| PublicacionConEtiquetas {
            id_publicacion: p.id_publicacion.clone(),
            pure_uuid: p.pure_uuid.clone(),
            titulo: p.titulo.clone(),
            tipo_publicacion: p.tipo_publicacion.clone(),
            doi: p.doi.clone(),
            scopus_eid: p.scopus_eid.clone(),
            anio_publicacion: p.anio_publicacion,
            autores_json: p.autores_json.clone(),
            estado_publicacion: p.estado_publicacion.clone(),
            journal_titulo: p.journal_titulo.clone(),
            issn: p.issn.clone(),
            pure_sincronizado_at: p.pure_sincronizado_at,
        })
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
            productos,
            equipamientos,
            total_patentes,
            total_productos,
            total_equipamientos,
        },
        publicaciones,
        total_publicaciones,
        trazabilidad,
    })
}
