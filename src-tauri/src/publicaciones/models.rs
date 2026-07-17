use crate::publicaciones::dto::{CreatePublicacionRequest, PublicacionCientificaDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct PublicacionCientifica {
    pub id: String,
    pub id_publicacion: String,
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
    pub palabras_clave: Vec<String>,
    pub pure_id: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl PublicacionCientifica {
    pub fn new(
        id_publicacion: String,
        request: CreatePublicacionRequest,
    ) -> Result<Self, AppError> {
        if id_publicacion.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de publicación no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El título de la publicación es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_publicacion.clone(),
            id_publicacion,
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
        })
    }
}

impl From<PublicacionCientifica> for PublicacionCientificaDto {
    fn from(m: PublicacionCientifica) -> Self {
        Self {
            id: m.id,
            id_publicacion: m.id_publicacion,
            titulo: m.titulo,
            autores_ids: m.autores_ids,
            revista: m.revista,
            doi: m.doi,
            issn: m.issn,
            anio: m.anio,
            cuartil: m.cuartil,
            tipo: m.tipo,
            url: m.url,
            resumen: m.resumen,
            palabras_clave: m.palabras_clave,
            pure_id: m.pure_id,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}
