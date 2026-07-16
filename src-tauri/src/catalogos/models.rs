use crate::catalogos::dto::{CatalogoItemDto, CreateCatalogoRequest};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct CatalogoItem {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub orden: Option<i32>,
    pub activo: i64,
    pub updated_at: Option<i64>,
}

impl CatalogoItem {
    pub fn new(id_catalogo: String, request: CreateCatalogoRequest) -> Result<Self, AppError> {
        if id_catalogo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de catálogo no puede estar vacio.".to_string(),
            ));
        }
        if request.tipo.trim().is_empty() || request.codigo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El tipo y código del catálogo no pueden estar vacios.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id_catalogo,
            tipo: request.tipo,
            codigo: request.codigo,
            nombre: request.nombre,
            descripcion: request.descripcion,
            orden: request.orden,
            activo: 1,
            updated_at: Some(now),
        })
    }
}

impl From<CatalogoItem> for CatalogoItemDto {
    fn from(m: CatalogoItem) -> Self {
        Self {
            id_catalogo: m.id_catalogo,
            tipo: m.tipo,
            codigo: m.codigo,
            nombre: m.nombre,
            descripcion: m.descripcion,
            orden: m.orden,
            activo: m.activo,
            updated_at: m.updated_at,
        }
    }
}
