use crate::grupos::dto::{CreateGrupoInvestigacionRequest, GrupoInvestigacionDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct GrupoInvestigacion {
    pub id_grupo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub coordinador_id: Option<String>,
    pub lineas_investigacion: Vec<String>,
    pub activo: i64,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

impl GrupoInvestigacion {
    pub fn new(
        id_grupo: String,
        request: CreateGrupoInvestigacionRequest,
    ) -> Result<Self, AppError> {
        if id_grupo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de grupo no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del grupo es obligatorio.".to_string(),
            ));
        }
        let now_ms = crate::shared::time::now_ms();
        Ok(Self {
            id_grupo,
            nombre: request.nombre,
            descripcion: request.descripcion,
            coordinador_id: request.coordinador_id,
            lineas_investigacion: request.lineas_investigacion,
            activo: 1,
            created_at: Some(now_ms),
            updated_at: Some(now_ms),
        })
    }
}

impl From<GrupoInvestigacion> for GrupoInvestigacionDto {
    fn from(m: GrupoInvestigacion) -> Self {
        Self {
            id_grupo: m.id_grupo,
            nombre: m.nombre,
            descripcion: m.descripcion,
            coordinador_id: m.coordinador_id,
            lineas_investigacion: m.lineas_investigacion,
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}
