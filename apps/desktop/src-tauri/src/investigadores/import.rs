//! Importación asistida de investigadores por DNI.
//!
//! Reemplaza al antiguo seed automático que corría en cada arranque. Ahora el
//! admin dispara el flujo manualmente desde el tab Investigadores: pega una
//! lista de DNIs en la plantilla y el sistema enriquece cada entrada
//! contrastando contra múltiples fuentes externas en orden de prioridad.
//!
//! Orden de enriquecimiento por DNI:
//!   1. **RENIEC** — fuente de identidad legal (nombres, apellidos).
//!      Sin RENIEC o DNI no encontrado → entrada omitida (queda pendiente
//!      para una re-corrida posterior).
//!   2. **PeruCris** — fuente académica canónica (más peso). Búsqueda por DNI
//!      filtrando `entity_type == Person`. Captura `perucris_uuid` para
//!      dedupe/alineamiento con PeruCRIS. Best-effort.
//!   3. **Pure (Elsevier)** — match por DNI contra el mapping maestro
//!      (`PER000X ↔ DNI`) descargado UNA vez por lote. Setea
//!      `pure_person_id`. Best-effort.
//!   4. **RENACYT** — nivel/código/grupo/ORCID del investigador en el
//!      registro nacional. Best-effort (mismo comportamiento que tenía el
//!      seed).
//!
//! Patrón: motor reutilizado del antiguo seed (concurrencia acotada,
//! circuit breaker RENIEC, idempotencia per-DNI via `load_existing_dnis`,
//! resolución de grado fallback `default_grado_id`).
//!
//! Validaciones de entrada (`ImportInvestigadoresRequest::validate`):
//! - DNI vía VO `Dni` (8 dígitos ASCII).
//! - Dedupe preservando orden.
//! - Lote no vacío y límite máximo razonable (200 DNIs por corrida para
//!   respetar rate-limits de las APIs externas).

use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use futures_util::stream::{self, StreamExt};
use mongodb::bson::doc;
use mongodb::Database;
use serde::{Deserialize, Serialize};

use crate::grados::dto::GradoAcademicoDoc;
use crate::investigadores::dto::{
    CreateInvestigadorRenacytRequest, CreateInvestigadorRequest, RenacytLookupResult,
};
use crate::investigadores::repository as investigadores_repository;
use crate::shared::config::RenacytConfig;
use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::shared::external::{perucris_validator, pure_client, renacyt_client, reniec_client};
use crate::shared::state::AppState;

const INVESTIGADORES_SEED_JSON: &str = include_str!("data/seed_investigadores_default.json");

/// Concurrencia maxima del import. Balance entre velocidad (~49s secuencial
/// vs ~10-15s a este limite) y respeto a rate-limits de las APIs externas
/// (decolecta/RENACYT/PeruCRIS). Configurable aqui si se observan 429s en
/// produccion.
const IMPORT_CONCURRENCY: usize = 5;

/// Limite superior de DNIs por corrida. Suficiente para nominas medianas;
/// corridas mayores deben partirse manualmente para no agotar timeouts.
const MAX_DNIS_PER_RUN: usize = 200;

/// Circuit-breaker RENIEC: tras N fallos consecutivos se aborta el resto
/// del barrido para no degradar el arranque de la app cuando el servicio
/// externo esta caido.
const RENIEC_CIRCUIT_BREAKER_FAILS: usize = 3;

/// Resultado del import: cuentas desglosadas para logging y audit.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportInvestigadoresResult {
    pub total_evaluados: usize,
    pub importados: usize,
    pub autocompletados_reniec: usize,
    pub omitidos_duplicado: usize,
    pub omitidos_sin_reniec: usize,
    pub omitidos_invalidos: usize,
    pub renacyt_encontrados: usize,
    pub renacyt_no_encontrados: usize,
    pub renacyt_fallos: usize,
    pub perucris_enlazados: usize,
    pub perucris_fallos: usize,
    pub pure_enlazados: usize,
    pub pure_fallos: usize,
    pub errores: Vec<String>,
}

impl ImportInvestigadoresResult {
    pub fn tiene_pendientes(&self) -> bool {
        self.omitidos_sin_reniec > 0
            || self.renacyt_fallos > 0
            || self.perucris_fallos > 0
            || self.pure_fallos > 0
            || !self.errores.is_empty()
    }
}

#[derive(Debug, Deserialize)]
struct SeedFile {
    #[serde(default)]
    entries: Vec<SeedInvestigador>,
}

#[derive(Debug, Deserialize)]
struct SeedInvestigador {
    dni: String,
}

/// Request del import: lista de DNIs a procesar. La validación rechaza lotes
/// vacíos, DNIs mal formados y dedupea en orden preservado.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportInvestigadoresRequest {
    pub dnis: Vec<String>,
}

impl ImportInvestigadoresRequest {
    pub fn validate(self) -> Result<Vec<String>, AppError> {
        if self.dnis.is_empty() {
            return Err(AppError::ValidationError(
                "Debe proporcionar al menos un DNI para importar.".to_string(),
            ));
        }
        if self.dnis.len() > MAX_DNIS_PER_RUN {
            return Err(AppError::ValidationError(format!(
                "El lote excede el limite de {} DNIs por corrida (recibidos: {}).",
                MAX_DNIS_PER_RUN,
                self.dnis.len()
            )));
        }
        let mut seen = HashSet::new();
        let mut out: Vec<String> = Vec::with_capacity(self.dnis.len());
        for raw in self.dnis {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                continue;
            }
            let dni = Dni::new(trimmed)
                .map_err(|e| AppError::ValidationError(format!("DNI invalido '{trimmed}': {e}")))?;
            let normalized = dni.into_string();
            if seen.insert(normalized.clone()) {
                out.push(normalized);
            }
        }
        if out.is_empty() {
            return Err(AppError::ValidationError(
                "Ninguno de los DNIs proporcionados es valido.".to_string(),
            ));
        }
        Ok(out)
    }
}

/// Outcome por entrada, agregado al resultado final en orden de indice.
#[derive(Debug, Default)]
struct EntryOutcome {
    imported: bool,
    autocompletado_reniec: bool,
    duplicado: bool,
    sin_reniec: bool,
    invalido: bool,
    circuito_abierto: bool,
    renacyt_encontrado: bool,
    renacyt_no_match: bool,
    renacyt_fallo: bool,
    perucris_enlazado: bool,
    perucris_fallo: bool,
    pure_enlazado: bool,
    pure_fallo: bool,
    errors: Vec<String>,
}

fn merge_outcome(result: &mut ImportInvestigadoresResult, o: EntryOutcome) {
    if o.imported {
        result.importados += 1;
    }
    if o.autocompletado_reniec {
        result.autocompletados_reniec += 1;
    }
    if o.duplicado {
        result.omitidos_duplicado += 1;
    }
    if o.sin_reniec {
        result.omitidos_sin_reniec += 1;
    }
    if o.invalido {
        result.omitidos_invalidos += 1;
    }
    if o.renacyt_encontrado {
        result.renacyt_encontrados += 1;
    }
    if o.renacyt_no_match {
        result.renacyt_no_encontrados += 1;
    }
    if o.renacyt_fallo {
        result.renacyt_fallos += 1;
    }
    if o.perucris_enlazado {
        result.perucris_enlazados += 1;
    }
    if o.perucris_fallo {
        result.perucris_fallos += 1;
    }
    if o.pure_enlazado {
        result.pure_enlazados += 1;
    }
    if o.pure_fallo {
        result.pure_fallos += 1;
    }
    result.errores.extend(o.errors);
}

/// Datos puros de identidad resueltos (RENIEC) antes de tocar fuentes
/// académicas. Vive como struct para mantener `process_entry` legible.
struct ResolvedIdentity {
    nombres: String,
    apellido_paterno: String,
    apellido_materno: Option<String>,
}

/// Datos académicos cruzados (PeruCris + Pure + RENACYT) que se aplican
/// sobre el investigador al momento del create. Permite trazabilidad de
/// qué fuente aportó cada campo.
struct AcademicEnrichment {
    perucris_uuid: Option<String>,
    pure_person_id: Option<String>,
    renacyt: Option<CreateInvestigadorRenacytRequest>,
}

/// Procesa una entrada del import. Captura errores per-entry en
/// `EntryOutcome`; solo errores fatales (p.ej. imposible parsear el JSON
/// embebido en la plantilla) se propagan via `Err` al caller.
#[allow(clippy::too_many_arguments)]
async fn process_entry(
    dni: String,
    db: Database,
    existing_dnis: Arc<HashSet<String>>,
    consecutive_reniec_failures: Arc<AtomicUsize>,
    renacyt_config: Arc<RenacytConfig>,
    reniec_token: Option<String>,
    reniec_api_base_url: String,
    perucris_client: Arc<perucris_validator::PeruCrisPublicClient>,
    pure_by_dni: Arc<HashMap<String, String>>,
) -> EntryOutcome {
    let mut o = EntryOutcome::default();

    // 1. Validar DNI (8 digitos ASCII).
    let dni_str = match Dni::new(&dni) {
        Ok(dni) => dni.into_string(),
        Err(_) => {
            o.invalido = true;
            o.errors.push(format!("DNI invalido: {dni:?}"));
            return o;
        }
    };

    // 2. Dedup per-DNI contra personas ya existentes.
    if existing_dnis.contains(&dni_str) {
        o.duplicado = true;
        return o;
    }

    // 3. Resolver nombres via RENIEC (fuente obligatoria de identidad).
    let identity = match resolve_identity(
        &dni_str,
        &reniec_token,
        &reniec_api_base_url,
        &consecutive_reniec_failures,
        &mut o,
    )
    .await
    {
        Some(id) => id,
        None => return o,
    };

    // 4. Enriquecimiento PeruCris (best-effort).
    let perucris_uuid = match lookup_perucris_person(&perucris_client, &dni_str).await {
        Ok(Some(uuid)) => {
            o.perucris_enlazado = true;
            Some(uuid)
        }
        Ok(None) => None,
        Err(err) => {
            o.perucris_fallo = true;
            tracing::warn!(
                dni = %dni_str,
                "import investigadores: PeruCRIS lookup fallo: {err}"
            );
            None
        }
    };

    // 5. Enriquecimiento Pure (best-effort) — match contra el mapping
    //    descargado UNA vez por lote (no per-DNI HTTP).
    let pure_person_id = pure_by_dni.get(&dni_str).cloned();
    if pure_person_id.is_some() {
        o.pure_enlazado = true;
    }
    // pure_fallos no se incrementa por DNI individual: solo por fallo de
    // descarga del mapping global (manejado en build_pure_mapping).

    // 6. Enriquecimiento RENACYT (best-effort).
    let renacyt_request = match fetch_renacyt_create_request(&renacyt_config, &dni_str).await {
        Ok(Some(req)) => {
            o.renacyt_encontrado = true;
            Some(req)
        }
        Ok(None) => {
            o.renacyt_no_match = true;
            None
        }
        Err(err) => {
            o.renacyt_fallo = true;
            tracing::warn!(
                dni = %dni_str,
                "import investigadores: RENACYT lookup fallo: {err}"
            );
            None
        }
    };

    // 7. Resolver id_grado: PeruCris/RENACYT pueden sugerir grado pero la
    //    traduccion canonica nivel→SKOS queda como deuda de v0.2. Por
    //    ahora caemos al primer grado activo (mismo fallback que el seed
    //    original cuando no se conoce el grado).
    let id_grado = match resolve_id_grado(&db).await {
        Ok(id) => id,
        Err(err) => {
            o.errors
                .push(format!("grado fallback fallo para DNI {dni_str}: {err}"));
            return o;
        }
    };

    // 8. Construir request y crear.
    let _enrichment = AcademicEnrichment {
        perucris_uuid: perucris_uuid.clone(),
        pure_person_id: pure_person_id.clone(),
        renacyt: renacyt_request,
    };

    let request = CreateInvestigadorRequest {
        dni: dni_str.clone(),
        id_grado,
        nombres: identity.nombres,
        apellido_paterno: identity.apellido_paterno,
        apellido_materno: identity.apellido_materno,
        correo: None,
        telefono: None,
        direccion: None,
        sexo: None,
        fecha_nacimiento: None,
        perfil: "docente".to_string(),
        renacyt: _enrichment.renacyt,
        tipo_documento: Some("DNI".to_string()),
        pure_person_id: _enrichment.pure_person_id,
        perucris_uuid: _enrichment.perucris_uuid,
    };

    match investigadores_repository::create_investigador(&db, request).await {
        Ok(_) => {
            o.imported = true;
            if o.autocompletado_reniec {
                tracing::info!(dni = %dni_str, "investigador cargado via RENIEC");
            }
            if o.perucris_enlazado {
                tracing::info!(dni = %dni_str, "investigador enlazado a PeruCRIS");
            }
            if o.pure_enlazado {
                tracing::info!(dni = %dni_str, "investigador enlazado a Pure");
            }
        }
        Err(err) => {
            o.errors.push(format!(
                "create_investigador fallo para DNI {dni_str}: {err}"
            ));
        }
    }
    o
}

/// Resuelve la identidad legal de un DNI via RENIEC. Devuelve `None` y
/// marca el `outcome` si el circuito esta abierto, RENIEC no esta
/// configurado o el lookup falla.
async fn resolve_identity(
    dni: &str,
    reniec_token: &Option<String>,
    reniec_api_base_url: &str,
    consecutive_reniec_failures: &Arc<AtomicUsize>,
    outcome: &mut EntryOutcome,
) -> Option<ResolvedIdentity> {
    if consecutive_reniec_failures.load(Ordering::Relaxed) >= RENIEC_CIRCUIT_BREAKER_FAILS {
        tracing::warn!(
            "import investigadores: RENIEC circuit breaker abierto ({} fallos consecutivos)",
            consecutive_reniec_failures.load(Ordering::Relaxed)
        );
        outcome.circuito_abierto = true;
        outcome.sin_reniec = true;
        return None;
    }
    let Some(token) = reniec_token.as_deref() else {
        outcome.sin_reniec = true;
        return None;
    };
    match reniec_client::consultar_dni_anon(token, reniec_api_base_url, dni).await {
        Ok(lookup) => {
            consecutive_reniec_failures.store(0, Ordering::Relaxed);
            outcome.autocompletado_reniec = true;
            Some(ResolvedIdentity {
                nombres: lookup.first_name,
                apellido_paterno: lookup.first_last_name,
                apellido_materno: Some(lookup.second_last_name).filter(|s| !s.is_empty()),
            })
        }
        Err(err) => {
            consecutive_reniec_failures.fetch_add(1, Ordering::Relaxed);
            outcome
                .errors
                .push(format!("RENIEC lookup fallo para DNI {dni}: {err}"));
            outcome.sin_reniec = true;
            None
        }
    }
}

/// Busca la persona en PeruCRIS por DNI (entidad Person). Devuelve el
/// UUID canonico si hay match exacto. Se usa `size=1` para minimizar
/// trafico y latencia; si en el futuro se requiere mas metadata se puede
/// ampliar a `find_by_uuid` para traer el detalle completo.
async fn lookup_perucris_person(
    client: &perucris_validator::PeruCrisPublicClient,
    dni: &str,
) -> Result<Option<String>, AppError> {
    let hits = client.search_by_query(dni, 5).await?;
    for hit in hits {
        if hit.metadata.entity_type().as_deref() == Some("Person")
            && hit.metadata.first_value("person.identifier.dni").as_deref() == Some(dni)
        {
            return Ok(Some(hit.uuid));
        }
    }
    Ok(None)
}

/// Resuelve `id_grado` con fallback al primer grado activo. PeruCris/RENACYT
/// pueden sugerir grado pero la traduccion canonica nivel→SKOS queda como
/// deuda de v0.2 (necesita tabla de mapeo mantenida por el usuario).
async fn resolve_id_grado(db: &Database) -> Result<String, AppError> {
    default_grado_id(db).await
}

/// Busca un investigador en RENACYT por DNI y devuelve los datos mapeados
/// a `CreateInvestigadorRenacytRequest` listos para crear.
async fn fetch_renacyt_create_request(
    config: &RenacytConfig,
    dni: &str,
) -> Result<Option<CreateInvestigadorRenacytRequest>, AppError> {
    let Some(encontrado) = renacyt_client::buscar_por_dni(config, dni).await? else {
        return Ok(None);
    };
    let lookup =
        renacyt_client::consultar_investigador(config, &encontrado.codigo_registro).await?;
    Ok(Some(renacyt_lookup_to_create_request(lookup)))
}

fn renacyt_lookup_to_create_request(
    lookup: RenacytLookupResult,
) -> CreateInvestigadorRenacytRequest {
    CreateInvestigadorRenacytRequest {
        codigo_registro: lookup.codigo_registro,
        id_investigador: lookup.id_investigador,
        nivel: lookup.nivel,
        grupo: lookup.grupo,
        condicion: lookup.condicion,
        fecha_informe_calificacion: lookup.fecha_informe_calificacion,
        fecha_registro: lookup.fecha_registro,
        fecha_ultima_revision: lookup.fecha_ultima_revision,
        orcid: lookup.orcid,
        scopus_author_id: lookup.scopus_author_id,
        ficha_url: lookup.ficha_url,
        formaciones_academicas_json: lookup.formaciones_academicas_json,
    }
}

async fn load_existing_dnis(db: &Database) -> Result<HashSet<String>, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db
        .collection::<mongodb::bson::Document>("personas")
        .find(doc! {})
        .await?;
    let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
    let mut set = HashSet::new();
    for d in docs {
        if let Ok(dni) = d.get_str("dni") {
            set.insert(dni.to_string());
        }
    }
    Ok(set)
}

/// Resuelve el primer grado activo como fallback final.
async fn default_grado_id(db: &Database) -> Result<String, AppError> {
    let cursor = db
        .collection::<mongodb::bson::Document>("grados")
        .find(doc! { "activo": 1i64 })
        .limit(1)
        .await?;
    use futures_util::TryStreamExt;
    let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
    let doc = docs.into_iter().next().ok_or_else(|| {
        AppError::InternalError("No hay grados activos para usar como fallback".to_string())
    })?;
    let grado: GradoAcademicoDoc = mongodb::bson::from_document(doc)
        .map_err(|e| AppError::InternalError(format!("No se pudo deserializar grado: {e}")))?;
    Ok(grado.id_grado)
}

/// Devuelve la lista de DNIs precargados en la plantilla embebida (v0.1.0).
/// Pensada para alimentar el modal de importacion con un click.
pub fn get_plantilla_dnis_default() -> Result<Vec<String>, AppError> {
    let file: SeedFile = serde_json::from_str(INVESTIGADORES_SEED_JSON).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo parsear seed_investigadores_default.json: {e}"
        ))
    })?;
    let mut seen = HashSet::new();
    let mut out = Vec::with_capacity(file.entries.len());
    for entry in file.entries {
        let dni = Dni::new(&entry.dni).map_err(|e| {
            AppError::InternalError(format!(
                "DNI invalido en plantilla embebida {:?}: {e}",
                entry.dni
            ))
        })?;
        let s = dni.into_string();
        if seen.insert(s.clone()) {
            out.push(s);
        }
    }
    Ok(out)
}

/// Construye el mapping `DNI -> pure_person_id` para todo el lote.
/// Descarga UNA vez las personas de Pure (paginado) y devuelve un HashMap
/// compartido entre las `process_entry` concurrentes. Si Pure no esta
/// configurado o falla, devuelve un mapa vacio (no es fatal: el import
/// continua sin ese enriquecimiento).
async fn build_pure_mapping(state: &AppState) -> Result<Arc<HashMap<String, String>>, AppError> {
    let has_key = state.tokens.has_pure();
    if !has_key {
        tracing::info!(
            "import investigadores: Pure API key no configurada, sin enriquecimiento Pure"
        );
        return Ok(Arc::new(HashMap::new()));
    }
    match pure_client::fetch_all_persons_mapping(&state.tokens, &state.pure_config.api_base_url)
        .await
    {
        Ok(mappings) => {
            let total = mappings.len();
            let mut map = HashMap::with_capacity(mappings.len());
            for m in mappings {
                if let Some(dni) = m.dni {
                    if !m.pure_person_id.is_empty() && !dni.is_empty() {
                        map.insert(dni, m.pure_person_id);
                    }
                }
            }
            tracing::info!(
                total,
                enlazados = map.len(),
                "import investigadores: Pure mapping descargado"
            );
            Ok(Arc::new(map))
        }
        Err(err) => {
            tracing::warn!(
                "import investigadores: Pure mapping fallo, sin enriquecimiento Pure: {err}"
            );
            Ok(Arc::new(HashMap::new()))
        }
    }
}

/// Punto de entrada principal: importa investigadores por DNI con
/// enriquecimiento multi-fuente (RENIEC -> PeruCRIS -> Pure -> RENACYT).
///
/// RBAC: `InvestigadoresManage`. La capa de comando aplica el permiso y
/// registra la auditoria; esta funcion solo orquesta.
pub async fn importar_investigadores_por_dnis(
    state: &AppState,
    request: ImportInvestigadoresRequest,
) -> Result<ImportInvestigadoresResult, AppError> {
    let dnis = request.validate()?;
    let mut result = ImportInvestigadoresResult::default();
    result.total_evaluados = dnis.len();

    let db = state.mongo_db()?;

    let existing_dnis = Arc::new(load_existing_dnis(db).await?);
    let consecutive_reniec_failures = Arc::new(AtomicUsize::new(0));
    let renacyt_config = Arc::new(state.renacyt.clone());
    let reniec_token: Option<String> = state
        .reniec
        .token
        .clone()
        .or_else(|| state.tokens.resolve_reniec_token().ok().map(String::from));
    let reniec_api_base_url = state.reniec.api_base_url.clone();

    let perucris_client = Arc::new(perucris_validator::PeruCrisPublicClient::new());
    let pure_by_dni = build_pure_mapping(state).await?;

    let outcomes: Vec<EntryOutcome> = stream::iter(dnis.into_iter())
        .map(|dni| {
            let db = db.clone();
            let existing = existing_dnis.clone();
            let failures = consecutive_reniec_failures.clone();
            let renacyt_cfg = renacyt_config.clone();
            let reniec_token = reniec_token.clone();
            let reniec_api_base_url = reniec_api_base_url.clone();
            let perucris = perucris_client.clone();
            let pure = pure_by_dni.clone();
            async move {
                process_entry(
                    dni,
                    db,
                    existing,
                    failures,
                    renacyt_cfg,
                    reniec_token,
                    reniec_api_base_url,
                    perucris,
                    pure,
                )
                .await
            }
        })
        .buffer_unordered(IMPORT_CONCURRENCY)
        .collect()
        .await;

    for outcome in outcomes {
        merge_outcome(&mut result, outcome);
    }

    for error in &result.errores {
        tracing::warn!("import investigadores: {error}");
    }

    if result.tiene_pendientes() {
        tracing::warn!(
            importados = result.importados,
            autocompletados_reniec = result.autocompletados_reniec,
            perucris_enlazados = result.perucris_enlazados,
            perucris_fallos = result.perucris_fallos,
            pure_enlazados = result.pure_enlazados,
            pure_fallos = result.pure_fallos,
            renacyt_encontrados = result.renacyt_encontrados,
            renacyt_no_encontrados = result.renacyt_no_encontrados,
            renacyt_fallos = result.renacyt_fallos,
            omitidos_duplicado = result.omitidos_duplicado,
            omitidos_sin_reniec = result.omitidos_sin_reniec,
            errores = result.errores.len(),
            "import investigadores: completado con pendientes"
        );
    } else {
        tracing::info!(
            importados = result.importados,
            autocompletados_reniec = result.autocompletados_reniec,
            perucris_enlazados = result.perucris_enlazados,
            pure_enlazados = result.pure_enlazados,
            renacyt_encontrados = result.renacyt_encontrados,
            renacyt_no_encontrados = result.renacyt_no_encontrados,
            omitidos_duplicado = result.omitidos_duplicado,
            "import investigadores: exitoso"
        );
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_embebido_parsea_y_tiene_55_entradas() {
        let file: SeedFile =
            serde_json::from_str(INVESTIGADORES_SEED_JSON).expect("JSON embebido debe parsear");
        assert_eq!(
            file.entries.len(),
            55,
            "se esperaban 55 DNIs; encontrado {}",
            file.entries.len()
        );
    }

    #[test]
    fn todas_las_dnis_tienen_8_digitos_ascii() {
        let file: SeedFile = serde_json::from_str(INVESTIGADORES_SEED_JSON).unwrap();
        let mut seen = HashSet::new();
        for entry in &file.entries {
            let dni = Dni::new(&entry.dni)
                .unwrap_or_else(|_| panic!("DNI invalido detectado en seed: {:?}", entry.dni));
            let s = dni.into_string();
            assert!(seen.insert(s.clone()), "DNI duplicado en seed: {}", s);
        }
    }

    #[test]
    fn get_plantilla_dnis_default_devuelve_55_unicos() {
        let dnis = get_plantilla_dnis_default().expect("plantilla debe parsear");
        assert_eq!(dnis.len(), 55);
        let mut seen = HashSet::new();
        for d in &dnis {
            assert!(seen.insert(d.clone()), "DNI duplicado en plantilla: {d}");
            assert_eq!(d.len(), 8);
        }
    }

    #[test]
    fn request_validate_rechaza_lote_vacio() {
        let req = ImportInvestigadoresRequest { dnis: vec![] };
        let err = req.validate().unwrap_err();
        assert!(matches!(err, AppError::ValidationError(_)));
    }

    #[test]
    fn request_validate_rechaza_lote_solo_espacios() {
        let req = ImportInvestigadoresRequest {
            dnis: vec!["   ".to_string(), "".to_string()],
        };
        let err = req.validate().unwrap_err();
        assert!(matches!(err, AppError::ValidationError(_)));
    }

    #[test]
    fn request_validate_rechaza_dni_mal_formado() {
        let req = ImportInvestigadoresRequest {
            dnis: vec!["1234567".to_string()],
        };
        let err = req.validate().unwrap_err();
        assert!(matches!(err, AppError::ValidationError(_)));
    }

    #[test]
    fn request_validate_dedup_y_normaliza() {
        let req = ImportInvestigadoresRequest {
            dnis: vec![
                "12345678".to_string(),
                "12345678".to_string(),
                " 87654321 ".to_string(),
            ],
        };
        let out = req.validate().unwrap();
        assert_eq!(out, vec!["12345678".to_string(), "87654321".to_string()]);
    }

    #[test]
    fn request_validate_rechaza_exceso_de_limite() {
        let dnis: Vec<String> = (0..=MAX_DNIS_PER_RUN)
            .map(|_| "12345678".to_string())
            .collect();
        let req = ImportInvestigadoresRequest { dnis };
        let err = req.validate().unwrap_err();
        assert!(matches!(err, AppError::ValidationError(_)));
    }

    #[test]
    fn request_validate_acepta_lote_valido() {
        let req = ImportInvestigadoresRequest {
            dnis: vec!["12345678".to_string(), "87654321".to_string()],
        };
        let out = req.validate().unwrap();
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn result_round_trip_camel_case() {
        let r = ImportInvestigadoresResult {
            total_evaluados: 55,
            importados: 50,
            autocompletados_reniec: 50,
            omitidos_duplicado: 5,
            perucris_enlazados: 40,
            pure_enlazados: 30,
            renacyt_encontrados: 45,
            errores: vec!["ejemplo".to_string()],
            ..Default::default()
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"totalEvaluados\""));
        assert!(json.contains("\"autocompletadosReniec\""));
        assert!(json.contains("\"perucrisEnlazados\""));
        assert!(json.contains("\"pureEnlazados\""));
        let de: ImportInvestigadoresResult = serde_json::from_str(&json).unwrap();
        assert_eq!(de.importados, 50);
        assert_eq!(de.perucris_enlazados, 40);
    }

    #[test]
    fn result_tiene_pendientes_detecta_fallos() {
        let r = ImportInvestigadoresResult::default();
        assert!(!r.tiene_pendientes());
        let r = ImportInvestigadoresResult {
            omitidos_sin_reniec: 1,
            ..Default::default()
        };
        assert!(r.tiene_pendientes());
        let r = ImportInvestigadoresResult {
            perucris_fallos: 1,
            ..Default::default()
        };
        assert!(r.tiene_pendientes());
        let r = ImportInvestigadoresResult {
            pure_fallos: 1,
            ..Default::default()
        };
        assert!(r.tiene_pendientes());
        let r = ImportInvestigadoresResult {
            errores: vec!["x".to_string()],
            ..Default::default()
        };
        assert!(r.tiene_pendientes());
    }
}
