use crate::grados::dto::{CreateGradoRequest, GradoAcademicoDoc, GradoAcademicoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct GradoAcademico {
    pub id_grado: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub activo: i64,
    pub created_at: i64,
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
            created_at: now,
            updated_at: Some(now),
        })
    }
}

impl From<GradoAcademicoDoc> for GradoAcademico {
    fn from(doc: GradoAcademicoDoc) -> Self {
        Self {
            id_grado: doc.id_grado,
            nombre: doc.nombre,
            descripcion: doc.descripcion,
            activo: doc.activo,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        }
    }
}

impl From<GradoAcademico> for GradoAcademicoDoc {
    fn from(m: GradoAcademico) -> Self {
        Self {
            id_grado: m.id_grado,
            nombre: m.nombre,
            descripcion: m.descripcion,
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
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
