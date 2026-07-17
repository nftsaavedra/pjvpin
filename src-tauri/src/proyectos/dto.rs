use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProyectoParticipanteResumenDto {
    pub id_investigador: String,
    pub nombre: String,
    pub grado: String,
    pub renacyt_nivel: String,
    pub es_responsable: bool,
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

#[derive(Debug, Deserialize)]
pub struct UpdateProyectoConParticipantesRequest {
    pub titulo_proyecto: String,
    pub investigadores_ids: Vec<String>,
    pub investigador_responsable_id: Option<String>,
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
