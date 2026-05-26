use std::collections::{HashMap, HashSet};

use crate::catalogos::models::CatalogoItem;
use crate::docentes::models::{Docente, Publicacion};
use crate::docentes::repository as docentes_repo;
use crate::grupos::models::GrupoInvestigacion;
use crate::personas::models::Persona;
use crate::proyectos::models::{
    ExportData, ExportDataConProjectos, ExportDataDocentePerfil, ExportDataGrupo,
    ExportDataProyectoArea, ExportDataRecurso, Proyecto,
};
use crate::recursos::models::{Equipamiento, Financiamiento, Patente, Producto};
use crate::shared::data_loader;
use crate::shared::error::AppError;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

pub async fn get_data_exportacion_plana(db: &Database) -> Result<Vec<ExportData>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let docentes = data_loader::load_docentes_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut data = Vec::new();
    for participacion in participaciones {
        let Some(proyecto) = proyectos.get(&participacion.id_proyecto) else {
            continue;
        };
        let Some(docente) = docentes.get(&participacion.id_docente) else {
            continue;
        };
        if !proyecto.activo || docente.activo != 1 {
            continue;
        }
        let grado = data_loader::resolve_grado_nombre(&grados, &docente.id_grado);

        data.push(ExportData {
            proyecto: proyecto.titulo_proyecto.clone(),
            grado,
            renacyt_nivel: data_loader::resolve_renacyt_nivel(docente),
            docente: personas
                .get(&docente.persona_id)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
            dni: personas
                .get(&docente.persona_id)
                .map(|p| p.dni.clone())
                .unwrap_or_default(),
        });
    }

    data.sort_by(|a, b| {
        a.proyecto
            .cmp(&b.proyecto)
            .then_with(|| a.docente.cmp(&b.docente))
    });
    Ok(data)
}

pub async fn get_data_exportacion_agrupada_docente(
    db: &Database,
) -> Result<Vec<ExportDataConProjectos>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let docentes_activos = docentes_repo::get_all_docentes(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let docentes_ids: HashSet<String> = docentes_activos
        .iter()
        .map(|docente| docente.id_docente.clone())
        .collect();
    let mut proyectos_por_docente: HashMap<String, Vec<String>> = HashMap::new();

    for participacion in participaciones {
        if !docentes_ids.contains(&participacion.id_docente) {
            continue;
        }
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                proyectos_por_docente
                    .entry(participacion.id_docente)
                    .or_default()
                    .push(proyecto.titulo_proyecto.clone());
            }
        }
    }

    let mut data: Vec<ExportDataConProjectos> = docentes_activos
        .into_iter()
        .map(|docente| {
            let proyectos_docente = proyectos_por_docente
                .remove(&docente.id_docente)
                .unwrap_or_default();
            ExportDataConProjectos {
                docente: personas
                    .get(&docente.persona_id)
                    .map(|p| p.nombre_completo.clone())
                    .unwrap_or_default(),
                dni: personas
                    .get(&docente.persona_id)
                    .map(|p| p.dni.clone())
                    .unwrap_or_default(),
                grado: data_loader::resolve_grado_nombre(&grados, &docente.id_grado),
                renacyt_nivel: data_loader::resolve_renacyt_nivel(&docente),
                grupo_investigacion: docente
                    .grupo_investigacion_id
                    .as_ref()
                    .and_then(|gid| grupos.get(gid))
                    .map(|g| g.nombre.clone()),
                cantidad_proyectos: proyectos_docente.len() as i64,
                proyectos: data_loader::join_or_none(&proyectos_docente, " | "),
            }
        })
        .collect();

    data.sort_by(|a, b| a.docente.cmp(&b.docente));
    Ok(data)
}

pub async fn get_data_exportacion_grupos(db: &Database) -> Result<Vec<ExportDataGrupo>, AppError> {
    let docentes = data_loader::load_docentes_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let grupos = db
        .collection::<GrupoInvestigacion>("grupos_investigacion")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let mut proyectos_por_docente: HashMap<String, HashSet<String>> = HashMap::new();
    for p in &participaciones {
        proyectos_por_docente
            .entry(p.id_docente.clone())
            .or_default()
            .insert(p.id_proyecto.clone());
    }

    let mut data = Vec::new();
    for grupo in grupos {
        let miembros: Vec<&Docente> = docentes
            .values()
            .filter(|d| d.grupo_investigacion_id.as_deref() == Some(&grupo.id_grupo))
            .collect();

        let miembros_nombres: Vec<String> = miembros
            .iter()
            .map(|d| {
                personas
                    .get(&d.persona_id)
                    .map(|p| p.nombre_completo.clone())
                    .unwrap_or_default()
            })
            .collect();

        let coordinador = grupo.coordinador_id.as_ref().and_then(|cid| {
            docentes.get(cid).and_then(|d| {
                personas
                    .get(&d.persona_id)
                    .map(|p| p.nombre_completo.clone())
            })
        });

        let mut all_proyecto_ids = HashSet::new();
        for m in &miembros {
            if let Some(proj_ids) = proyectos_por_docente.get(&m.id_docente) {
                for pid in proj_ids {
                    all_proyecto_ids.insert(pid.clone());
                }
            }
        }

        let mut proyecto_titles: Vec<String> = all_proyecto_ids
            .iter()
            .filter_map(|pid| proyectos.get(pid))
            .filter(|p| p.activo)
            .map(|p| p.titulo_proyecto.clone())
            .collect();
        proyecto_titles.sort();

        data.push(ExportDataGrupo {
            grupo: grupo.nombre.clone(),
            descripcion: grupo.descripcion.clone(),
            coordinador,
            cantidad_miembros: miembros.len() as i64,
            miembros: data_loader::join_or_none(&miembros_nombres, " | "),
            lineas_investigacion: grupo.lineas_investigacion.clone(),
            cantidad_proyectos: proyecto_titles.len() as i64,
            proyectos: data_loader::join_or_none(&proyecto_titles, " | "),
        });
    }

    data.sort_by(|a, b| a.grupo.cmp(&b.grupo));
    Ok(data)
}

pub async fn get_data_exportacion_recursos(
    db: &Database,
) -> Result<Vec<ExportDataRecurso>, AppError> {
    let catalogo_map = data_loader::load_catalogos_map(db).await?;
    let docentes = data_loader::load_docentes_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;

    let patentes = db
        .collection::<Patente>("patentes")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let productos = db
        .collection::<Producto>("productos")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let equipamientos = db
        .collection::<Equipamiento>("equipamientos")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    let financiamientos = db
        .collection::<Financiamiento>("financiamientos")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;

    fn resolve_label(
        catalogo_map: &HashMap<(String, String), CatalogoItem>,
        tipo_catalogo: &str,
        codigo: &Option<String>,
    ) -> Option<String> {
        codigo.as_ref().and_then(|c| {
            catalogo_map
                .get(&(tipo_catalogo.to_string(), c.clone()))
                .map(|i| i.nombre.clone())
        })
    }

    fn resolve_proyecto(
        proyectos: &HashMap<String, Proyecto>,
        proyecto_id: &Option<String>,
    ) -> Option<String> {
        proyecto_id
            .as_ref()
            .and_then(|pid| proyectos.get(pid).map(|p| p.titulo_proyecto.clone()))
    }

    fn resolve_docente(
        docentes: &HashMap<String, Docente>,
        personas: &HashMap<String, Persona>,
        docente_id: &Option<String>,
    ) -> Option<String> {
        docente_id.as_ref().and_then(|did| {
            docentes.get(did).and_then(|d| {
                personas
                    .get(&d.persona_id)
                    .map(|p| p.nombre_completo.clone())
            })
        })
    }

    let mut data = Vec::new();

    for p in patentes {
        data.push(ExportDataRecurso {
            tipo_recurso: "Patente".to_string(),
            titulo_o_nombre: p.titulo.clone(),
            proyecto: resolve_proyecto(&proyectos, &p.proyecto_id),
            docente: resolve_docente(&docentes, &personas, &p.docente_id),
            tipo: resolve_label(&catalogo_map, "tipo_patente", &p.tipo),
            estado: resolve_label(&catalogo_map, "estado_patente", &p.estado),
            moneda: None,
            monto: None,
        });
    }

    for p in productos {
        data.push(ExportDataRecurso {
            tipo_recurso: "Producto".to_string(),
            titulo_o_nombre: p.nombre.clone(),
            proyecto: resolve_proyecto(&proyectos, &p.proyecto_id),
            docente: resolve_docente(&docentes, &personas, &p.docente_id),
            tipo: resolve_label(&catalogo_map, "tipo_producto", &p.tipo),
            estado: resolve_label(&catalogo_map, "etapa_producto", &p.etapa),
            moneda: None,
            monto: None,
        });
    }

    for e in equipamientos {
        data.push(ExportDataRecurso {
            tipo_recurso: "Equipamiento".to_string(),
            titulo_o_nombre: e.nombre.clone(),
            proyecto: resolve_proyecto(&proyectos, &e.proyecto_id),
            docente: None,
            tipo: None,
            estado: None,
            moneda: resolve_label(&catalogo_map, "moneda", &e.moneda),
            monto: e.valor_estimado,
        });
    }

    for f in financiamientos {
        data.push(ExportDataRecurso {
            tipo_recurso: "Financiamiento".to_string(),
            titulo_o_nombre: f.entidad_financiadora.clone(),
            proyecto: resolve_proyecto(&proyectos, &f.proyecto_id),
            docente: None,
            tipo: resolve_label(&catalogo_map, "tipo_financiamiento", &f.tipo),
            estado: resolve_label(&catalogo_map, "estado_financiero", &f.estado_financiero),
            moneda: resolve_label(&catalogo_map, "moneda", &f.moneda),
            monto: f.monto,
        });
    }

    data.sort_by(|a, b| {
        a.tipo_recurso.cmp(&b.tipo_recurso).then_with(|| {
            a.titulo_o_nombre
                .to_lowercase()
                .cmp(&b.titulo_o_nombre.to_lowercase())
        })
    });
    Ok(data)
}

pub async fn get_data_exportacion_docentes_perfil(
    db: &Database,
) -> Result<Vec<ExportDataDocentePerfil>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;
    let personas = data_loader::load_personas_map(db).await?;

    let mut docentes = db
        .collection::<Docente>("docentes")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
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

    let persona_a_docente: HashMap<String, String> = docentes
        .iter()
        .map(|d| (d.persona_id.clone(), d.id_docente.clone()))
        .collect();

    let mut proyectos_por_docente: HashMap<String, Vec<String>> = HashMap::new();
    for p in &participaciones {
        proyectos_por_docente
            .entry(p.id_docente.clone())
            .or_default()
            .push(p.id_proyecto.clone());
    }

    let publicaciones = db
        .collection::<Publicacion>("publicaciones")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let mut publicaciones_por_docente: HashMap<String, i64> = HashMap::new();
    for pub_item in &publicaciones {
        if let Some(doc_id) = persona_a_docente.get(&pub_item.persona_id) {
            *publicaciones_por_docente.entry(doc_id.clone()).or_default() += 1;
        }
    }

    let mut data = Vec::new();
    for docente in docentes {
        let grado = data_loader::resolve_grado_nombre(&grados, &docente.id_grado);

        let grupo_nombre = docente
            .grupo_investigacion_id
            .as_ref()
            .and_then(|gid| grupos.get(gid))
            .map(|g| g.nombre.clone());

        let proj_ids = proyectos_por_docente.get(&docente.id_docente);
        let mut proyecto_titles: Vec<String> = proj_ids
            .map(|ids| {
                ids.iter()
                    .filter_map(|pid| proyectos.get(pid))
                    .filter(|p| p.activo)
                    .map(|p| p.titulo_proyecto.clone())
                    .collect()
            })
            .unwrap_or_default();
        proyecto_titles.sort();
        let cantidad_proyectos = proyecto_titles.len() as i64;

        let cantidad_publicaciones = publicaciones_por_docente
            .get(&docente.id_docente)
            .copied()
            .unwrap_or(0);

        let persona = personas.get(&docente.persona_id);
        data.push(ExportDataDocentePerfil {
            dni: persona.map(|p| p.dni.clone()).unwrap_or_default(),
            nombres_apellidos: persona
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
            grado,
            renacyt_nivel: docente.renacyt_nivel.clone(),
            renacyt_grupo: docente.renacyt_grupo.clone(),
            renacyt_condicion: docente.renacyt_condicion.clone(),
            renacyt_orcid: docente.renacyt_orcid.clone(),
            grupo_investigacion: grupo_nombre,
            cantidad_proyectos,
            cantidad_publicaciones,
            proyectos: data_loader::join_or_none(&proyecto_titles, " | "),
            activo: docente.activo == 1,
        });
    }

    Ok(data)
}

pub async fn get_data_exportacion_proyectos_area(
    db: &Database,
) -> Result<Vec<ExportDataProyectoArea>, AppError> {
    let mut proyectos = db
        .collection::<Proyecto>("proyectos")
        .find(doc! { "activo": 1i64 })
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    proyectos.sort_by(|a, b| {
        a.titulo_proyecto
            .to_lowercase()
            .cmp(&b.titulo_proyecto.to_lowercase())
    });

    let participaciones = data_loader::load_participaciones(db).await?;

    let mut docentes_por_proyecto: HashMap<String, HashSet<String>> = HashMap::new();
    for p in &participaciones {
        docentes_por_proyecto
            .entry(p.id_proyecto.clone())
            .or_default()
            .insert(p.id_docente.clone());
    }

    let mut areas: HashMap<String, (Vec<String>, HashSet<String>)> = HashMap::new();
    for proyecto in proyectos {
        let area_key = proyecto
            .campo_ocde
            .clone()
            .unwrap_or_else(|| "Sin area OCDE".to_string());
        let entry = areas.entry(area_key).or_default();
        entry.0.push(proyecto.titulo_proyecto.clone());
        if let Some(docentes_set) = docentes_por_proyecto.get(&proyecto.id_proyecto) {
            for did in docentes_set {
                entry.1.insert(did.clone());
            }
        }
    }

    let mut data: Vec<ExportDataProyectoArea> = areas
        .into_iter()
        .map(
            |(area, (proyectos_list, docentes_set))| ExportDataProyectoArea {
                area,
                cantidad_proyectos: proyectos_list.len() as i64,
                proyectos: data_loader::join_or_none(&proyectos_list, " | "),
                cantidad_docentes: docentes_set.len() as i64,
            },
        )
        .collect();

    data.sort_by(|a, b| a.area.cmp(&b.area));
    Ok(data)
}
