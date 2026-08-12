use crate::recursos::dto::{CreatePatenteRequest, PatenteDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct Patente {
    pub id: String,
    pub id_patente: String,
    pub proyecto_id: Option<String>,
    pub investigador_id: Option<String>,
    pub titulo: String,
    pub numero_patente: Option<String>,
    pub tipo: Option<String>,
    pub estado: Option<String>,
    pub fecha_solicitud: Option<i64>,
    pub fecha_concesion: Option<i64>,
    pub pais: Option<String>,
    pub entidad_concedente: Option<String>,
    pub descripcion: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Patente {
    pub fn new(id_patente: String, request: CreatePatenteRequest) -> Result<Self, AppError> {
        if id_patente.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de patente no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El título de la patente es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_patente.clone(),
            id_patente,
            proyecto_id: request.proyecto_id,
            investigador_id: request.investigador_id,
            titulo: request.titulo,
            numero_patente: request.numero_patente,
            tipo: request.tipo,
            estado: request.estado,
            fecha_solicitud: request.fecha_solicitud,
            fecha_concesion: request.fecha_concesion,
            pais: request.pais,
            entidad_concedente: request.entidad_concedente,
            descripcion: request.descripcion,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Patente> for PatenteDto {
    fn from(m: Patente) -> Self {
        Self {
            id: m.id,
            id_patente: m.id_patente,
            proyecto_id: m.proyecto_id,
            investigador_id: m.investigador_id,
            titulo: m.titulo,
            numero_patente: m.numero_patente,
            tipo: m.tipo,
            estado: m.estado,
            fecha_solicitud: m.fecha_solicitud,
            fecha_concesion: m.fecha_concesion,
            pais: m.pais,
            entidad_concedente: m.entidad_concedente,
            descripcion: m.descripcion,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Patente> for PatenteDto {
    fn from(m: &Patente) -> Self {
        Self {
            id: m.id.clone(),
            id_patente: m.id_patente.clone(),
            proyecto_id: m.proyecto_id.clone(),
            investigador_id: m.investigador_id.clone(),
            titulo: m.titulo.clone(),
            numero_patente: m.numero_patente.clone(),
            tipo: m.tipo.clone(),
            estado: m.estado.clone(),
            fecha_solicitud: m.fecha_solicitud,
            fecha_concesion: m.fecha_concesion,
            pais: m.pais.clone(),
            entidad_concedente: m.entidad_concedente.clone(),
            descripcion: m.descripcion.clone(),
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<PatenteDto> for Patente {
    type Error = crate::shared::error::AppError;
    fn try_from(d: PatenteDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_patente: d.id_patente,
            proyecto_id: d.proyecto_id,
            investigador_id: d.investigador_id,
            titulo: d.titulo,
            numero_patente: d.numero_patente,
            tipo: d.tipo,
            estado: d.estado,
            fecha_solicitud: d.fecha_solicitud,
            fecha_concesion: d.fecha_concesion,
            pais: d.pais,
            entidad_concedente: d.entidad_concedente,
            descripcion: d.descripcion,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}
