/// Cliente HTTP para la API REST de Pure (Elsevier).
///
/// Autenticación: header `api-key` con clave configurada en `PJVPIN_PURE_API_KEY`.
/// Endpoint principal: POST /research-outputs/search (paginado por size/offset).
/// Endpoint de personas: POST /persons/search (resolución de UUID de persona por Scopus Author ID).
use serde::{Deserialize, Serialize};

use crate::shared::error::{sanitize_external_detail, AppError};

// ─── DTOs defensivos de Pure API ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PurePagedResult<T> {
    #[serde(default)]
    pub count: usize,
    #[serde(default)]
    pub items: Vec<T>,
}

/// Representación mínima de un ResearchOutput devuelto por Pure.
#[derive(Debug, Deserialize, Default)]
pub struct PureResearchOutput {
    #[serde(default)]
    pub uuid: String,
    #[serde(default)]
    pub title: Option<PureLocalizedValue>,
    #[serde(rename = "type", default)]
    pub tipo: Option<PureClassifiedValue>,
    #[serde(default)]
    pub contributors: Vec<PureContributor>,
    #[serde(rename = "electronicVersions", default)]
    pub electronic_versions: Vec<PureElectronicVersion>,
    #[serde(rename = "publicationStatuses", default)]
    pub publication_statuses: Vec<PurePublicationStatus>,
    #[serde(rename = "journalAssociation", default)]
    pub journal_association: Option<PureJournalAssociation>,
}

#[derive(Debug, Deserialize)]
pub struct PureLocalizedValue {
    #[serde(default)]
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct PureClassifiedValue {
    #[serde(default)]
    pub term: Option<PureLocalizedValue>,
}

#[derive(Debug, Deserialize)]
pub struct PureContributor {
    #[serde(default)]
    pub name: Option<PurePersonName>,
}

#[derive(Debug, Deserialize)]
pub struct PurePersonName {
    #[serde(rename = "lastName", default)]
    pub last_name: String,
    #[serde(rename = "firstName", default)]
    pub first_name: String,
}

#[derive(Debug, Deserialize)]
pub struct PureElectronicVersion {
    #[serde(default)]
    pub doi: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PurePublicationStatus {
    #[serde(default)]
    pub current: bool,
    #[serde(rename = "publicationDate", default)]
    pub publication_date: Option<PurePublicationDate>,
    #[serde(rename = "publicationStatuses", default)]
    pub statuses: Vec<PureClassifiedValue>,
}

#[derive(Debug, Deserialize)]
pub struct PurePublicationDate {
    pub year: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PureJournalAssociation {
    #[serde(default)]
    pub title: Option<PureLocalizedValue>,
    #[serde(default)]
    pub issn: Option<PureIssnValue>,
}

#[derive(Debug, Deserialize)]
pub struct PureIssnValue {
    #[serde(default)]
    pub value: String,
}

/// Persona en Pure (para resolución de UUID a partir de Scopus Author ID).
#[derive(Debug, Deserialize, Default)]
pub struct PurePerson {
    #[serde(default)]
    pub uuid: String,
}

/// Identifier de Pure expuesto por `/persons` (`identifiers`).
///
/// Pure distingue entre:
/// - `PrimaryId` con `value: "PER000X"` (PersonID del master list).
/// - `ClassifiedId` con `type.uri` que termina en `/personsources/<fuente>`
///   (DNI, Scopus Author ID, Employee ID).
#[derive(Debug, Deserialize, Default)]
pub struct PureIdentifier {
    #[serde(rename = "typeDiscriminator", default)]
    pub type_discriminator: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub r#type: Option<PureIdentifierType>,
}

#[derive(Debug, Deserialize, Default)]
pub struct PureIdentifierType {
    #[serde(default)]
    pub uri: String,
}

/// Persona completa de `/persons` con sus `identifiers`. Usada para
/// sincronizar el mapeo `PER000X <-> DNI` con la BD local.
#[derive(Debug, Deserialize, Default)]
pub struct PurePersonDetail {
    #[serde(default)]
    pub identifiers: Vec<PureIdentifier>,
}

/// Par normalizado (person_id, dni) extraido de `PurePersonDetail.identifiers`.
#[derive(Debug, Clone, Default)]
pub struct PurePersonMapping {
    pub pure_person_id: String,
    pub dni: Option<String>,
}

impl PurePersonDetail {
    /// Extrae `(PrimaryId.value, ClassifiedId.uri ending /dni)`.
    pub fn mapping(&self) -> PurePersonMapping {
        let mut out = PurePersonMapping::default();
        for ident in &self.identifiers {
            match ident.type_discriminator.as_str() {
                "PrimaryId" if out.pure_person_id.is_empty() => {
                    out.pure_person_id = ident.value.clone();
                }
                "ClassifiedId" => {
                    if let Some(t) = &ident.r#type {
                        if t.uri.ends_with("/dni") && out.dni.is_none() {
                            out.dni = Some(ident.id.clone());
                        }
                    }
                }
                _ => {}
            }
        }
        out
    }
}

// ─── Request bodies ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct ResearchOutputsQuery<'a> {
    pub size: usize,
    pub offset: usize,
    #[serde(rename = "searchString")]
    pub search_string: &'a str,
}

#[derive(Debug, Serialize)]
struct PersonsQuery<'a> {
    pub size: usize,
    pub offset: usize,
    #[serde(rename = "searchString")]
    pub search_string: &'a str,
}

// ─── Resultado procesado ─────────────────────────────────────────────────────

pub struct FetchedPublication {
    pub pure_uuid: String,
    pub titulo: String,
    pub tipo_publicacion: Option<String>,
    pub doi: Option<String>,
    pub anio_publicacion: Option<i32>,
    pub autores_json: String,
    pub estado_publicacion: Option<String>,
    pub journal_titulo: Option<String>,
    pub issn: Option<String>,
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

/// Resuelve el UUID de Pure de una persona a partir de su Scopus Author ID.
/// Devuelve `None` si la persona no se encuentra, o un error si falla la red.
pub async fn resolve_person_uuid(
    tokens: &crate::shared::tokens::TokenResolver,
    api_base_url: &str,
    scopus_author_id: &str,
) -> Result<Option<String>, AppError> {
    let api_key = tokens.resolve_pure_api_key()?;

    let url = format!("{}/persons/search", api_base_url.trim_end_matches('/'));

    let body = PersonsQuery {
        size: 5,
        offset: 0,
        search_string: scopus_author_id,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("api-key", api_key)
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            AppError::InternalError(format!(
                "Pure /persons/search falló: {}",
                sanitize_external_detail(&e.to_string())
            ))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let text: String = response.text().await.unwrap_or_default();
        let safe_text = sanitize_external_detail(&text);
        if status.as_u16() == 403 {
            return Err(AppError::ConfigurationError(
                "La API key de Pure no tiene permiso para acceder a /persons. \
                El administrador de Pure debe habilitar el rol 'Persons' para esta API key."
                    .to_string(),
            ));
        }
        return Err(AppError::InternalError(format!(
            "Pure /persons/search respondió con error {}: {}",
            status, safe_text
        )));
    }

    let result: PurePagedResult<PurePerson> = response.json().await.map_err(|e| {
        AppError::InternalError(format!(
            "Pure /persons/search: respuesta JSON inválida: {}",
            e
        ))
    })?;

    Ok(result.items.into_iter().next().map(|p| p.uuid))
}

/// Descarga todas las publicaciones asociadas a un Scopus Author ID desde Pure.
/// Utiliza paginación interna (size=50) y devuelve la lista completa.
pub async fn fetch_research_outputs_by_scopus_id(
    tokens: &crate::shared::tokens::TokenResolver,
    api_base_url: &str,
    scopus_author_id: &str,
) -> Result<Vec<FetchedPublication>, AppError> {
    let api_key = tokens.resolve_pure_api_key()?;

    let url = format!(
        "{}/research-outputs/search",
        api_base_url.trim_end_matches('/')
    );

    let client = reqwest::Client::new();
    let page_size = 50usize;
    let mut offset = 0usize;
    let mut all: Vec<FetchedPublication> = Vec::new();

    loop {
        let body = ResearchOutputsQuery {
            size: page_size,
            offset,
            search_string: scopus_author_id,
        };

        let response = client
            .post(&url)
            .header("api-key", api_key)
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                AppError::InternalError(format!(
                    "Pure /research-outputs/search falló: {}",
                    sanitize_external_detail(&e.to_string())
                ))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text: String = response.text().await.unwrap_or_default();
            let safe_text = sanitize_external_detail(&text);
            if status.as_u16() == 403 {
                return Err(AppError::ConfigurationError(
                    "La API key de Pure no tiene permiso para acceder a /research-outputs. \
                    El administrador del servidor Pure debe habilitar el rol 'Research outputs' \
                    para la API key configurada en PJVPIN_PURE_API_KEY."
                        .to_string(),
                ));
            }
            return Err(AppError::InternalError(format!(
                "Pure /research-outputs/search respondió con error {}: {}",
                status, safe_text
            )));
        }

        let page: PurePagedResult<PureResearchOutput> = response.json().await.map_err(|e| {
            AppError::InternalError(format!(
                "Pure /research-outputs/search: respuesta JSON inválida: {}",
                e
            ))
        })?;

        let total = page.count;
        let items_len = page.items.len();

        for item in page.items {
            if item.uuid.is_empty() {
                continue;
            }
            all.push(map_research_output(item));
        }

        offset += items_len;
        if items_len == 0 || offset >= total {
            break;
        }
    }

    Ok(all)
}

/// Descarga todas las personas de Pure (pagina `GET /persons?size=N&offset=M`)
/// y devuelve un mapeo `(PersonID del Master List, DNI)` por persona.
///
/// Usado por `sincronizar_pure_person_ids` para reconciliar el campo
/// `investigador.pure_person_id` con la fuente canónica (Pure).
pub async fn fetch_all_persons_mapping(
    tokens: &crate::shared::tokens::TokenResolver,
    api_base_url: &str,
) -> Result<Vec<PurePersonMapping>, AppError> {
    let api_key = tokens.resolve_pure_api_key()?;

    let base = format!("{}/persons", api_base_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let page_size = 100usize;
    let mut offset = 0usize;
    let mut all: Vec<PurePersonMapping> = Vec::new();

    loop {
        let url = format!("{base}?size={page_size}&offset={offset}");
        let response = client
            .get(&url)
            .header("api-key", api_key)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| {
                AppError::InternalError(format!(
                    "Pure /persons falló: {}",
                    sanitize_external_detail(&e.to_string())
                ))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let text: String = response.text().await.unwrap_or_default();
            let safe_text = sanitize_external_detail(&text);
            if status.as_u16() == 403 {
                return Err(AppError::ConfigurationError(
                    "La API key de Pure no tiene permiso para acceder a /persons. \
                    El administrador del servidor Pure debe habilitar el rol 'Persons' \
                    para la API key configurada en PJVPIN_PURE_API_KEY."
                        .to_string(),
                ));
            }
            return Err(AppError::InternalError(format!(
                "Pure /persons respondió con error {status}: {safe_text}"
            )));
        }

        let page: PurePagedResult<PurePersonDetail> = response.json().await.map_err(|e| {
            AppError::InternalError(format!("Pure /persons: respuesta JSON inválida: {e}"))
        })?;

        let total = page.count;
        let items_len = page.items.len();
        for item in page.items {
            let m = item.mapping();
            if m.pure_person_id.is_empty() {
                continue;
            }
            all.push(m);
        }

        offset += items_len;
        if items_len == 0 || offset >= total {
            break;
        }
    }

    Ok(all)
}

fn map_research_output(item: PureResearchOutput) -> FetchedPublication {
    let titulo = item
        .title
        .as_ref()
        .map(|t| t.value.clone())
        .unwrap_or_default();

    let tipo_publicacion = item
        .tipo
        .as_ref()
        .and_then(|t| t.term.as_ref())
        .map(|t| t.value.clone());

    // DOI: primer electronicVersion que lo traiga
    let doi = item
        .electronic_versions
        .iter()
        .find_map(|ev| ev.doi.clone());

    // Año: de la publicationStatus current
    let anio_publicacion = item
        .publication_statuses
        .iter()
        .find(|s| s.current)
        .and_then(|s| s.publication_date.as_ref())
        .and_then(|d| d.year);

    // Estado: término del publicationStatus current
    let estado_publicacion = item
        .publication_statuses
        .iter()
        .find(|s| s.current)
        .and_then(|s| s.statuses.first())
        .and_then(|sv| sv.term.as_ref())
        .map(|t| t.value.clone());

    // Autores: array JSON de "Apellido, Nombre"
    let autores: Vec<String> = item
        .contributors
        .iter()
        .filter_map(|c| c.name.as_ref())
        .map(|n| {
            if n.first_name.is_empty() {
                n.last_name.clone()
            } else {
                format!("{}, {}", n.last_name, n.first_name)
            }
        })
        .collect();
    let autores_json = serde_json::to_string(&autores).unwrap_or_else(|_| "[]".to_string());

    // Journal
    let journal_titulo = item
        .journal_association
        .as_ref()
        .and_then(|j| j.title.as_ref())
        .map(|t| t.value.clone());
    let issn = item
        .journal_association
        .as_ref()
        .and_then(|j| j.issn.as_ref())
        .map(|i| i.value.clone());

    FetchedPublication {
        pure_uuid: item.uuid,
        titulo,
        tipo_publicacion,
        doi,
        anio_publicacion,
        autores_json,
        estado_publicacion,
        journal_titulo,
        issn,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn person_with_primary_dni_scopus() -> PurePersonDetail {
        PurePersonDetail {
            identifiers: vec![
                PureIdentifier {
                    type_discriminator: "PrimaryId".to_string(),
                    value: "PER0028".to_string(),
                    id: "".to_string(),
                    r#type: None,
                },
                PureIdentifier {
                    type_discriminator: "ClassifiedId".to_string(),
                    value: "".to_string(),
                    id: "57220186512".to_string(),
                    r#type: Some(PureIdentifierType {
                        uri: "/dk/atira/pure/person/personsources/scopusauthor".to_string(),
                    }),
                },
                PureIdentifier {
                    type_discriminator: "ClassifiedId".to_string(),
                    value: "".to_string(),
                    id: "02857417".to_string(),
                    r#type: Some(PureIdentifierType {
                        uri: "/dk/atira/pure/person/personsources/dni".to_string(),
                    }),
                },
            ],
        }
    }

    #[test]
    fn mapping_extrae_primary_y_dni() {
        let m = person_with_primary_dni_scopus().mapping();
        assert_eq!(m.pure_person_id, "PER0028");
        assert_eq!(m.dni.as_deref(), Some("02857417"));
    }

    #[test]
    fn mapping_sin_dni_es_valido_con_dni_none() {
        let p = PurePersonDetail {
            identifiers: vec![PureIdentifier {
                type_discriminator: "PrimaryId".to_string(),
                value: "PER0099".to_string(),
                id: "".to_string(),
                r#type: None,
            }],
        };
        let m = p.mapping();
        assert_eq!(m.pure_person_id, "PER0099");
        assert!(m.dni.is_none());
    }

    #[test]
    fn mapping_vacio_devuelve_pure_person_id_vacio() {
        let p = PurePersonDetail::default();
        let m = p.mapping();
        assert!(m.pure_person_id.is_empty());
        assert!(m.dni.is_none());
    }
}
