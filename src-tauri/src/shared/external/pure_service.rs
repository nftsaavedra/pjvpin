use mongodb::bson::{doc, Document};
use mongodb::options::UpdateOptions;

use crate::investigadores::dto::SyncPublicacionesResult;
use crate::personas::repository as personas_repo;
use crate::publicaciones::autores::PublicacionAutor;
use crate::publicaciones::dto::CreatePublicacionRequest;
use crate::publicaciones::models::PublicacionCientifica;
use crate::publicaciones::repository::model_to_dto;
use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::shared::external::pure_client;
use crate::shared::state::AppState;
use crate::shared::time;
use crate::shared::vocab_mapper::{
    DOMINIO_ORIGEN_PURE, PUBLICACION_TIPO_ARTICULO, PUBLICACION_TIPO_ARTICULO_CONFERENCIA,
    PUBLICACION_TIPO_CAPITULO_LIBRO, PUBLICACION_TIPO_CARTA, PUBLICACION_TIPO_CONFERENCE_PAPER,
    PUBLICACION_TIPO_JOURNAL_ARTICLE, PUBLICACION_TIPO_LETTER, PUBLICACION_TIPO_LIBRO,
    PUBLICACION_TIPO_RESENA, PUBLICACION_TIPO_REVIEW, PUBLICACION_TIPO_SOFTWARE,
    PUBLICACION_TIPO_TESIS,
};

/// Mapea el termino de tipo de publicacion de Pure (ingles) al subconjunto
/// de tipos validados por `PublicacionCientifica` (CERIF/PeruCRIS).
///
/// Los terminos Pure que ya existen en `PUBLICACIONES_TIPOS_VALIDOS` se
/// conservan tal cual. Los sinonimos conocidos se traducen al tipo canonico
/// en espanol. Cualquier termino desconocido (o ausencia) cae al default
/// `articulo`.
pub fn map_pure_tipo(tipo: Option<&str>) -> String {
    let t = tipo.map(|s| s.trim().to_lowercase());
    match t.as_deref() {
        // Terminos Pure que ya son tipos validos (CERIF EN).
        Some("journal article") => PUBLICACION_TIPO_JOURNAL_ARTICLE.to_string(),
        Some("conference paper") => PUBLICACION_TIPO_CONFERENCE_PAPER.to_string(),
        Some("letter") => PUBLICACION_TIPO_LETTER.to_string(),
        Some("review") => PUBLICACION_TIPO_REVIEW.to_string(),
        // Sinonimos Pure -> tipos canonicos ES.
        Some("article")
        | Some("research article")
        | Some("original article")
        | Some("working paper")
        | Some("report")
        | Some("technical report") => PUBLICACION_TIPO_ARTICULO.to_string(),
        Some("conference contribution")
        | Some("conference abstract")
        | Some("conference proceeding")
        | Some("abstract") => PUBLICACION_TIPO_ARTICULO_CONFERENCIA.to_string(),
        Some("editorial") | Some("correspondence") => PUBLICACION_TIPO_CARTA.to_string(),
        Some("book review") | Some("literature review") => PUBLICACION_TIPO_RESENA.to_string(),
        Some("book") | Some("monograph") => PUBLICACION_TIPO_LIBRO.to_string(),
        Some("book chapter") | Some("chapter") => PUBLICACION_TIPO_CAPITULO_LIBRO.to_string(),
        Some("thesis")
        | Some("doctoral thesis")
        | Some("master's thesis")
        | Some("bachelor thesis") => PUBLICACION_TIPO_TESIS.to_string(),
        Some("software") | Some("computer program") => PUBLICACION_TIPO_SOFTWARE.to_string(),
        _ => PUBLICACION_TIPO_ARTICULO.to_string(),
    }
}

/// Construye el request de creacion del modelo consolidado a partir de una
/// publicacion descargada de Pure.
fn build_request(fp: pure_client::FetchedPublication) -> CreatePublicacionRequest {
    CreatePublicacionRequest {
        titulo: fp.titulo,
        doi: fp.doi,
        issn: fp.issn,
        anio: fp.anio_publicacion,
        cuartil: None,
        tipo: map_pure_tipo(fp.tipo_publicacion.as_deref()),
        resumen: None,
        palabras_clave: Vec::new(),
        handle_url: None,
        fecha_publicacion: None,
        editorial: None,
        id_org_unit_editora: None,
        revista_titulo: fp.journal_titulo,
        isbn: None,
        scimago_cuartil: None,
        wos_cuartil: None,
        es_revisado_por_pares: true,
        acceso_abierto: None,
        idioma: None,
        volumen: None,
        numero_issue: None,
        paginas: None,
        dominio_origen: Some(DOMINIO_ORIGEN_PURE.to_string()),
        pure_uuid: Some(fp.pure_uuid),
        estado_publicacion: fp.estado_publicacion,
        id_proyecto: None,
        perucris_uuid: None,
    }
}

/// Normaliza un nombre para resolver autores contra `Persona.nombre_completo`.
///
/// - Trata el formato de Pure `"Apellido, Nombre"` reordenandolo a
///   `"Nombre Apellido"` (formato de `nombre_completo`).
/// - Colapsa espacios y compara en lowercase (match case-insensitive).
fn normalize_autor(nombre: &str) -> String {
    let trimmed = nombre.trim();
    let reordered = if let Some((apellidos, nombres)) = trimmed.split_once(',') {
        format!("{} {}", nombres.trim(), apellidos.trim())
    } else {
        trimmed.to_string()
    };
    reordered
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Reemplaza los autores del pivot `publicacion_autores` de una publicacion.
///
/// Autores cuyo nombre no resuelve a una `Persona` existente se omiten
/// (no se inventan identidades). El investigador sincronizado aparece como
/// autor solo si su nombre esta en la lista de autores de Pure.
async fn sync_autores_pivot(
    db: &mongodb::Database,
    id_publicacion: &str,
    autores_json: &str,
    personas_by_nombre: &std::collections::HashMap<String, String>,
) -> Result<(), AppError> {
    use crate::publicaciones::autores::repository as pivot_repo;

    let autores: Vec<String> = serde_json::from_str(autores_json).unwrap_or_default();

    pivot_repo::delete_for_publicacion(db, id_publicacion).await?;

    let mut personas_agregadas: std::collections::HashSet<String> =
        std::collections::HashSet::new();
    for (idx, autor) in autores.iter().enumerate() {
        let key = normalize_autor(autor);
        if key.is_empty() {
            continue;
        }
        let Some(id_persona) = personas_by_nombre.get(&key) else {
            continue;
        };
        if !personas_agregadas.insert(id_persona.clone()) {
            // Pure puede repetir el mismo autor; el indice UNIQUE del pivot
            // no permite duplicados (id_publicacion, id_persona).
            continue;
        }
        let pa = PublicacionAutor::new(
            uuid::Uuid::new_v4().to_string(),
            id_publicacion.to_string(),
            id_persona.clone(),
            None,
            (idx + 1) as i32,
            false,
        )?;
        pivot_repo::insert(db, &pa).await?;
    }
    Ok(())
}

pub async fn sync_publicaciones(
    state: &AppState,
    investigador_id: &str,
) -> Result<SyncPublicacionesResult, AppError> {
    let db = state.mongo_db()?;

    let investigador =
        crate::investigadores::repository::get_investigador_by_id(db, investigador_id).await?;

    let scopus_author_id = investigador
        .renacyt_scopus_author_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::InternalError(
                "El investigador no tiene un Scopus Author ID registrado. \
                Sincronice primero los datos RENACYT del investigador para obtenerlo."
                    .to_string(),
            )
        })?;

    let pure_person_uuid = pure_client::resolve_person_uuid(
        &state.tokens,
        &state.pure_config.api_base_url,
        scopus_author_id,
    )
    .await
    .unwrap_or(None);

    let fetched = pure_client::fetch_research_outputs_by_scopus_id(
        &state.tokens,
        &state.pure_config.api_base_url,
        scopus_author_id,
    )
    .await?;

    let total_encontradas = fetched.len();
    let mut nuevas = 0usize;
    let mut actualizadas = 0usize;
    let now_ms = time::now_ms();

    // Indice por nombre normalizado para resolver autores del pivot.
    let personas_by_nombre: std::collections::HashMap<String, String> =
        crate::personas::repository::load_all_map(db)
            .await?
            .values()
            .map(|p| (normalize_autor(&p.nombre_completo), p.id_persona.clone()))
            .collect();

    let col = db.collection::<Document>("publicaciones_cientificas");

    for fp in fetched {
        let pure_uuid = fp.pure_uuid.clone();
        let autores_json = fp.autores_json.clone();
        let request = build_request(fp);

        let new_id = uuid::Uuid::new_v4().to_string();
        let model = match PublicacionCientifica::new(new_id.clone(), request) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(
                    pure_uuid = %pure_uuid,
                    error = %e,
                    "Publicacion Pure omitida: no supero la validacion del modelo"
                );
                continue;
            }
        };

        // $set = campos mapeados + updated_at; $setOnInsert = solo de insercion.
        let mut set_doc = mongodb::bson::to_document(&model_to_dto(&model)).map_err(|e| {
            AppError::InternalError(format!("No se pudo serializar publicacion a BSON: {e}"))
        })?;
        set_doc.remove("_id");
        set_doc.remove("id_publicacion");
        set_doc.remove("created_at");
        set_doc.remove("activo");
        set_doc.remove("dominio_origen");
        set_doc.insert("updated_at", now_ms);

        let set_on_insert = doc! {
            "_id":            &new_id,
            "id_publicacion": &new_id,
            "created_at":     now_ms,
            "activo":         1i64,
            "dominio_origen": DOMINIO_ORIGEN_PURE,
        };

        let update = doc! {
            "$set":         set_doc,
            "$setOnInsert": set_on_insert,
        };

        let opts = UpdateOptions::builder().upsert(true).build();
        let filter = doc! { "pure_uuid": &pure_uuid };
        let result = col.update_one(filter, update).with_options(opts).await?;

        if result.upserted_id.is_some() {
            nuevas += 1;
        } else if result.modified_count > 0 {
            actualizadas += 1;
        }

        // En updates el id_publicacion original se conserva (no esta en $set).
        let id_publicacion = if result.upserted_id.is_some() {
            new_id.clone()
        } else {
            col.find_one(doc! { "pure_uuid": &pure_uuid })
                .await?
                .and_then(|d| d.get_str("id_publicacion").ok().map(String::from))
                .unwrap_or_else(|| new_id.clone())
        };

        sync_autores_pivot(db, &id_publicacion, &autores_json, &personas_by_nombre).await?;
    }

    Ok(SyncPublicacionesResult {
        persona_id: investigador_id.to_string(),
        scopus_author_id: scopus_author_id.to_string(),
        pure_person_uuid,
        total_encontradas,
        nuevas,
        actualizadas,
    })
}

/// Resultado de `sincronizar_pure_person_ids`.
#[derive(Debug)]
pub struct SyncPurePersonIdsResult {
    pub total_pure: usize,
    pub matched: usize,
    pub assigned: usize,
    pub unmatched_dnis: Vec<String>,
}

/// Sincroniza `investigador.pure_person_id` (PER000X) con la fuente
/// canonica Pure.
///
/// Itera `GET /persons`, extrae `PrimaryId` (PER000X) + DNI, matchea
/// investigadores por DNI y persiste `pure_person_id` con upsert. Solo
/// rellena el campo donde actualmente es `None` (no pisa valores previos
/// para evitar reasignaciones accidentales).
pub async fn sincronizar_pure_person_ids(
    state: &AppState,
) -> Result<SyncPurePersonIdsResult, AppError> {
    let db = state.mongo_db()?;

    let mappings =
        pure_client::fetch_all_persons_mapping(&state.tokens, &state.pure_config.api_base_url)
            .await?;
    let total_pure = mappings.len();

    let personas = personas_repo::load_all_map(db).await?;
    // Indice dni -> id_persona para resolver match.
    let mut dni_to_persona: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for p in personas.values() {
        let key = Dni::new(&p.dni).ok().map(|d| d.into_string());
        if let Some(key) = key {
            dni_to_persona.insert(key, p.id_persona.clone());
        }
    }

    // Investigadores activos para no asignar PersonID a desactivados.
    let investigadores = crate::investigadores::repository::get_all_investigadores(db).await?;
    let mut persona_to_investigador: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for inv in &investigadores {
        persona_to_investigador.insert(inv.persona_id.clone(), inv.id_investigador.clone());
    }

    let col = db.collection::<Document>("investigadores");
    let now_ms = time::now_ms();

    let mut matched = 0usize;
    let mut assigned = 0usize;
    let mut unmatched_dnis: Vec<String> = Vec::new();

    for mapping in mappings {
        let Some(dni) = mapping.dni.as_ref().filter(|s| !s.trim().is_empty()) else {
            continue;
        };
        let Some(id_persona) = dni_to_persona.get(dni) else {
            unmatched_dnis.push(dni.clone());
            continue;
        };
        matched += 1;

        let Some(id_investigador) = persona_to_investigador.get(id_persona) else {
            unmatched_dnis.push(dni.clone());
            continue;
        };

        // Solo asigna si el campo esta vacio: pisa un valor anterior podria
        // ser una eleccion del usuario que se quiere preservar.
        let existing = col
            .find_one(doc! { "id_investigador": id_investigador })
            .await?;
        let already_set = existing
            .as_ref()
            .and_then(|d| d.get_str("pure_person_id").ok())
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
        if already_set {
            continue;
        }

        col.update_one(
            doc! { "id_investigador": id_investigador },
            doc! {
                "$set": {
                    "pure_person_id": &mapping.pure_person_id,
                    "updated_at": now_ms,
                }
            },
        )
        .await?;
        assigned += 1;
    }

    Ok(SyncPurePersonIdsResult {
        total_pure,
        matched,
        assigned,
        unmatched_dnis,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::publicaciones::models::PublicacionCientifica;

    fn fp_base() -> pure_client::FetchedPublication {
        pure_client::FetchedPublication {
            pure_uuid: "pure-uuid-001".to_string(),
            titulo: "Quantum supremacy revisited".to_string(),
            tipo_publicacion: Some("journal article".to_string()),
            doi: Some("10.1038/nature.2024.001".to_string()),
            anio_publicacion: Some(2024),
            autores_json: "[\"Perez Gomez, Juan\",\"Rojas Diaz, Maria\"]".to_string(),
            estado_publicacion: Some("published".to_string()),
            journal_titulo: Some("Nature Physics".to_string()),
            issn: Some("1745-2481".to_string()),
        }
    }

    #[test]
    fn map_pure_tipo_mapea_terminos_conocidos() {
        assert_eq!(
            map_pure_tipo(Some("journal article")),
            PUBLICACION_TIPO_JOURNAL_ARTICLE
        );
        assert_eq!(
            map_pure_tipo(Some("conference paper")),
            PUBLICACION_TIPO_CONFERENCE_PAPER
        );
        assert_eq!(map_pure_tipo(Some("letter")), PUBLICACION_TIPO_LETTER);
        assert_eq!(map_pure_tipo(Some("review")), PUBLICACION_TIPO_REVIEW);
        assert_eq!(map_pure_tipo(Some("article")), PUBLICACION_TIPO_ARTICULO);
        assert_eq!(map_pure_tipo(Some("book")), PUBLICACION_TIPO_LIBRO);
        assert_eq!(
            map_pure_tipo(Some("book chapter")),
            PUBLICACION_TIPO_CAPITULO_LIBRO
        );
        assert_eq!(
            map_pure_tipo(Some("conference abstract")),
            PUBLICACION_TIPO_ARTICULO_CONFERENCIA
        );
        assert_eq!(map_pure_tipo(Some("editorial")), PUBLICACION_TIPO_CARTA);
        assert_eq!(map_pure_tipo(Some("book review")), PUBLICACION_TIPO_RESENA);
        assert_eq!(
            map_pure_tipo(Some("doctoral thesis")),
            PUBLICACION_TIPO_TESIS
        );
        assert_eq!(map_pure_tipo(Some("software")), PUBLICACION_TIPO_SOFTWARE);
    }

    #[test]
    fn map_pure_tipo_es_case_insensitive_y_default_articulo() {
        assert_eq!(
            map_pure_tipo(Some("Journal Article")),
            PUBLICACION_TIPO_JOURNAL_ARTICLE
        );
        assert_eq!(
            map_pure_tipo(Some("TERMINO_DESCONOCIDO")),
            PUBLICACION_TIPO_ARTICULO
        );
        assert_eq!(map_pure_tipo(None), PUBLICACION_TIPO_ARTICULO);
    }

    #[test]
    fn build_request_y_new_producen_modelo_pure() {
        let fp = fp_base();
        let request = build_request(fp);
        assert_eq!(request.dominio_origen.as_deref(), Some(DOMINIO_ORIGEN_PURE));
        assert_eq!(request.pure_uuid.as_deref(), Some("pure-uuid-001"));

        let model = PublicacionCientifica::new("p-1".to_string(), request).unwrap();
        assert_eq!(model.titulo, "Quantum supremacy revisited");
        assert_eq!(model.tipo, PUBLICACION_TIPO_JOURNAL_ARTICLE);
        assert_eq!(model.doi.as_deref(), Some("10.1038/nature.2024.001"));
        assert_eq!(model.anio, Some(2024));
        assert_eq!(model.revista_titulo.as_deref(), Some("Nature Physics"));
        assert_eq!(model.issn.as_deref(), Some("1745-2481"));
        assert_eq!(model.estado_publicacion.as_deref(), Some("published"));
        assert_eq!(model.dominio_origen, DOMINIO_ORIGEN_PURE);
        assert!(model.es_revisado_por_pares);
        assert_eq!(model.activo, 1);
    }

    #[test]
    fn normalize_autor_reordena_apellido_nombre() {
        assert_eq!(
            normalize_autor("Perez Gomez, Juan Carlos"),
            "juan carlos perez gomez"
        );
        assert_eq!(normalize_autor("  Rojas  ,  Maria "), "maria rojas");
        assert_eq!(normalize_autor("Juan Perez"), "juan perez");
        assert_eq!(normalize_autor(""), "");
    }
}
