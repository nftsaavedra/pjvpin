//! DTOs de la feature `org_units`.
//!
//! - `OrgUnitDoc` (BSON) y `OrgUnitDto` (IPC salida) usan snake_case.
//! - `CreateOrgUnitRequest` / `UpdateOrgUnitRequest` (IPC entrada) usan
//!   camelCase para casar con el frontend TS.

use serde::{Deserialize, Serialize};

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
}
