use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

use crate::investigadores::models::Investigador;
use crate::proyectos::models::ParticipacionRecord;
use crate::recursos::models::{Equipamiento, Producto};
use crate::reportes::entity_reports::*;
use crate::shared::data_loader;
use crate::shared::error::AppError;

// ═══════════════════════════════════════════════════════════════════════════════
// Reporte Investigador Integral
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn build_reporte_docente_integral(
    db: &Database,
    id_docente: &str,
) -> Result<ReporteDocenteIntegral, AppError> {
    let catalogo_map = data_loader::load_catalogos_map(db).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let docentes_map = data_loader::load_docentes_map(db).await?;
    let proyectos_map = data_loader::load_proyectos_map(db).await?;
    let todas_participaciones = data_loader::load_participaciones(db).await?;
    let personas = data_loader::load_personas_map(db).await?;

    let docente = db
        .collection::<Investigador>("docentes")
        .find_one(doc! { "id_docente": id_docente })
        .await?
        .ok_or_else(|| AppError::NotFound("Investigador no encontrado.".to_string()))?;

    let grado_nombre = grados
        .get(&docente.id_grado)
        .map(|g| g.nombre.clone())
        .unwrap_or_default();

    let (grupo_nombre, grupo_id) = docente
        .grupo_investigacion_id
        .as_ref()
        .and_then(|gid| grupos.get(gid))
        .map(|g| (Some(g.nombre.clone()), Some(g.id_grupo.clone())))
        .unwrap_or((None, None));

    let persona_doc = personas.get(&docente.persona_id);
    let perfil = PerfilDocenteReporte {
        id_docente: docente.id_docente.clone(),
        dni: persona_doc.map(|p| p.dni.clone()).unwrap_or_default(),
        nombres_apellidos: persona_doc
            .map(|p| p.nombre_completo.clone())
            .unwrap_or_default(),
        nombres: persona_doc.and_then(|p| p.nombres.clone()),
        apellido_paterno: persona_doc.and_then(|p| p.apellido_paterno.clone()),
        apellido_materno: persona_doc.and_then(|p| p.apellido_materno.clone()),
        grado_nombre,
        grado_id: docente.id_grado.clone(),
        renacyt_codigo_registro: docente.renacyt_codigo_registro.clone(),
        renacyt_id_investigador: docente.renacyt_id_investigador.clone(),
        renacyt_nivel: docente.renacyt_nivel.clone(),
        renacyt_grupo: docente.renacyt_grupo.clone(),
        renacyt_condicion: docente.renacyt_condicion.clone(),
        renacyt_fecha_informe_calificacion: docente.renacyt_fecha_informe_calificacion,
        renacyt_fecha_registro: docente.renacyt_fecha_registro,
        renacyt_fecha_ultima_revision: docente.renacyt_fecha_ultima_revision,
        renacyt_orcid: docente.renacyt_orcid.clone(),
        renacyt_scopus_author_id: docente.renacyt_scopus_author_id.clone(),
        renacyt_ficha_url: docente.renacyt_ficha_url.clone(),
        renacyt_formaciones_academicas_json: docente.renacyt_formaciones_academicas_json.clone(),
        grupo_nombre,
        grupo_id,
    };

    let mis_participaciones: Vec<&ParticipacionRecord> = todas_participaciones
        .iter()
        .filter(|p| p.id_docente == id_docente)
        .collect();

    let mut proyectos_detalle: Vec<ProyectoDocenteDetalle> = Vec::new();
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
            .filter(|p| p.id_proyecto == *proyecto_id && p.id_docente != id_docente)
            .filter_map(|p| {
                docentes_map.get(&p.id_docente).map(|d| {
                    let colega_grado = grados
                        .get(&d.id_grado)
                        .map(|g| g.nombre.clone())
                        .unwrap_or_default();
                    ColegaProyecto {
                        id_docente: d.id_docente.clone(),
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
            .collection::<crate::recursos::models::Patente>("patentes")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        let productos_count = db
            .collection::<Producto>("productos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        let equipamientos_count = db
            .collection::<Equipamiento>("equipamientos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;
        let financiamientos_count = db
            .collection::<crate::recursos::models::Financiamiento>("financiamientos")
            .count_documents(doc! { "proyecto_id": proyecto_id })
            .await? as usize;

        proyectos_detalle.push(ProyectoDocenteDetalle {
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

    let patentes_raw = db
        .collection::<crate::recursos::models::Patente>("patentes")
        .find(doc! { "docente_id": id_docente })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let total_patentes = patentes_raw.len();
    let patentes: Vec<PatenteConEtiquetas> = patentes_raw
        .iter()
        .map(|p| PatenteConEtiquetas::from_patente(p, &catalogo_map))
        .collect();

    let productos_raw = db
        .collection::<Producto>("productos")
        .find(doc! { "docente_id": id_docente })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let total_productos = productos_raw.len();
    let productos: Vec<ProductoConEtiquetas> = productos_raw
        .iter()
        .map(|p| ProductoConEtiquetas::from_producto(p, &catalogo_map))
        .collect();

    let equipamientos_raw = if proyecto_ids.is_empty() {
        Vec::new()
    } else {
        db.collection::<Equipamiento>("equipamientos")
            .find(doc! { "proyecto_id": { "$in": &proyecto_ids } })
            .await?
            .try_collect::<Vec<_>>()
            .await?
    };

    let total_equipamientos = equipamientos_raw.len();
    let equipamientos: Vec<EquipamientoConEtiquetas> = equipamientos_raw
        .iter()
        .map(|e| EquipamientoConEtiquetas::from_equipamiento(e, &catalogo_map))
        .collect();

    let publicaciones_raw = db
        .collection::<crate::investigadores::models::Publicacion>("publicaciones")
        .find(doc! { "docente_id": id_docente })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

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

    let trazabilidad = TrazabilidadDocente {
        updated_at: docente.updated_at,
        fecha_ultima_sincronizacion_renacyt: docente.renacyt_fecha_ultima_sincronizacion,
        fecha_ultima_sincronizacion_pure: None,
    };

    Ok(ReporteDocenteIntegral {
        perfil,
        proyectos: proyectos_detalle,
        total_proyectos,
        recursos: RecursosDocenteResumen {
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
