use crate::recursos::dto::{CreateProductoRequest, ProductoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct Producto {
    pub id: String,
    pub id_producto: String,
    pub proyecto_id: Option<String>,
    pub investigador_id: Option<String>,
    pub nombre: String,
    pub tipo: Option<String>,
    pub etapa: Option<String>,
    pub descripcion: Option<String>,
    pub fecha_registro: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Producto {
    pub fn new(id_producto: String, request: CreateProductoRequest) -> Result<Self, AppError> {
        if id_producto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de producto no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del producto es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_producto.clone(),
            id_producto,
            proyecto_id: request.proyecto_id,
            investigador_id: request.investigador_id,
            nombre: request.nombre,
            tipo: request.tipo,
            etapa: request.etapa,
            descripcion: request.descripcion,
            fecha_registro: request.fecha_registro,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Producto> for ProductoDto {
    fn from(m: Producto) -> Self {
        Self {
            id: m.id,
            id_producto: m.id_producto,
            proyecto_id: m.proyecto_id,
            investigador_id: m.investigador_id,
            nombre: m.nombre,
            tipo: m.tipo,
            etapa: m.etapa,
            descripcion: m.descripcion,
            fecha_registro: m.fecha_registro,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Producto> for ProductoDto {
    fn from(m: &Producto) -> Self {
        Self {
            id: m.id.clone(),
            id_producto: m.id_producto.clone(),
            proyecto_id: m.proyecto_id.clone(),
            investigador_id: m.investigador_id.clone(),
            nombre: m.nombre.clone(),
            tipo: m.tipo.clone(),
            etapa: m.etapa.clone(),
            descripcion: m.descripcion.clone(),
            fecha_registro: m.fecha_registro,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<ProductoDto> for Producto {
    type Error = crate::shared::error::AppError;
    fn try_from(d: ProductoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_producto: d.id_producto,
            proyecto_id: d.proyecto_id,
            investigador_id: d.investigador_id,
            nombre: d.nombre,
            tipo: d.tipo,
            etapa: d.etapa,
            descripcion: d.descripcion,
            fecha_registro: d.fecha_registro,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}
