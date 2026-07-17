//! Modelos de dominio de la feature `personas`.
//!
//! Dominio puro: sin `serde`, sin `uuid`. Las invariantes se validan en
//! `new()`. La conversion a/desde BSON `Document` se hace en
//! `crate::personas::repository` via `PersonaDto`.

use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::shared::time;

use crate::personas::dto::CreatePersonaRequest;

#[derive(Debug, Clone)]
pub struct Persona {
    pub id_persona: String,
    pub dni: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub nombre_completo: String,
    pub correo: Option<String>,
    pub telefono: Option<String>,
    pub direccion: Option<String>,
    pub sexo: Option<String>,
    pub fecha_nacimiento: Option<i64>,
    pub activo: i64,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

impl Persona {
    pub fn new(id_persona: String, request: CreatePersonaRequest) -> Result<Self, AppError> {
        if id_persona.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de persona no puede estar vacio.".to_string(),
            ));
        }
        let dni = Dni::new(&request.dni)?.into_string();

        let apellido_materno = request
            .apellido_materno
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());
        let nombres = request.nombres.trim().to_string();
        let apellido_paterno = request.apellido_paterno.trim().to_string();
        let nombre_completo = [
            Some(nombres.clone()),
            Some(apellido_paterno.clone()),
            apellido_materno.clone(),
        ]
        .into_iter()
        .flatten()
        .filter(|v| !v.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

        let now = time::now_ms();

        Ok(Self {
            id_persona,
            dni,
            nombres: Some(nombres),
            apellido_paterno: Some(apellido_paterno),
            apellido_materno,
            nombre_completo,
            correo: request
                .correo
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            telefono: request
                .telefono
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            direccion: request
                .direccion
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            sexo: request
                .sexo
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty()),
            fecha_nacimiento: request.fecha_nacimiento,
            activo: 1,
            created_at: Some(now),
            updated_at: Some(now),
        })
    }
}
