use std::collections::{HashMap, HashSet};

use crate::catalogos::models::CatalogoItem;
use crate::investigadores::models::{Investigador, Publicacion};
use crate::investigadores::repository as investigadores_repo;
use crate::personas::models::Persona;
use crate::proyectos::models::{
    ExportData, ExportDataConProjectos, ExportDataGrupo, ExportDataInvestigadorPerfil,
    ExportDataProyectoArea, ExportDataRecurso, Proyecto,
};
use crate::recursos::models::{Equipamiento, Financiamiento, Patente, Producto};
use crate::shared::data_loader;
use crate::shared::error::AppError;
use futures_util::TryStreamExt;
use mongodb::{bson::doc, Database};

pub async fn get_data_exportacion_plana(db: &Database) -> Result<Vec<ExportData>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let investigadores = data_loader::load_investigadores_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let mut data = Vec::new();
    for participacion in participaciones {
        let Some(proyecto) = proyectos.get(&participacion.id_proyecto) else {
            continue;
        };
        let Some(investigador) = investigadores.get(&participacion.id_investigador) else {
            continue;
        };
        if !proyecto.activo || investigador.activo != 1 {
            continue;
        }
        let grado = data_loader::resolve_grado_nombre(&grados, &investigador.id_grado);

        data.push(ExportData {
            proyecto: proyecto.titulo_proyecto.clone(),
            grado,
            renacyt_nivel: data_loader::resolve_renacyt_nivel(investigador),
            investigador: personas
                .get(&investigador.persona_id)
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
            dni: personas
                .get(&investigador.persona_id)
                .map(|p| p.dni.clone())
                .unwrap_or_default(),
        });
    }

    data.sort_by(|a, b| {
        a.proyecto
            .cmp(&b.proyecto)
            .then_with(|| a.investigador.cmp(&b.investigador))
    });
    Ok(data)
}

pub async fn get_data_exportacion_agrupada_investigador(
    db: &Database,
) -> Result<Vec<ExportDataConProjectos>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let investigadores_activos = investigadores_repo::get_all_investigadores(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let investigadores_ids: HashSet<String> = investigadores_activos
        .iter()
        .map(|investigador| investigador.id_investigador.clone())
        .collect();
    let mut proyectos_por_investigador: HashMap<String, Vec<String>> = HashMap::new();

    for participacion in participaciones {
        if !investigadores_ids.contains(&participacion.id_investigador) {
            continue;
        }
        if let Some(proyecto) = proyectos.get(&participacion.id_proyecto) {
            if proyecto.activo {
                proyectos_por_investigador
                    .entry(participacion.id_investigador)
                    .or_default()
                    .push(proyecto.titulo_proyecto.clone());
            }
        }
    }

    let mut data: Vec<ExportDataConProjectos> = investigadores_activos
        .into_iter()
        .map(|investigador| {
            let proyectos_investigador = proyectos_por_investigador
                .remove(&investigador.id_investigador)
                .unwrap_or_default();
            ExportDataConProjectos {
                investigador: personas
                    .get(&investigador.persona_id)
                    .map(|p| p.nombre_completo.clone())
                    .unwrap_or_default(),
                dni: personas
                    .get(&investigador.persona_id)
                    .map(|p| p.dni.clone())
                    .unwrap_or_default(),
                grado: data_loader::resolve_grado_nombre(&grados, &investigador.id_grado),
                renacyt_nivel: data_loader::resolve_renacyt_nivel(&investigador),
                grupo_investigacion: investigador
                    .grupo_investigacion_id
                    .as_ref()
                    .and_then(|gid| grupos.get(gid))
                    .map(|g| g.nombre.clone()),
                cantidad_proyectos: proyectos_investigador.len() as i64,
                proyectos: data_loader::join_or_none(&proyectos_investigador, " | "),
            }
        })
        .collect();

    data.sort_by(|a, b| a.investigador.cmp(&b.investigador));
    Ok(data)
}

pub async fn get_data_exportacion_grupos(db: &Database) -> Result<Vec<ExportDataGrupo>, AppError> {
    let investigadores = data_loader::load_investigadores_map(db).await?;
    let personas = data_loader::load_personas_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;

    let grupos = crate::grupos::repository::get_all_grupos(db).await?;

    let mut proyectos_por_investigador: HashMap<String, HashSet<String>> = HashMap::new();
    for p in &participaciones {
        proyectos_por_investigador
            .entry(p.id_investigador.clone())
            .or_default()
            .insert(p.id_proyecto.clone());
    }

    let mut data = Vec::new();
    for grupo in grupos {
        let miembros: Vec<&Investigador> = investigadores
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
            investigadores.get(cid).and_then(|d| {
                personas
                    .get(&d.persona_id)
                    .map(|p| p.nombre_completo.clone())
            })
        });

        let mut all_proyecto_ids = HashSet::new();
        for m in &miembros {
            if let Some(proj_ids) = proyectos_por_investigador.get(&m.id_investigador) {
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
    let investigadores = data_loader::load_investigadores_map(db).await?;
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

    fn resolve_investigador(
        investigadores: &HashMap<String, Investigador>,
        personas: &HashMap<String, Persona>,
        investigador_id: &Option<String>,
    ) -> Option<String> {
        investigador_id.as_ref().and_then(|did| {
            investigadores.get(did).and_then(|d| {
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
            investigador: resolve_investigador(&investigadores, &personas, &p.investigador_id),
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
            investigador: resolve_investigador(&investigadores, &personas, &p.investigador_id),
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
            investigador: None,
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
            investigador: None,
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

pub async fn get_data_exportacion_investigadores_perfil(
    db: &Database,
) -> Result<Vec<ExportDataInvestigadorPerfil>, AppError> {
    let grados = data_loader::load_grados_map(db).await?;
    let grupos = data_loader::load_grupos_map(db).await?;
    let proyectos = data_loader::load_proyectos_map(db).await?;
    let participaciones = data_loader::load_participaciones(db).await?;
    let personas = data_loader::load_personas_map(db).await?;

    let mut investigadores = db
        .collection::<Investigador>("investigadores")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
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

    let persona_a_investigador: HashMap<String, String> = investigadores
        .iter()
        .map(|d| (d.persona_id.clone(), d.id_investigador.clone()))
        .collect();

    let mut proyectos_por_investigador: HashMap<String, Vec<String>> = HashMap::new();
    for p in &participaciones {
        proyectos_por_investigador
            .entry(p.id_investigador.clone())
            .or_default()
            .push(p.id_proyecto.clone());
    }

    let publicaciones = db
        .collection::<Publicacion>("publicaciones")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await?;
    let mut publicaciones_por_investigador: HashMap<String, i64> = HashMap::new();
    for pub_item in &publicaciones {
        if let Some(doc_id) = persona_a_investigador.get(&pub_item.persona_id) {
            *publicaciones_por_investigador
                .entry(doc_id.clone())
                .or_default() += 1;
        }
    }

    let mut data = Vec::new();
    for investigador in investigadores {
        let grado = data_loader::resolve_grado_nombre(&grados, &investigador.id_grado);

        let grupo_nombre = investigador
            .grupo_investigacion_id
            .as_ref()
            .and_then(|gid| grupos.get(gid))
            .map(|g| g.nombre.clone());

        let proj_ids = proyectos_por_investigador.get(&investigador.id_investigador);
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

        let cantidad_publicaciones = publicaciones_por_investigador
            .get(&investigador.id_investigador)
            .copied()
            .unwrap_or(0);

        let persona = personas.get(&investigador.persona_id);
        data.push(ExportDataInvestigadorPerfil {
            dni: persona.map(|p| p.dni.clone()).unwrap_or_default(),
            nombres_apellidos: persona
                .map(|p| p.nombre_completo.clone())
                .unwrap_or_default(),
            grado,
            renacyt_nivel: investigador.renacyt_nivel.clone(),
            renacyt_grupo: investigador.renacyt_grupo.clone(),
            renacyt_condicion: investigador.renacyt_condicion.clone(),
            renacyt_orcid: investigador.renacyt_orcid.clone(),
            grupo_investigacion: grupo_nombre,
            cantidad_proyectos,
            cantidad_publicaciones,
            proyectos: data_loader::join_or_none(&proyecto_titles, " | "),
            activo: investigador.activo == 1,
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

    let mut investigadores_por_proyecto: HashMap<String, HashSet<String>> = HashMap::new();
    for p in &participaciones {
        investigadores_por_proyecto
            .entry(p.id_proyecto.clone())
            .or_default()
            .insert(p.id_investigador.clone());
    }

    let mut areas: HashMap<String, (Vec<String>, HashSet<String>)> = HashMap::new();
    for proyecto in proyectos {
        let area_key = proyecto
            .campo_ocde
            .clone()
            .unwrap_or_else(|| "Sin area OCDE".to_string());
        let entry = areas.entry(area_key).or_default();
        entry.0.push(proyecto.titulo_proyecto.clone());
        if let Some(investigadores_set) = investigadores_por_proyecto.get(&proyecto.id_proyecto) {
            for did in investigadores_set {
                entry.1.insert(did.clone());
            }
        }
    }

    let mut data: Vec<ExportDataProyectoArea> = areas
        .into_iter()
        .map(
            |(area, (proyectos_list, investigadores_set))| ExportDataProyectoArea {
                area,
                cantidad_proyectos: proyectos_list.len() as i64,
                proyectos: data_loader::join_or_none(&proyectos_list, " | "),
                cantidad_investigadores: investigadores_set.len() as i64,
            },
        )
        .collect();

    data.sort_by(|a, b| a.area.cmp(&b.area));
    Ok(data)
}
