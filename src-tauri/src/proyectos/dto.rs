use serde::{Deserialize, Serialize};

use crate::shared::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProyectoParticipanteResumenDto {
    pub id_investigador: String,
    pub nombre: String,
    pub grado: String,
    pub renacyt_nivel: String,
    pub es_responsable: bool,
}

/// Datos validados de entrada para crear/actualizar un proyecto con sus
/// participantes. Se obtiene via `CreateProyectoConParticipantesRequest::validate()`
/// o `UpdateProyectoConParticipantesRequest::validate()`. Centralizar la
/// normalizacion aqui evita inconsistencias entre create/update.
#[derive(Debug, Clone)]
pub struct ProyectoParticipantesInput {
    pub titulo_proyecto: String,
    pub investigadores_ids: Vec<String>,
    pub investigador_responsable_id: Option<String>,
}

fn normalize_investigador_ids(investigadores_ids: &[String]) -> Result<Vec<String>, AppError> {
    let mut normalized_ids = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for investigador_id in investigadores_ids {
        let normalized = investigador_id.trim();
        if normalized.is_empty() {
            return Err(AppError::InternalError(
                "La lista de investigadores contiene valores invalidos.".to_string(),
            ));
        }

        if seen.insert(normalized.to_string()) {
            normalized_ids.push(normalized.to_string());
        }
    }

    Ok(normalized_ids)
}

fn normalize_responsable_id(investigador_responsable_id: Option<String>) -> Option<String> {
    investigador_responsable_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn validate_responsable(
    investigadores_ids: &[String],
    investigador_responsable_id: &Option<String>,
) -> Result<(), AppError> {
    if investigadores_ids.is_empty() {
        if investigador_responsable_id.is_some() {
            return Err(AppError::InternalError(
                "No puede asignar un investigador responsable cuando el proyecto no tiene investigadores vinculados."
                    .to_string(),
            ));
        }
        return Ok(());
    }

    let Some(responsable_id) = investigador_responsable_id.as_ref() else {
        return Err(AppError::InternalError(
            "Seleccione un investigador responsable para el proyecto.".to_string(),
        ));
    };

    if !investigadores_ids
        .iter()
        .any(|investigador_id| investigador_id == responsable_id)
    {
        return Err(AppError::InternalError(
            "El investigador responsable debe formar parte de los investigadores asignados al proyecto."
                .to_string(),
        ));
    }

    Ok(())
}

fn deserialize_activo_bool<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de;
    struct BoolishVisitor;
    impl<'de> de::Visitor<'de> for BoolishVisitor {
        type Value = bool;
        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("boolean or integer 0/1")
        }
        fn visit_bool<E: de::Error>(self, v: bool) -> Result<bool, E> {
            Ok(v)
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<bool, E> {
            Ok(v != 0)
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<bool, E> {
            Ok(v != 0)
        }
    }
    deserializer.deserialize_any(BoolishVisitor)
}

fn serialize_activo_bool<S>(value: &bool, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_i64(if *value { 1 } else { 0 })
}

fn default_activo_true() -> bool {
    true
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProyectoDto {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    #[serde(
        deserialize_with = "deserialize_activo_bool",
        serialize_with = "serialize_activo_bool"
    )]
    #[serde(default = "default_activo_true")]
    pub activo: bool,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    /// Código OCDE del área temática del proyecto (ej. "1.1 Matemáticas").
    #[serde(default)]
    pub campo_ocde: Option<String>,
    /// Programas de investigación institucionales relacionados.
    #[serde(default)]
    pub programas_relacionados: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProyectoRequest {
    pub titulo_proyecto: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProyectoConParticipantesRequest {
    pub titulo_proyecto: String,
    pub investigadores_ids: Vec<String>,
    pub investigador_responsable_id: Option<String>,
}

impl CreateProyectoConParticipantesRequest {
    /// Valida y normaliza el input. Devuelve un `ProyectoParticipantesInput`
    /// listo para el repositorio. Reglas:
    /// - Al menos un investigador.
    /// - IDs trim + dedupe (mantiene orden).
    /// - Si hay investigadores, el responsable debe estar entre ellos.
    pub fn validate(&self) -> Result<ProyectoParticipantesInput, AppError> {
        let investigadores_ids = normalize_investigador_ids(&self.investigadores_ids)?;
        if investigadores_ids.is_empty() {
            return Err(AppError::InternalError(
                "Seleccione al menos un investigador para crear el proyecto.".to_string(),
            ));
        }
        let investigador_responsable_id =
            normalize_responsable_id(self.investigador_responsable_id.clone());
        validate_responsable(&investigadores_ids, &investigador_responsable_id)?;
        Ok(ProyectoParticipantesInput {
            titulo_proyecto: self.titulo_proyecto.clone(),
            investigadores_ids,
            investigador_responsable_id,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProyectoConParticipantesRequest {
    pub titulo_proyecto: String,
    pub investigadores_ids: Vec<String>,
    pub investigador_responsable_id: Option<String>,
}

impl UpdateProyectoConParticipantesRequest {
    /// Variante de `validate()` para updates: NO exige al menos un
    /// investigador (puede haber updates que solo cambian titulo).
    /// El responsable se valida contra la lista existente.
    pub fn validate(&self) -> Result<ProyectoParticipantesInput, AppError> {
        let investigadores_ids = normalize_investigador_ids(&self.investigadores_ids)?;
        let investigador_responsable_id =
            normalize_responsable_id(self.investigador_responsable_id.clone());
        validate_responsable(&investigadores_ids, &investigador_responsable_id)?;
        Ok(ProyectoParticipantesInput {
            titulo_proyecto: self.titulo_proyecto.trim().to_string(),
            investigadores_ids,
            investigador_responsable_id,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct ProyectoDetalleDto {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    pub cantidad_investigadores: i64,
    pub investigador_responsable: Option<String>,
    pub investigadores: Option<String>,
    pub participantes_json: Option<String>,
    pub activo: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EliminarProyectoResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

#[derive(Debug, Serialize)]
pub struct ExportDataConProjectosDto {
    pub investigador: String,
    pub dni: String,
    pub grado: String,
    pub renacyt_nivel: String,
    pub grupo_investigacion: Option<String>,
    pub cantidad_proyectos: i64,
    pub proyectos: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvestigadorProyectosCountDto {
    pub nombre: String,
    pub cantidad: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProyectosTrendItemDto {
    pub anio: i32,
    pub mes: u32,
    pub cantidad: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenacytDistribucionItemDto {
    pub nivel: String,
    pub cantidad_investigadores: i64,
    pub con_proyectos: i64,
    pub sin_proyectos: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KpisDashboardDto {
    pub total_proyectos: i64,
    pub total_investigadores: i64,
    pub investigadores_con_1_proyecto: i64,
    pub investigadores_multiples_proyectos: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportDataDto {
    pub proyecto: String,
    pub grado: String,
    pub renacyt_nivel: String,
    pub investigador: String,
    pub dni: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportDataGrupoDto {
    pub grupo: String,
    pub descripcion: Option<String>,
    pub coordinador: Option<String>,
    pub cantidad_miembros: i64,
    pub miembros: Option<String>,
    pub lineas_investigacion: Vec<String>,
    pub cantidad_proyectos: i64,
    pub proyectos: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportDataRecursoDto {
    pub tipo_recurso: String,
    pub titulo_o_nombre: String,
    pub proyecto: Option<String>,
    pub investigador: Option<String>,
    pub tipo: Option<String>,
    pub estado: Option<String>,
    pub moneda: Option<String>,
    pub monto: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportDataInvestigadorPerfilDto {
    pub dni: String,
    pub nombres_apellidos: String,
    pub grado: String,
    pub renacyt_nivel: Option<String>,
    pub renacyt_grupo: Option<String>,
    pub renacyt_condicion: Option<String>,
    pub renacyt_orcid: Option<String>,
    pub grupo_investigacion: Option<String>,
    pub cantidad_proyectos: i64,
    pub cantidad_publicaciones: i64,
    pub proyectos: Option<String>,
    pub activo: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportDataProyectoAreaDto {
    pub area: String,
    pub cantidad_proyectos: i64,
    pub proyectos: Option<String>,
    pub cantidad_investigadores: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParticipacionRecordDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_proyecto: String,
    pub id_investigador: String,
    #[serde(default)]
    pub es_responsable: bool,
}
