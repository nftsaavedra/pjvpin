use serde::{Deserialize, Serialize};

fn default_activo() -> i64 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicacionCientificaDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_publicacion: String,
    pub titulo: String,
    #[serde(default)]
    pub autores_ids: Vec<String>,
    #[serde(default)]
    pub revista: Option<String>,
    #[serde(default)]
    pub doi: Option<String>,
    #[serde(default)]
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: String,
    pub url: Option<String>,
    pub resumen: Option<String>,
    pub palabras_clave: Vec<String>,
    pub pure_id: Option<String>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePublicacionRequest {
    pub titulo: String,
    pub autores_ids: Vec<String>,
    pub revista: Option<String>,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: String,
    pub url: Option<String>,
    pub resumen: Option<String>,
    #[serde(default)]
    pub palabras_clave: Vec<String>,
    pub pure_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePublicacionRequest {
    pub titulo: Option<String>,
    pub autores_ids: Option<Vec<String>>,
    pub revista: Option<String>,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: Option<String>,
    pub url: Option<String>,
    pub resumen: Option<String>,
    pub palabras_clave: Option<Vec<String>>,
}
