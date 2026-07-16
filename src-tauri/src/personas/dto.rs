//! DTOs de la feature `personas`.
//!
//! Contrato wire y de persistencia (BSON). Ver `crate::personas::models`
//! para los modelos de dominio puros.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonaDto {
    pub id_persona: String,
    pub dni: String,
    #[serde(default)]
    pub nombres: Option<String>,
    #[serde(default)]
    pub apellido_paterno: Option<String>,
    #[serde(default)]
    pub apellido_materno: Option<String>,
    pub nombre_completo: String,
    #[serde(default)]
    pub correo: Option<String>,
    #[serde(default)]
    pub telefono: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub sexo: Option<String>,
    #[serde(default)]
    pub fecha_nacimiento: Option<i64>,
    pub activo: i64,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePersonaRequest {
    pub dni: String,
    pub nombres: String,
    pub apellido_paterno: String,
    #[serde(default)]
    pub apellido_materno: Option<String>,
    #[serde(default)]
    pub correo: Option<String>,
    #[serde(default)]
    pub telefono: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub sexo: Option<String>,
    #[serde(default)]
    pub fecha_nacimiento: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePersonaRequest {
    #[serde(default)]
    pub nombres: Option<String>,
    #[serde(default)]
    pub apellido_paterno: Option<String>,
    #[serde(default)]
    pub apellido_materno: Option<String>,
    #[serde(default)]
    pub correo: Option<String>,
    #[serde(default)]
    pub telefono: Option<String>,
    #[serde(default)]
    pub direccion: Option<String>,
    #[serde(default)]
    pub sexo: Option<String>,
    #[serde(default)]
    pub fecha_nacimiento: Option<i64>,
}
