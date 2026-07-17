use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrupoInvestigacionDto {
    pub id_grupo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub coordinador_id: Option<String>,
    #[serde(default)]
    pub lineas_investigacion: Vec<String>,
    pub activo: i64,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateGrupoInvestigacionRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub coordinador_id: Option<String>,
    #[serde(default)]
    pub lineas_investigacion: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateGrupoInvestigacionRequest {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub coordinador_id: Option<String>,
    #[serde(default)]
    pub lineas_investigacion: Vec<String>,
}
