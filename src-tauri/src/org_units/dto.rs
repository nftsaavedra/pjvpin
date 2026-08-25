//! DTOs de la feature `org_units`.
//!
//! - `OrgUnitDoc` (BSON) y `OrgUnitDto` (IPC salida) usan snake_case.
//! - `CreateOrgUnitRequest` / `UpdateOrgUnitRequest` (IPC entrada) usan
//!   camelCase para casar con el frontend TS.

use serde::{Deserialize, Serialize};

/// Longitud maxima razonable para descripcion institucional.
const MAX_DESCRIPCION_LEN: usize = 4_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgUnitDoc {
    pub id_org_unit: String,
    pub nombre: String,
    #[serde(default)]
    pub ubigeo_codigo: Option<String>,
    #[serde(default)]
    pub ruc: Option<String>,
    #[serde(default)]
    pub ror_id: Option<String>,
    #[serde(default)]
    pub isni_id: Option<String>,
    #[serde(default)]
    pub scopus_id: Option<String>,
    #[serde(default)]
    pub sector_institucional: Option<String>,
    pub tipo_organizacion: String,
    #[serde(default)]
    pub tipo_dependencia: Option<String>,
    #[serde(default)]
    pub tipo_educacion_superior: Option<String>,
    #[serde(default)]
    pub ciiu_codigo: Option<String>,
    pub es_publica: bool,
    #[serde(default)]
    pub parent_id: Option<String>,
    pub activo: i64,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    // ---- N2-G: alineamiento PeruCRIS ----
    #[serde(default)]
    pub legal_name: Option<String>,
    #[serde(default)]
    pub acronimo: Option<String>,
    #[serde(default)]
    pub web_site: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default, deserialize_with = "deserialize_descripcion_truncada")]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub rin_id: Option<String>,
    #[serde(default)]
    pub sunedu_clasificacion: Option<String>,
    #[serde(default)]
    pub sunedu_estado: Option<String>,
    #[serde(default)]
    pub sunedu_resolucion: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
    #[serde(default)]
    pub perucris_handle: Option<String>,
}

/// Limita la deserializacion de `descripcion` para evitar payloads
/// patologicos en BSON.
fn deserialize_descripcion_truncada<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(opt.map(|s| {
        let trimmed = s.trim();
        if trimmed.chars().count() > MAX_DESCRIPCION_LEN {
            trimmed.chars().take(MAX_DESCRIPCION_LEN).collect()
        } else {
            trimmed.to_string()
        }
    }))
}

#[derive(Debug, Clone, Serialize)]
pub struct OrgUnitDto {
    pub id_org_unit: String,
    pub nombre: String,
    pub ubigeo_codigo: Option<String>,
    pub ruc: Option<String>,
    pub ror_id: Option<String>,
    pub isni_id: Option<String>,
    pub scopus_id: Option<String>,
    pub sector_institucional: Option<String>,
    pub tipo_organizacion: String,
    pub tipo_dependencia: Option<String>,
    pub tipo_educacion_superior: Option<String>,
    pub ciiu_codigo: Option<String>,
    pub es_publica: bool,
    pub parent_id: Option<String>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    // ---- N2-G: alineamiento PeruCRIS ----
    #[serde(default)]
    pub legal_name: Option<String>,
    #[serde(default)]
    pub acronimo: Option<String>,
    #[serde(default)]
    pub web_site: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub rin_id: Option<String>,
    #[serde(default)]
    pub sunedu_clasificacion: Option<String>,
    #[serde(default)]
    pub sunedu_estado: Option<String>,
    #[serde(default)]
    pub sunedu_resolucion: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
    #[serde(default)]
    pub perucris_handle: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrgUnitRequest {
    pub nombre: String,
    #[serde(default)]
    pub ubigeo_codigo: Option<String>,
    #[serde(default)]
    pub ruc: Option<String>,
    #[serde(default)]
    pub ror_id: Option<String>,
    #[serde(default)]
    pub isni_id: Option<String>,
    #[serde(default)]
    pub scopus_id: Option<String>,
    #[serde(default)]
    pub sector_institucional: Option<String>,
    pub tipo_organizacion: String,
    #[serde(default)]
    pub tipo_dependencia: Option<String>,
    #[serde(default)]
    pub tipo_educacion_superior: Option<String>,
    #[serde(default)]
    pub ciiu_codigo: Option<String>,
    #[serde(default = "default_true")]
    pub es_publica: bool,
    #[serde(default)]
    pub parent_id: Option<String>,
    // ---- N2-G: alineamiento PeruCRIS ----
    #[serde(default)]
    pub legal_name: Option<String>,
    #[serde(default)]
    pub acronimo: Option<String>,
    #[serde(default)]
    pub web_site: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub rin_id: Option<String>,
    #[serde(default)]
    pub sunedu_clasificacion: Option<String>,
    #[serde(default)]
    pub sunedu_estado: Option<String>,
    #[serde(default)]
    pub sunedu_resolucion: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
    #[serde(default)]
    pub perucris_handle: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrgUnitRequest {
    #[serde(default)]
    pub nombre: Option<String>,
    #[serde(default)]
    pub ubigeo_codigo: Option<String>,
    #[serde(default)]
    pub ror_id: Option<String>,
    #[serde(default)]
    pub isni_id: Option<String>,
    #[serde(default)]
    pub scopus_id: Option<String>,
    #[serde(default)]
    pub sector_institucional: Option<String>,
    #[serde(default)]
    pub tipo_dependencia: Option<String>,
    #[serde(default)]
    pub tipo_educacion_superior: Option<String>,
    #[serde(default)]
    pub ciiu_codigo: Option<String>,
    #[serde(default)]
    pub es_publica: Option<bool>,
    #[serde(default)]
    pub parent_id: Option<String>,
    // ---- N2-G: alineamiento PeruCRIS ----
    #[serde(default)]
    pub legal_name: Option<String>,
    #[serde(default)]
    pub acronimo: Option<String>,
    #[serde(default)]
    pub web_site: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub rin_id: Option<String>,
    #[serde(default)]
    pub sunedu_clasificacion: Option<String>,
    #[serde(default)]
    pub sunedu_estado: Option<String>,
    #[serde(default)]
    pub sunedu_resolucion: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
    #[serde(default)]
    pub perucris_handle: Option<String>,
}
