use crate::eventos::dto::{CreateEventoRequest, EventoAcademicoDto, ParticipanteEventoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct ParticipanteEvento {
    pub investigador_id: String,
    pub rol: String,
}

impl From<ParticipanteEventoDto> for ParticipanteEvento {
    fn from(d: ParticipanteEventoDto) -> Self {
        Self {
            investigador_id: d.investigador_id,
            rol: d.rol,
        }
    }
}

impl From<ParticipanteEvento> for ParticipanteEventoDto {
    fn from(m: ParticipanteEvento) -> Self {
        Self {
            investigador_id: m.investigador_id,
            rol: m.rol,
        }
    }
}

#[derive(Debug, Clone)]
pub struct EventoAcademico {
    pub id: String,
    pub id_evento: String,
    pub nombre: String,
    pub tipo: String,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub lugar: Option<String>,
    pub descripcion: Option<String>,
    pub participantes: Vec<ParticipanteEvento>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl EventoAcademico {
    pub fn new(id_evento: String, request: CreateEventoRequest) -> Result<Self, AppError> {
        if id_evento.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de evento no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del evento es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_evento.clone(),
            id_evento,
            nombre: request.nombre,
            tipo: request.tipo,
            fecha_inicio: request.fecha_inicio,
            fecha_fin: request.fecha_fin,
            lugar: request.lugar,
            descripcion: request.descripcion,
            participantes: request.participantes.into_iter().map(Into::into).collect(),
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<EventoAcademico> for EventoAcademicoDto {
    fn from(m: EventoAcademico) -> Self {
        Self {
            id: m.id,
            id_evento: m.id_evento,
            nombre: m.nombre,
            tipo: m.tipo,
            fecha_inicio: m.fecha_inicio,
            fecha_fin: m.fecha_fin,
            lugar: m.lugar,
            descripcion: m.descripcion,
            participantes: m.participantes.into_iter().map(Into::into).collect(),
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}
