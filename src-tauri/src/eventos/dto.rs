use serde::{Deserialize, Serialize};

fn default_activo() -> i64 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipanteEventoDto {
    pub investigador_id: String,
    pub rol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventoAcademicoDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_evento: String,
    pub nombre: String,
    pub tipo: String,
    #[serde(default)]
    pub fecha_inicio: Option<i64>,
    #[serde(default)]
    pub fecha_fin: Option<i64>,
    #[serde(default)]
    pub lugar: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub participantes: Vec<ParticipanteEventoDto>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateEventoRequest {
    pub nombre: String,
    pub tipo: String,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub lugar: Option<String>,
    pub descripcion: Option<String>,
    #[serde(default)]
    pub participantes: Vec<ParticipanteEventoDto>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateEventoRequest {
    pub nombre: Option<String>,
    pub tipo: Option<String>,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub lugar: Option<String>,
    pub descripcion: Option<String>,
    pub participantes: Option<Vec<ParticipanteEventoDto>>,
}
