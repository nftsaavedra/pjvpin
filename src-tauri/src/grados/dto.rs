use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradoAcademicoDto {
    pub id_grado: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    pub activo: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminarGradoResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateGradoRequest {
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
}
