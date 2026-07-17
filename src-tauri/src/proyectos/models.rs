use crate::proyectos::dto::{CreateProyectoRequest, ParticipacionRecordDto, ProyectoDto};
use crate::shared::error::AppError;
use crate::shared::time;

#[derive(Debug, Clone)]
pub struct Proyecto {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    pub activo: bool,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub campo_ocde: Option<String>,
    pub programas_relacionados: Vec<String>,
}

impl Proyecto {
    pub fn new(id: String, request: CreateProyectoRequest) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de proyecto no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo_proyecto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El titulo del proyecto es obligatorio.".to_string(),
            ));
        }
        let now = time::now_ms();

        Ok(Self {
            id_proyecto: id,
            titulo_proyecto: request.titulo_proyecto,
            activo: true,
            created_at: Some(now),
            updated_at: Some(now),
            campo_ocde: None,
            programas_relacionados: Vec::new(),
        })
    }
}

impl From<Proyecto> for ProyectoDto {
    fn from(m: Proyecto) -> Self {
        Self {
            id_proyecto: m.id_proyecto,
            titulo_proyecto: m.titulo_proyecto,
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
            campo_ocde: m.campo_ocde,
            programas_relacionados: m.programas_relacionados,
        }
    }
}

impl From<&Proyecto> for ProyectoDto {
    fn from(m: &Proyecto) -> Self {
        Self {
            id_proyecto: m.id_proyecto.clone(),
            titulo_proyecto: m.titulo_proyecto.clone(),
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
            campo_ocde: m.campo_ocde.clone(),
            programas_relacionados: m.programas_relacionados.clone(),
        }
    }
}

impl TryFrom<ProyectoDto> for Proyecto {
    type Error = AppError;
    fn try_from(d: ProyectoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id_proyecto: d.id_proyecto,
            titulo_proyecto: d.titulo_proyecto,
            activo: d.activo,
            created_at: d.created_at,
            updated_at: d.updated_at,
            campo_ocde: d.campo_ocde,
            programas_relacionados: d.programas_relacionados,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ParticipacionRecord {
    pub id: String,
    pub id_proyecto: String,
    pub id_investigador: String,
    pub es_responsable: bool,
}

impl From<ParticipacionRecord> for ParticipacionRecordDto {
    fn from(m: ParticipacionRecord) -> Self {
        Self {
            id: m.id,
            id_proyecto: m.id_proyecto,
            id_investigador: m.id_investigador,
            es_responsable: m.es_responsable,
        }
    }
}

impl From<&ParticipacionRecord> for ParticipacionRecordDto {
    fn from(m: &ParticipacionRecord) -> Self {
        Self {
            id: m.id.clone(),
            id_proyecto: m.id_proyecto.clone(),
            id_investigador: m.id_investigador.clone(),
            es_responsable: m.es_responsable,
        }
    }
}

impl TryFrom<ParticipacionRecordDto> for ParticipacionRecord {
    type Error = AppError;
    fn try_from(d: ParticipacionRecordDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_proyecto: d.id_proyecto,
            id_investigador: d.id_investigador,
            es_responsable: d.es_responsable,
        })
    }
}
