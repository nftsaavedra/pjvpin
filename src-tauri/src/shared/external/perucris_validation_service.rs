//! Service del subsistema de validacion de sincronizacion PeruCRIS.
//!
//! Lee el modelo consolidado (CerifDocument), lo cruza con la API publica
//! de PeruCRIS (sin api-key) y devuelve un `PeruCrisValidationReport` con
//! cada entidad marcada como encontrada / faltante / con diferencias.
//!
//! **Adaptacion N2-G vs. doc original (INTEGRACION_PERUCRIS_PJVPIN.md):
//! la validacion de personas prioriza busqueda por DNI** (recon §2.3:
//! `perucris.author.dni` indexado), con ORCID como fallback. Esto responde
//! al requisito del usuario de "dar mucha prioridad a la validacion del DNI".

use std::time::Instant;

use crate::reportes::cerif;
use crate::shared::error::AppError;
use crate::shared::external::perucris_validation_dto::{
    PeruCrisValidationItem, PeruCrisValidationReport, ValidationTipo,
};
use crate::shared::external::perucris_validator::{PeruCrisHit, PeruCrisPublicClient};
use crate::shared::state::AppState;
use crate::shared::time;

/// Valida la sincronizacion contra PeruCRIS para todas las entidades
/// del scope solicitado. Para `CerifScope::Todo` (default) procesa
/// las 5 entidades; para scopes especificos, solo la entidad indicada.
pub async fn validar_sincronizacion(
    state: &AppState,
    scope: Option<String>,
) -> Result<PeruCrisValidationReport, AppError> {
    let db = state.mongo_db()?;
    let cerif_scope = cerif::parse_scope(scope.as_deref())?;
    let doc = cerif::build_cerif_document(db, cerif_scope).await?;

    let client = PeruCrisPublicClient::new();
    let start = Instant::now();
    let mut items = Vec::new();

    for org in &doc.organizaciones {
        items.push(validar_organizacion(&client, org).await?);
    }
    for persona in &doc.personas {
        items.push(validar_persona(&client, persona).await?);
    }
    for proyecto in &doc.proyectos {
        items.push(validar_proyecto(&client, proyecto).await?);
    }
    for publicacion in &doc.publicaciones {
        items.push(validar_publicacion(&client, publicacion).await?);
    }
    for patente in &doc.patentes {
        items.push(validar_patente(&client, patente).await?);
    }

    let total = items.len();
    let encontrados = items.iter().filter(|i| i.encontrado_en_perucris).count();
    let con_diferencias = items.iter().filter(|i| !i.diferencias.is_empty()).count();
    let faltantes = total - encontrados;

    Ok(PeruCrisValidationReport {
        ejecutado_at: time::now_ms(),
        total_evaluados: total,
        total_encontrados: encontrados,
        total_faltantes: faltantes,
        total_con_diferencias: con_diferencias,
        tiempo_total_ms: start.elapsed().as_millis() as i64,
        fuente_perucris: crate::shared::defaults::PERUCRIS_PUBLIC_API_BASE_URL.to_string(),
        items,
    })
}

/// Helper publico: valida una sola org_unit (usado por el command
/// `validar_org_unit_perucris`).
pub async fn validar_org_unit_una(
    state: &AppState,
    id_org_unit: &str,
) -> Result<PeruCrisValidationItem, AppError> {
    let db = state.mongo_db()?;
    let org = crate::org_units::repository::get_org_unit(db, id_org_unit).await?;
    let cerif = cerif::cerif_org_unit_from(&org, &[]);
    let client = PeruCrisPublicClient::new();
    validar_organizacion(&client, &cerif).await
}

/// Helper publico: valida una sola publicacion.
pub async fn validar_publicacion_una(
    state: &AppState,
    id_publicacion: &str,
) -> Result<PeruCrisValidationItem, AppError> {
    let db = state.mongo_db()?;
    let pub_obj = crate::publicaciones::repository::get_by_id(db, id_publicacion).await?;
    let autores =
        crate::publicaciones::autores::repository::list_by_publicacion(db, id_publicacion)
            .await
            .unwrap_or_default();
    let personas = crate::personas::repository::load_all_map(db)
        .await
        .unwrap_or_default();
    let cerif = cerif::cerif_publicacion_from(&pub_obj, &autores, &personas);
    let client = PeruCrisPublicClient::new();
    validar_publicacion(&client, &cerif).await
}

// ─── Validadores por tipo de entidad ──────────────────────────────────────────

async fn validar_organizacion(
    client: &PeruCrisPublicClient,
    org: &cerif::CerifOrgUnit,
) -> Result<PeruCrisValidationItem, AppError> {
    let mut item = PeruCrisValidationItem::new(ValidationTipo::OrgUnit, org.id_org_unit.clone());
    item.identificadores_esperados
        .insert("ruc".into(), org.ruc.clone());
    item.identificadores_esperados
        .insert("ror".into(), org.ror_id.clone());
    item.identificadores_esperados
        .insert("isni".into(), org.isni_id.clone());
    item.identificadores_esperados
        .insert("nombre".into(), Some(org.nombre.clone()));
    item.identificadores_esperados
        .insert("perucris_uuid".into(), org.perucris_uuid.clone());

    // Estrategia: buscar por RUC > ROR > ISNI en orden de prioridad.
    let query = org
        .ruc
        .as_deref()
        .or(org.ror_id.as_deref())
        .or(org.isni_id.as_deref());

    let Some(query) = query else {
        item.diferencias
            .push("orgunit sin ruc/ror/isni: no buscable en PeruCRIS publico".to_string());
        return Ok(item);
    };

    // Si ya tenemos el perucris_uuid canonico (seed UNF), hacer lookup directo
    // por UUID — mas confiable que la busqueda por RUC que puede traer
    // multiples hits.
    if let Some(uuid) = org.perucris_uuid.as_deref().filter(|s| !s.is_empty()) {
        if let Ok(remote) = client.find_by_uuid(uuid).await {
            populate_orgunit_match(&mut item, &remote, org);
            return Ok(item);
        }
        // Si falla el lookup por UUID, caemos al search por RUC/ROR/ISNI.
    }

    let hits = client.search_by_query(query, 5).await?;
    let orgunit_hits: Vec<&PeruCrisHit> = hits
        .iter()
        .filter(|h| {
            matches!(
                h.metadata.entity_type().as_deref(),
                Some("OrgUnit") | Some("InstitutionOrgUnit")
            )
        })
        .collect();

    // Deteccion de duplicados: si hay 2+ orgunits activos con el mismo
    // identificador, lo reportamos en diferencias (recon §3.1).
    if orgunit_hits.len() > 1 {
        item.diferencias.push(format!(
            "duplicado: {} entidades remotas con el mismo identificador",
            orgunit_hits.len()
        ));
    }

    match orgunit_hits.first() {
        None => Ok(item), // encontrado = false
        Some(remote) => {
            populate_orgunit_match(&mut item, remote, org);
            Ok(item)
        }
    }
}

async fn validar_persona(
    client: &PeruCrisPublicClient,
    persona: &cerif::CerifPerson,
) -> Result<PeruCrisValidationItem, AppError> {
    let mut item = PeruCrisValidationItem::new(ValidationTipo::Person, persona.id_persona.clone());
    item.identificadores_esperados
        .insert("dni".into(), Some(persona.dni.clone()));
    item.identificadores_esperados
        .insert("orcid".into(), persona.orcid.clone());

    // **N2-G adaptacion: prioridad DNI** (recon §2.3: `perucris.author.dni`
    // indexado). El doc original asumia solo-ORCID; corregimos para dar
    // prioridad al DNI como pidio el usuario.
    if !persona.dni.is_empty() {
        let hits = client.search_by_query(&persona.dni, 5).await?;
        let person_hits: Vec<&PeruCrisHit> = hits
            .iter()
            .filter(|h| {
                matches!(
                    h.metadata.entity_type().as_deref(),
                    Some("Person") | Some("ResearcherProfile")
                )
            })
            .collect();

        if let Some(remote) = person_hits.first() {
            item.encontrado_en_perucris = true;
            item.perucris_uuid = Some(remote.uuid.clone());
            item.last_modified_perucris = remote.last_modified.clone();
            diff_if_difer(
                &mut item.diferencias,
                "dni",
                &Some(persona.dni.clone()),
                &remote.metadata.first_value("perucris.author.dni"),
            );
            diff_if_difer(
                &mut item.diferencias,
                "nombre",
                &Some(persona.nombre_completo.clone()),
                &remote.metadata.first_value("dc.title"),
            );
            return Ok(item);
        }
    }

    // Fallback ORCID si el DNI no dio match.
    let Some(orcid) = persona.orcid.as_deref().filter(|s| !s.is_empty()) else {
        item.diferencias
            .push("persona sin DNI matchado y sin ORCID: no validable".to_string());
        return Ok(item);
    };

    let hits = client.search_by_query(&format!("orcid:{orcid}"), 5).await?;
    let person_hits: Vec<&PeruCrisHit> = hits
        .iter()
        .filter(|h| {
            matches!(
                h.metadata.entity_type().as_deref(),
                Some("Person") | Some("ResearcherProfile")
            )
        })
        .collect();

    match person_hits.first() {
        None => Ok(item),
        Some(remote) => {
            item.encontrado_en_perucris = true;
            item.perucris_uuid = Some(remote.uuid.clone());
            item.last_modified_perucris = remote.last_modified.clone();
            diff_if_difer(
                &mut item.diferencias,
                "orcid",
                &persona.orcid,
                &remote.metadata.first_value("perucris.author.orcid"),
            );
            Ok(item)
        }
    }
}

async fn validar_proyecto(
    client: &PeruCrisPublicClient,
    proyecto: &cerif::CerifProyecto,
) -> Result<PeruCrisValidationItem, AppError> {
    let mut item =
        PeruCrisValidationItem::new(ValidationTipo::Project, proyecto.id_proyecto.clone());
    item.identificadores_esperados
        .insert("codigo".into(), Some(proyecto.codigo.clone()));
    item.identificadores_esperados
        .insert("titulo".into(), Some(proyecto.titulo.clone()));

    let orgunit_padre = proyecto
        .participantes
        .iter()
        .find_map(|p| p.id_org_unit_afiliacion.clone());

    let Some(orgunit_id) = orgunit_padre else {
        item.diferencias
            .push("proyecto sin org_unit afiliada: no buscable".to_string());
        return Ok(item);
    };

    let hits = client
        .search_by_scope("RELATION.OrgUnit.projects", &orgunit_id, 100)
        .await?;
    let project_hits: Vec<&PeruCrisHit> = hits
        .iter()
        .filter(|h| h.metadata.entity_type().as_deref() == Some("Project"))
        .collect();

    let match_found = project_hits.iter().find(|h| {
        h.metadata.first_value("dc.identifier.codigo").as_deref() == Some(proyecto.codigo.as_str())
            || h.metadata.first_value("dc.title").as_deref() == Some(proyecto.titulo.as_str())
    });

    match match_found {
        None => Ok(item),
        Some(remote) => {
            item.encontrado_en_perucris = true;
            item.perucris_uuid = Some(remote.uuid.clone());
            item.perucris_handle = remote.handle.clone();
            item.last_modified_perucris = remote.last_modified.clone();
            Ok(item)
        }
    }
}

async fn validar_publicacion(
    client: &PeruCrisPublicClient,
    publicacion: &cerif::CerifPublicacion,
) -> Result<PeruCrisValidationItem, AppError> {
    let mut item = PeruCrisValidationItem::new(
        ValidationTipo::Publication,
        publicacion.id_publicacion.clone(),
    );
    item.identificadores_esperados
        .insert("doi".into(), publicacion.doi.clone());
    item.identificadores_esperados
        .insert("titulo".into(), Some(publicacion.titulo.clone()));

    if let Some(doi) = publicacion.doi.as_deref().filter(|s| !s.is_empty()) {
        let hits = client.search_by_query(doi, 5).await?;
        let pub_hits: Vec<&PeruCrisHit> = hits
            .iter()
            .filter(|h| {
                matches!(
                    h.metadata.entity_type().as_deref(),
                    Some("Publication") | Some("InstitutionPublication")
                )
            })
            .collect();

        if let Some(remote) = pub_hits.first() {
            item.encontrado_en_perucris = true;
            item.perucris_uuid = Some(remote.uuid.clone());
            item.perucris_handle = remote.handle.clone();
            item.last_modified_perucris = remote.last_modified.clone();
            diff_if_difer(
                &mut item.diferencias,
                "doi",
                &publicacion.doi,
                &remote.metadata.first_value("dc.identifier.doi"),
            );
            diff_if_difer(
                &mut item.diferencias,
                "titulo",
                &Some(publicacion.titulo.clone()),
                &remote.metadata.first_value("dc.title"),
            );
            return Ok(item);
        }
    }

    // Fallback: buscar por titulo (solo si la publicacion es corta).
    if publicacion.titulo.len() < 200 {
        let hits = client.search_by_query(&publicacion.titulo, 10).await?;
        let title_hits: Vec<&PeruCrisHit> = hits
            .iter()
            .filter(|h| {
                h.metadata.first_value("dc.title").as_deref() == Some(publicacion.titulo.as_str())
            })
            .collect();
        if let Some(remote) = title_hits.first() {
            item.encontrado_en_perucris = true;
            item.perucris_uuid = Some(remote.uuid.clone());
            item.last_modified_perucris = remote.last_modified.clone();
            item.diferencias
                .push("encontrado por titulo (sin DOI en PeruCRIS)".to_string());
        }
    }

    Ok(item)
}

async fn validar_patente(
    _client: &PeruCrisPublicClient,
    patente: &cerif::CerifPatente,
) -> Result<PeruCrisValidationItem, AppError> {
    let mut item = PeruCrisValidationItem::new(ValidationTipo::Patent, patente.id_patente.clone());
    item.identificadores_esperados
        .insert("numero".into(), patente.numero_patente.clone());
    item.identificadores_esperados
        .insert("titulo".into(), Some(patente.titulo.clone()));

    // LIMITACION CONOCIDA: PeruCRIS HAL publico no expone busqueda
    // especifica para patentes por numero o titulo de manera fiable.
    // Marcamos como no validable; el push sigue funcionando.
    item.diferencias
        .push("validacion de patentes no soportada por PeruCRIS HAL publico".to_string());
    Ok(item)
}

/// Puebla los campos comunes de un OrgUnit match con su contraparte PeruCRIS
/// y agrega las diferencias detectadas a `item.diferencias`.
fn populate_orgunit_match(
    item: &mut PeruCrisValidationItem,
    remote: &PeruCrisHit,
    local: &cerif::CerifOrgUnit,
) {
    item.encontrado_en_perucris = true;
    item.perucris_uuid = Some(remote.uuid.clone());
    item.perucris_handle = remote.handle.clone();
    item.last_modified_perucris = remote.last_modified.clone();

    diff_if_difer(
        &mut item.diferencias,
        "nombre",
        &Some(local.nombre.clone()),
        &remote.metadata.first_value("dc.title"),
    );
    diff_if_difer(
        &mut item.diferencias,
        "ruc",
        &local.ruc,
        &remote.metadata.first_value("organization.identifier.ruc"),
    );
    diff_if_difer(
        &mut item.diferencias,
        "ror",
        &local.ror_id,
        &remote.metadata.first_value("organization.identifier.ror"),
    );
    diff_if_difer(
        &mut item.diferencias,
        "isni",
        &local.isni_id,
        &remote.metadata.first_value("organization.identifier.isni"),
    );
}

/// Empuja un mensaje al vector de diferencias si `esperado` != `actual`
/// (ambos pasados por trim + filtro de vacios).
fn diff_if_difer(
    diffs: &mut Vec<String>,
    campo: &str,
    esperado: &Option<String>,
    actual: &Option<String>,
) {
    let exp = esperado.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let act = actual.as_deref().map(str::trim).filter(|s| !s.is_empty());
    match (exp, act) {
        (Some(e), Some(a)) if e != a => {
            diffs.push(format!("{}: local={} perucris={}", campo, e, a));
        }
        (Some(e), None) => {
            diffs.push(format!("{}: local={} perucris=<ausente>", campo, e));
        }
        (None, Some(a)) => {
            diffs.push(format!("{}: local=<ausente> perucris={}", campo, a));
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diff_if_difer_detecta_diferencias_basicas() {
        let mut diffs = Vec::new();
        diff_if_difer(
            &mut diffs,
            "ruc",
            &Some("20526270364".into()),
            &Some("20526270365".into()),
        );
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].contains("20526270364"));
        assert!(diffs[0].contains("20526270365"));
    }

    #[test]
    fn diff_if_difer_detecta_ausente_en_perucris() {
        let mut diffs = Vec::new();
        diff_if_difer(&mut diffs, "ror", &Some("017bd4h68".into()), &None);
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].contains("<ausente>"));
    }

    #[test]
    fn diff_if_difer_detecta_ausente_en_local() {
        let mut diffs = Vec::new();
        diff_if_difer(&mut diffs, "ror", &None, &Some("017bd4h68".into()));
        assert_eq!(diffs.len(), 1);
    }

    #[test]
    fn diff_if_difer_ignora_valores_iguales() {
        let mut diffs = Vec::new();
        diff_if_difer(
            &mut diffs,
            "ruc",
            &Some("20526270364".into()),
            &Some("20526270364".into()),
        );
        assert!(diffs.is_empty());
    }

    #[test]
    fn diff_if_difer_ignora_strings_vacios() {
        let mut diffs = Vec::new();
        diff_if_difer(&mut diffs, "ruc", &Some("   ".into()), &Some("  ".into()));
        assert!(diffs.is_empty());
    }

    #[test]
    fn diff_if_difer_trimea_espacios() {
        let mut diffs = Vec::new();
        diff_if_difer(
            &mut diffs,
            "ruc",
            &Some("  20526270364  ".into()),
            &Some("20526270364".into()),
        );
        assert!(diffs.is_empty());
    }
}
