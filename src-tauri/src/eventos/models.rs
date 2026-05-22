use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::shared::time;

fn default_activo() -> i64 {
    1
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParticipanteEvento {
    pub docente_id: String,
    pub rol: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventoAcademico {
    #[serde(rename = "_id")]
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
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventoRequest {
    pub nombre: String,
    pub tipo: String,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub lugar: Option<String>,
    pub descripcion: Option<String>,
    #[serde(default)]
    pub participantes: Vec<ParticipanteEvento>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEventoRequest {
    pub nombre: Option<String>,
    pub tipo: Option<String>,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub lugar: Option<String>,
    pub descripcion: Option<String>,
    pub participantes: Option<Vec<ParticipanteEvento>>,
}

impl EventoAcademico {
    pub fn new(request: CreateEventoRequest) -> Self {
        let now = time::now_ms();
        let id = Uuid::new_v4().to_string();
        Self {
            id: id.clone(),
            id_evento: id,
            nombre: request.nombre,
            tipo: request.tipo,
            fecha_inicio: request.fecha_inicio,
            fecha_fin: request.fecha_fin,
            lugar: request.lugar,
            descripcion: request.descripcion,
            participantes: request.participantes,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        }
    }
}
