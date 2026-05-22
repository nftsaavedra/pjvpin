use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::shared::time;

fn default_activo() -> i64 {
    1
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PublicacionCientifica {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_publicacion: String,
    pub titulo: String,
    pub autores_ids: Vec<String>,
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
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Deserialize)]
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

impl PublicacionCientifica {
    pub fn new(request: CreatePublicacionRequest) -> Self {
        let now = time::now_ms();
        let id = Uuid::new_v4().to_string();
        Self {
            id: id.clone(),
            id_publicacion: id,
            titulo: request.titulo,
            autores_ids: request.autores_ids,
            revista: request.revista,
            doi: request.doi,
            issn: request.issn,
            anio: request.anio,
            cuartil: request.cuartil,
            tipo: request.tipo,
            url: request.url,
            resumen: request.resumen,
            palabras_clave: request.palabras_clave,
            pure_id: request.pure_id,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        }
    }
}
