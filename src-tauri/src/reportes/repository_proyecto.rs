use std::collections::HashMap;
use std::convert::TryFrom;

use futures_util::TryStreamExt;
use mongodb::{
    bson::{doc, Document},
    Database,
};

use crate::catalogos::models::CatalogoItem;
use crate::investigadores::models::Publicacion;
use crate::proyectos::dto::{ParticipacionRecordDto, ProyectoDto};
use crate::proyectos::models::{ParticipacionRecord, Proyecto};
use crate::recursos::models::{Equipamiento, Financiamiento, Patente, Producto};
use crate::reportes::dto::*;
use crate::shared::data_loader;
use crate::shared::error::AppError;

// ═══════════════════════════════════════════════════════════════════════════════
// Reporte Proyecto Integral
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn build_reporte_proyecto_integral(
    db: &Database,
    id_proyecto: &str,
) -> Result<ReporteProyectoIntegral, AppError> {
    let catalogo_map = data_loader::load_catalogos_map(db).await?;
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;

    let proyecto_doc = db
        .collection::<Document>("proyectos")
        .find_one(doc! { "id_proyecto": id_proyecto })
        .await?
        .ok_or_else(|| AppError::NotFound("Proyecto no encontrado.".to_string()))?;
    let proyecto_dto: ProyectoDto = mongodb::bson::from_document(proyecto_doc)
        .map_err(|e| AppError::InternalError(format!("BSON->ProyectoDto: {e}")))?;
    let proyecto = Proyecto::try_from(proyecto_dto)?;

    let cabecera = ProyectoCabeceraReporte {
        id_proyecto: proyecto.id_proyecto.clone(),
        titulo_proyecto: proyecto.titulo_proyecto.clone(),
        activo: proyecto.activo,
        campo_ocde: proyecto.campo_ocde.clone(),
        programas_relacionados: proyecto.programas_relacionados.clone(),
        fecha_creacion: None,
        fecha_actualizacion: proyecto.updated_at.map(|t| t.to_string()),
    };

    let participaciones_cursor = db
        .collection::<Document>("participaciones")
        .find(doc! { "id_proyecto": id_proyecto })
        .await?;
    let participaciones_docs: Vec<Document> = participaciones_cursor.try_collect().await?;
    let participaciones: Vec<ParticipacionRecord> = participaciones_docs
        .into_iter()
        .map(|d| {
            let dto: ParticipacionRecordDto = mongodb::bson::from_document(d).map_err(|e| {
                AppError::InternalError(format!("BSON->ParticipacionRecordDto: {e}"))
            })?;
            ParticipacionRecord::try_from(dto)
        })
        .collect::<Result<Vec<_>, _>>()?;

    let mut equipo: Vec<MiembroProyectoReporte> = Vec::new();
    for part in &participaciones {
        let investigador =
            crate::investigadores::repository::get_investigador_by_id(db, &part.id_investigador)
                .await?;

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

        let publicaciones_count = db
            .collection::<Publicacion>("publicaciones")
            .count_documents(doc! { "persona_id": &investigador.persona_id })
            .await? as i64;

        let persona_doc = personas.get(&investigador.persona_id);
        equipo.push(MiembroProyectoReporte {
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
            es_responsable: part.es_responsable,
            renacyt_codigo_registro: investigador.renacyt_codigo_registro.clone(),
            renacyt_nivel: investigador.renacyt_nivel.clone(),
            renacyt_grupo: investigador.renacyt_grupo.clone(),
            renacyt_condicion: investigador.renacyt_condicion.clone(),
            renacyt_orcid: investigador.renacyt_orcid.clone(),
            renacyt_scopus_author_id: investigador.renacyt_scopus_author_id.clone(),
            grupo_nombre,
            grupo_id,
            publicaciones_count,
        });
    }

    let total_investigadores = equipo.len();

    let patentes_raw: Vec<Patente> = {
        use crate::recursos::dto::PatenteDto;
        use std::convert::TryFrom;
        let cursor = db
            .collection::<mongodb::bson::Document>("patentes")
            .find(doc! { "proyecto_id": id_proyecto })
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
        use crate::recursos::dto::ProductoDto;
        use std::convert::TryFrom;
        let cursor = db
            .collection::<mongodb::bson::Document>("productos")
            .find(doc! { "proyecto_id": id_proyecto })
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

    let equipamientos_raw: Vec<Equipamiento> = {
        use crate::recursos::dto::EquipamientoDto;
        use std::convert::TryFrom;
        let cursor = db
            .collection::<mongodb::bson::Document>("equipamientos")
            .find(doc! { "proyecto_id": id_proyecto })
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

    let financiamientos_raw: Vec<Financiamiento> = {
        use crate::recursos::dto::FinanciamientoDto;
        use std::convert::TryFrom;
        let cursor = db
            .collection::<mongodb::bson::Document>("financiamientos")
            .find(doc! { "proyecto_id": id_proyecto })
            .await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        docs.into_iter()
            .map(|d| {
                let dto: FinanciamientoDto = mongodb::bson::from_document(d).map_err(|e| {
                    AppError::InternalError(format!("BSON->FinanciamientoDto: {e}"))
                })?;
                Financiamiento::try_from(dto)
            })
            .collect::<Result<Vec<_>, _>>()?
    };

    let total_financiamientos = financiamientos_raw.len();
    let financiamientos: Vec<FinanciamientoConEtiquetas> = financiamientos_raw
        .iter()
        .map(|f| FinanciamientoConEtiquetas::from_financiamiento(f, &catalogo_map))
        .collect();

    let resumen_financiero = build_resumen_financiero(&financiamientos, &catalogo_map);

    Ok(ReporteProyectoIntegral {
        cabecera,
        equipo,
        total_investigadores,
        patentes,
        total_patentes,
        productos,
        total_productos,
        equipamientos,
        total_equipamientos,
        financiamientos,
        total_financiamientos,
        resumen_financiero,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

fn build_resumen_financiero(
    financiamientos: &[FinanciamientoConEtiquetas],
    catalogo_map: &HashMap<(String, String), CatalogoItem>,
) -> ResumenFinanciero {
    let total_financiamientos = financiamientos.len();

    let mut moneda_groups: HashMap<String, MonedaDesglose> = HashMap::new();
    let mut estado_groups: HashMap<String, EstadoDesglose> = HashMap::new();

    for f in financiamientos {
        let moneda_key = f
            .moneda_codigo
            .clone()
            .unwrap_or_else(|| "sin_moneda".to_string());
        let moneda_nombre = f
            .moneda_nombre
            .clone()
            .or_else(|| {
                f.moneda_codigo
                    .as_ref()
                    .and_then(|c| catalogo_map.get(&("moneda".to_string(), c.clone())))
                    .map(|i| i.nombre.clone())
            })
            .unwrap_or_else(|| "Sin moneda".to_string());

        let entry = moneda_groups
            .entry(moneda_key.clone())
            .or_insert_with(|| MonedaDesglose {
                moneda_codigo: moneda_key.clone(),
                moneda_nombre: moneda_nombre.clone(),
                cantidad: 0,
                monto_total: 0.0,
            });
        entry.cantidad += 1;
        entry.monto_total += f.monto.unwrap_or(0.0);

        let estado_key = f
            .estado_financiero_codigo
            .clone()
            .unwrap_or_else(|| "sin_estado".to_string());
        let estado_nombre = f
            .estado_financiero_nombre
            .clone()
            .or_else(|| {
                f.estado_financiero_codigo
                    .as_ref()
                    .and_then(|c| catalogo_map.get(&("estado_financiero".to_string(), c.clone())))
                    .map(|i| i.nombre.clone())
            })
            .unwrap_or_else(|| "Sin estado".to_string());

        estado_groups
            .entry(estado_key.clone())
            .or_insert_with(|| EstadoDesglose {
                estado_codigo: estado_key.clone(),
                estado_nombre: estado_nombre.clone(),
                cantidad: 0,
            })
            .cantidad += 1;
    }

    let mut desglose_por_moneda: Vec<MonedaDesglose> = moneda_groups.into_values().collect();
    desglose_por_moneda.sort_by(|a, b| a.moneda_codigo.cmp(&b.moneda_codigo));

    let mut desglose_por_estado: Vec<EstadoDesglose> = estado_groups.into_values().collect();
    desglose_por_estado.sort_by(|a, b| a.estado_codigo.cmp(&b.estado_codigo));

    ResumenFinanciero {
        total_financiamientos,
        desglose_por_moneda,
        desglose_por_estado,
    }
}
