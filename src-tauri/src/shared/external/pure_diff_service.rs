//! Verificacion de doble via contra el portal Pure (READ-ONLY).
//!
//! Compara el estado local de PJVPI contra lo que Pure expone hoy y
//! clasifica cada divergencia. **Nunca escribe en Pure**: el unico flujo
//! de escritura sigue siendo el pull (`pure_service::sync_publicaciones`,
//! upsert local por `pure_uuid`). El push a Pure queda como fase futura.
//!
//! Dos ejes de verificacion:
//!
//! - `diff_publicaciones` — publicaciones de un investigador (match por
//!   `pure_uuid`, fallback por DOI).
//! - `diff_personas` — mapeo global de personas (match por
//!   `pure_person_id`, fallback por DNI).
//!
//! Ambas persisten el resultado en `sync_reportes` (`SyncReportTipo::PureDiff`)
//! y lo devuelven al caller. Las entidades sincronizadas exactamente NO
//! generan item: el reporte lista solo lo que diverge.

use std::collections::{HashMap, HashSet};
use std::time::Instant;

use crate::investigadores::models::Investigador;
use crate::publicaciones::models::PublicacionCientifica;
use crate::reportes::sync_reportes::{
    self, ItemClasificacion, SyncReport, SyncReportItem, SyncReportTipo,
};
use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::shared::external::pure_client::{self, FetchedPublication};
use crate::shared::external::pure_service::map_pure_tipo;
use crate::shared::state::AppState;
use crate::shared::time;

// ─── Helpers puros de comparacion ─────────────────────────────────────────────

fn norm(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_lowercase)
}

/// Lista los campos que divergen entre la publicacion local y su
/// contraparte en Pure. Comparacion normalizada (trim + lowercase) para
/// no reportar ruido de formato.
fn diff_campos(local: &PublicacionCientifica, remoto: &FetchedPublication) -> Vec<String> {
    let mut campos = Vec::new();
    if norm(Some(&local.titulo)) != norm(Some(&remoto.titulo)) {
        campos.push("titulo".to_string());
    }
    if local.anio != remoto.anio_publicacion {
        campos.push("anio".to_string());
    }
    if norm(local.doi.as_deref()) != norm(remoto.doi.as_deref()) {
        campos.push("doi".to_string());
    }
    if norm(Some(&local.tipo)) != norm(Some(&map_pure_tipo(remoto.tipo_publicacion.as_deref()))) {
        campos.push("tipo".to_string());
    }
    if norm(local.pure_uuid.as_deref()) != norm(Some(&remoto.pure_uuid)) {
        campos.push("pure_uuid".to_string());
    }
    campos
}

/// Clasifica un par (local, remoto) ya emparejado o huerfano.
///
/// Devuelve `None` cuando ambos lados coinciden exactamente (no hay nada
/// que reportar) o cuando ambos son `None`. Funcion pura: sin I/O.
fn clasificar_item(
    local: Option<&PublicacionCientifica>,
    remoto: Option<&FetchedPublication>,
) -> Option<(ItemClasificacion, Vec<String>)> {
    match (local, remoto) {
        (Some(l), Some(r)) => {
            let campos = diff_campos(l, r);
            if campos.is_empty() {
                None
            } else {
                Some((ItemClasificacion::Diferente, campos))
            }
        }
        (Some(_), None) => Some((ItemClasificacion::SoloLocal, Vec::new())),
        (None, Some(_)) => Some((ItemClasificacion::SoloPure, Vec::new())),
        (None, None) => None,
    }
}

/// Construye el item del reporte para un par de publicaciones.
fn item_publicacion(
    local: Option<&PublicacionCientifica>,
    remoto: Option<&FetchedPublication>,
    clasificacion: ItemClasificacion,
    diferencias: Vec<String>,
) -> SyncReportItem {
    SyncReportItem {
        id_local: local.map(|l| l.id_publicacion.clone()),
        id_pure: remoto
            .map(|r| r.pure_uuid.clone())
            .or_else(|| local.and_then(|l| l.pure_uuid.clone())),
        doi: remoto
            .and_then(|r| r.doi.clone())
            .or_else(|| local.and_then(|l| l.doi.clone())),
        titulo: remoto
            .map(|r| r.titulo.clone())
            .or_else(|| local.map(|l| l.titulo.clone())),
        anio: remoto
            .and_then(|r| r.anio_publicacion)
            .or_else(|| local.and_then(|l| l.anio)),
        // Solo lo local pendiente de publicar es candidato al push futuro.
        adoptable: clasificacion == ItemClasificacion::SoloLocal
            && local.and_then(|l| l.pure_uuid.as_deref()).is_some(),
        clasificacion,
        diferencias,
    }
}

// ─── Diff de publicaciones de un investigador ─────────────────────────────────

/// Verifica las publicaciones de un investigador contra Pure y persiste el
/// reporte. Read-only respecto de Pure y de la BD local (solo escribe el
/// documento del reporte).
pub async fn diff_publicaciones(
    state: &AppState,
    investigador_id: &str,
) -> Result<SyncReport, AppError> {
    let db = state.mongo_db()?;
    let start = Instant::now();

    let investigador =
        crate::investigadores::repository::get_investigador_by_id(db, investigador_id).await?;
    let scopus_author_id = investigador
        .renacyt_scopus_author_id
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| {
            AppError::ExternalServiceError(
                "El investigador no tiene un Scopus Author ID registrado. \
                Sincronice primero los datos RENACYT para poder verificar contra Pure."
                    .to_string(),
            )
        })?;

    let locales =
        crate::publicaciones::repository::get_by_investigador(db, investigador_id).await?;
    let remotas = pure_client::fetch_research_outputs_by_scopus_id(
        &state.tokens,
        &state.pure_config.api_base_url,
        scopus_author_id,
    )
    .await?;

    let items = comparar_publicaciones(&locales, &remotas);
    let total = contar_universo(&locales, &remotas);

    let report = SyncReport {
        id: String::new(),
        tipo: SyncReportTipo::PureDiff,
        ejecutado_at: time::now_ms(),
        resumen: sync_reportes::build_resumen(&items, total, start.elapsed().as_millis() as i64),
        items,
    };
    sync_reportes::insert(db, report).await
}

/// Universo evaluado: entidades distintas considerando los emparejamientos.
fn contar_universo(locales: &[PublicacionCientifica], remotas: &[FetchedPublication]) -> usize {
    let emparejadas = remotas
        .iter()
        .filter(|r| buscar_local(locales, r).is_some())
        .count();
    locales.len() + remotas.len() - emparejadas
}

/// Empareja una publicacion remota con su contraparte local por
/// `pure_uuid` y, si no hay match, por DOI normalizado.
fn buscar_local<'a>(
    locales: &'a [PublicacionCientifica],
    remota: &FetchedPublication,
) -> Option<&'a PublicacionCientifica> {
    let por_uuid = locales
        .iter()
        .find(|l| norm(l.pure_uuid.as_deref()) == norm(Some(&remota.pure_uuid)));
    if por_uuid.is_some() {
        return por_uuid;
    }
    let doi_remoto = norm(remota.doi.as_deref())?;
    locales
        .iter()
        .find(|l| norm(l.doi.as_deref()).as_deref() == Some(doi_remoto.as_str()))
}

/// Recorre ambos lados y produce los items divergentes.
fn comparar_publicaciones(
    locales: &[PublicacionCientifica],
    remotas: &[FetchedPublication],
) -> Vec<SyncReportItem> {
    let mut items = Vec::new();
    let mut locales_emparejadas: HashSet<String> = HashSet::new();

    for remota in remotas {
        let local = buscar_local(locales, remota);
        if let Some(l) = local {
            locales_emparejadas.insert(l.id_publicacion.clone());
        }
        if let Some((clasificacion, diferencias)) = clasificar_item(local, Some(remota)) {
            items.push(item_publicacion(
                local,
                Some(remota),
                clasificacion,
                diferencias,
            ));
        }
    }

    for local in locales {
        if locales_emparejadas.contains(&local.id_publicacion) {
            continue;
        }
        if let Some((clasificacion, diferencias)) = clasificar_item(Some(local), None) {
            items.push(item_publicacion(
                Some(local),
                None,
                clasificacion,
                diferencias,
            ));
        }
    }

    items
}

// ─── Diff global de personas ──────────────────────────────────────────────────

/// Verifica el mapeo de personas PJVPI ↔ Pure y persiste el reporte.
/// Modo global del command `verificar_diferencias_pure` (sin investigador).
pub async fn diff_personas(state: &AppState) -> Result<SyncReport, AppError> {
    let db = state.mongo_db()?;
    let start = Instant::now();

    let mappings =
        pure_client::fetch_all_persons_mapping(&state.tokens, &state.pure_config.api_base_url)
            .await?;
    let investigadores = crate::investigadores::repository::get_all_investigadores(db).await?;
    let personas = crate::personas::repository::load_all_map(db).await?;

    // Indices locales: DNI normalizado -> investigador y nombre para display.
    let mut dni_por_investigador: HashMap<String, String> = HashMap::new();
    let mut nombre_por_investigador: HashMap<String, String> = HashMap::new();
    for inv in &investigadores {
        if let Some(p) = personas.get(&inv.persona_id) {
            if let Ok(dni) = Dni::new(&p.dni) {
                dni_por_investigador.insert(inv.id_investigador.clone(), dni.into_string());
            }
            nombre_por_investigador.insert(inv.id_investigador.clone(), p.nombre_completo.clone());
        }
    }

    let mut items = Vec::new();
    let mut emparejados: HashSet<String> = HashSet::new();

    for mapping in &mappings {
        let local = investigadores.iter().find(|inv| {
            emparejar_persona(inv, dni_por_investigador.get(&inv.id_investigador), mapping)
        });
        match local {
            Some(inv) => {
                emparejados.insert(inv.id_investigador.clone());
                let diferencias = diff_persona_campos(inv, mapping);
                if !diferencias.is_empty() {
                    items.push(item_persona(
                        Some(inv),
                        Some(&mapping.pure_person_id),
                        nombre_por_investigador.get(&inv.id_investigador).cloned(),
                        ItemClasificacion::Diferente,
                        diferencias,
                    ));
                }
            }
            None => items.push(item_persona(
                None,
                Some(&mapping.pure_person_id),
                mapping.dni.clone(),
                ItemClasificacion::SoloPure,
                Vec::new(),
            )),
        }
    }

    for inv in &investigadores {
        if emparejados.contains(&inv.id_investigador) {
            continue;
        }
        items.push(item_persona(
            Some(inv),
            inv.pure_person_id.as_deref(),
            nombre_por_investigador.get(&inv.id_investigador).cloned(),
            ItemClasificacion::SoloLocal,
            Vec::new(),
        ));
    }

    let total = investigadores.len() + mappings.len() - emparejados.len();
    let report = SyncReport {
        id: String::new(),
        tipo: SyncReportTipo::PureDiff,
        ejecutado_at: time::now_ms(),
        resumen: sync_reportes::build_resumen(&items, total, start.elapsed().as_millis() as i64),
        items,
    };
    sync_reportes::insert(db, report).await
}

/// Empareja por `pure_person_id` y, si el local aun no lo tiene, por DNI.
fn emparejar_persona(
    investigador: &Investigador,
    dni_local: Option<&String>,
    mapping: &pure_client::PurePersonMapping,
) -> bool {
    if norm(investigador.pure_person_id.as_deref()) == norm(Some(&mapping.pure_person_id)) {
        return true;
    }
    match (dni_local, mapping.dni.as_deref()) {
        (Some(local), Some(remoto)) => norm(Some(local)) == norm(Some(remoto)),
        _ => false,
    }
}

/// Divergencias de una persona emparejada: hoy solo el `pure_person_id`
/// sin asignar localmente (Pure ya la conoce pero PJVPI no la vinculo).
fn diff_persona_campos(
    investigador: &Investigador,
    mapping: &pure_client::PurePersonMapping,
) -> Vec<String> {
    if norm(investigador.pure_person_id.as_deref()) == norm(Some(&mapping.pure_person_id)) {
        Vec::new()
    } else {
        vec!["pure_person_id".to_string()]
    }
}

fn item_persona(
    investigador: Option<&Investigador>,
    pure_person_id: Option<&str>,
    titulo: Option<String>,
    clasificacion: ItemClasificacion,
    diferencias: Vec<String>,
) -> SyncReportItem {
    SyncReportItem {
        id_local: investigador.map(|i| i.id_investigador.clone()),
        id_pure: pure_person_id.map(str::to_string),
        doi: None,
        titulo,
        anio: None,
        clasificacion,
        diferencias,
        // La adopcion de personas no tiene path de pull equivalente al de
        // publicaciones: el mapeo se resuelve con `sincronizar_pure_person_ids`.
        adoptable: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::publicaciones::dto::CreatePublicacionRequest;

    fn fp(
        pure_uuid: &str,
        titulo: &str,
        doi: Option<&str>,
        anio: Option<i32>,
    ) -> FetchedPublication {
        FetchedPublication {
            pure_uuid: pure_uuid.to_string(),
            titulo: titulo.to_string(),
            tipo_publicacion: Some("journal article".to_string()),
            doi: doi.map(str::to_string),
            anio_publicacion: anio,
            autores_json: "[]".to_string(),
            estado_publicacion: Some("published".to_string()),
            journal_titulo: None,
            issn: None,
        }
    }

    fn local_from(fp: &FetchedPublication, id: &str) -> PublicacionCientifica {
        let request = CreatePublicacionRequest {
            titulo: fp.titulo.clone(),
            doi: fp.doi.clone(),
            issn: None,
            anio: fp.anio_publicacion,
            cuartil: None,
            tipo: map_pure_tipo(fp.tipo_publicacion.as_deref()),
            resumen: None,
            palabras_clave: Vec::new(),
            handle_url: None,
            fecha_publicacion: None,
            editorial: None,
            id_org_unit_editora: None,
            revista_titulo: None,
            isbn: None,
            scimago_cuartil: None,
            wos_cuartil: None,
            es_revisado_por_pares: true,
            acceso_abierto: None,
            idioma: None,
            volumen: None,
            numero_issue: None,
            paginas: None,
            dominio_origen: Some(crate::shared::vocab_mapper::DOMINIO_ORIGEN_PURE.to_string()),
            pure_uuid: Some(fp.pure_uuid.clone()),
            estado_publicacion: fp.estado_publicacion.clone(),
            id_proyecto: None,
            perucris_uuid: None,
        };
        PublicacionCientifica::new(id.to_string(), request).unwrap()
    }

    #[test]
    fn clasificar_item_pure_uuid_match_sin_diferencias_es_match_exacto() {
        let remota = fp("uuid-1", "Titulo A", Some("10.1/a"), Some(2024));
        let local = local_from(&remota, "pub-1");
        assert!(clasificar_item(Some(&local), Some(&remota)).is_none());
    }

    #[test]
    fn clasificar_item_pure_uuid_match_con_titulo_diferente_es_diferente_con_campo_titulo() {
        let remota = fp("uuid-1", "Titulo Nuevo", Some("10.1/a"), Some(2024));
        let local = local_from(
            &fp("uuid-1", "Titulo Viejo", Some("10.1/a"), Some(2024)),
            "pub-1",
        );
        let (clasificacion, campos) = clasificar_item(Some(&local), Some(&remota)).unwrap();
        assert_eq!(clasificacion, ItemClasificacion::Diferente);
        assert_eq!(campos, vec!["titulo".to_string()]);
    }

    #[test]
    fn clasificar_item_doi_match_con_pure_uuid_distinto_es_diferente() {
        let remota = fp("uuid-remoto", "Titulo A", Some("10.1/a"), Some(2024));
        let local = local_from(
            &fp("uuid-local", "Titulo A", Some("10.1/a"), Some(2024)),
            "pub-1",
        );
        // El emparejamiento por DOI encuentra la contraparte...
        let emparejada = buscar_local(std::slice::from_ref(&local), &remota).unwrap();
        // ...y la divergencia de identificador se reporta como campo.
        let (clasificacion, campos) = clasificar_item(Some(emparejada), Some(&remota)).unwrap();
        assert_eq!(clasificacion, ItemClasificacion::Diferente);
        assert!(campos.contains(&"pure_uuid".to_string()));
        assert!(!campos.contains(&"titulo".to_string()));
    }

    #[test]
    fn clasificar_item_no_match_es_solo_pure() {
        let remota = fp("uuid-1", "Titulo A", None, Some(2024));
        let (clasificacion, campos) = clasificar_item(None, Some(&remota)).unwrap();
        assert_eq!(clasificacion, ItemClasificacion::SoloPure);
        assert!(campos.is_empty());
    }

    #[test]
    fn clasificar_item_solo_local_cuando_pure_no_lo_tiene() {
        let local = local_from(&fp("uuid-1", "Titulo A", None, Some(2024)), "pub-1");
        let (clasificacion, _) = clasificar_item(Some(&local), None).unwrap();
        assert_eq!(clasificacion, ItemClasificacion::SoloLocal);
    }

    #[test]
    fn comparar_publicaciones_clasifica_los_tres_casos() {
        let remota_igual = fp("uuid-igual", "Igual", Some("10.1/igual"), Some(2023));
        let remota_diferente = fp("uuid-dif", "Titulo Remoto", Some("10.1/dif"), Some(2024));
        let remota_solo_pure = fp("uuid-pure", "Solo Pure", Some("10.1/pure"), Some(2022));

        let local_igual = local_from(&remota_igual, "pub-igual");
        let local_diferente = local_from(
            &fp("uuid-dif", "Titulo Local", Some("10.1/dif"), Some(2024)),
            "pub-dif",
        );
        let local_solo_local = local_from(
            &fp("uuid-local", "Solo Local", Some("10.1/local"), Some(2021)),
            "pub-local",
        );

        let locales = vec![local_igual, local_diferente, local_solo_local];
        let remotas = vec![remota_igual, remota_diferente, remota_solo_pure];
        let items = comparar_publicaciones(&locales, &remotas);

        // La coincidencia exacta no genera item.
        assert_eq!(items.len(), 3);
        let resumen = sync_reportes::build_resumen(&items, contar_universo(&locales, &remotas), 0);
        assert_eq!(resumen.diferentes, 1);
        assert_eq!(resumen.solo_pure, 1);
        assert_eq!(resumen.solo_local, 1);
        // 3 locales + 3 remotas - 2 emparejadas = 4 entidades distintas.
        assert_eq!(resumen.total, 4);
    }

    #[test]
    fn item_publicacion_marca_adoptable_solo_local_con_pure_uuid() {
        let local = local_from(&fp("uuid-1", "T", None, None), "pub-1");
        let item = item_publicacion(Some(&local), None, ItemClasificacion::SoloLocal, Vec::new());
        assert!(item.adoptable);
        assert_eq!(item.id_local.as_deref(), Some("pub-1"));
        assert_eq!(item.id_pure.as_deref(), Some("uuid-1"));

        let remota = fp("uuid-1", "T", None, None);
        let item_pure =
            item_publicacion(None, Some(&remota), ItemClasificacion::SoloPure, Vec::new());
        assert!(!item_pure.adoptable);
    }

    #[test]
    fn diff_persona_campos_detecta_person_id_sin_asignar() {
        let mapping = pure_client::PurePersonMapping {
            pure_person_id: "PER0001".to_string(),
            dni: Some("45678912".to_string()),
        };
        let mut inv = investigador_min();
        assert_eq!(
            diff_persona_campos(&inv, &mapping),
            vec!["pure_person_id".to_string()]
        );
        inv.pure_person_id = Some("PER0001".to_string());
        assert!(diff_persona_campos(&inv, &mapping).is_empty());
    }

    #[test]
    fn emparejar_persona_por_person_id_o_por_dni() {
        let mapping = pure_client::PurePersonMapping {
            pure_person_id: "PER0001".to_string(),
            dni: Some("45678912".to_string()),
        };
        let inv = investigador_min();
        // Sin pure_person_id local, empareja por DNI.
        assert!(emparejar_persona(
            &inv,
            Some(&"45678912".to_string()),
            &mapping
        ));
        // Sin DNI ni person_id no empareja.
        assert!(!emparejar_persona(&inv, None, &mapping));
        // Con pure_person_id igual empareja aunque no haya DNI.
        let mut inv_con_id = investigador_min();
        inv_con_id.pure_person_id = Some("PER0001".to_string());
        assert!(emparejar_persona(&inv_con_id, None, &mapping));
    }

    fn investigador_min() -> Investigador {
        use crate::investigadores::dto::CreateInvestigadorRequest;
        let request = CreateInvestigadorRequest {
            dni: "45678912".to_string(),
            id_grado: "g1".to_string(),
            nombres: "Maria".to_string(),
            apellido_paterno: "Lopez".to_string(),
            apellido_materno: None,
            correo: None,
            telefono: None,
            direccion: None,
            sexo: None,
            fecha_nacimiento: None,
            perfil: "docente".to_string(),
            renacyt: None,
            tipo_documento: None,
            pure_person_id: None,
            perucris_uuid: None,
        };
        Investigador::new("inv-1".to_string(), &request).unwrap()
    }
}
