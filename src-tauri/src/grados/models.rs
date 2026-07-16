use crate::grados::dto::{CreateGradoRequest, GradoAcademicoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct GradoAcademico {
    pub id_grado: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub activo: i64,
    pub updated_at: Option<i64>,
}

impl GradoAcademico {
    pub fn new(id_grado: String, request: CreateGradoRequest) -> Result<Self, AppError> {
        if id_grado.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de grado no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del grado no puede estar vacio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id_grado,
            nombre: request.nombre,
            descripcion: request.descripcion,
            activo: 1,
            updated_at: Some(now),
        })
    }
}

impl From<GradoAcademico> for GradoAcademicoDto {
    fn from(m: GradoAcademico) -> Self {
        Self {
            id_grado: m.id_grado,
            nombre: m.nombre,
            descripcion: m.descripcion,
            activo: m.activo,
            updated_at: m.updated_at,
        }
    }
}
