use serde::{Deserialize, Serialize};

// Re-export DRY: el campo `cambios_renacyt_recientes` de
// `InvestigadorDetalleDto` consume la misma struct que el modulo
// `kardex` (panel de cambios recientes en la ficha). Asi no
// duplicamos tipos y mantenemos una unica fuente de verdad.
pub use crate::investigadores::kardex::CambioKardex;

fn default_perfil() -> String {
    "docente".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInvestigadorRenacytRequest {
    pub codigo_registro: String,
    pub id_investigador: String,
    pub nivel: Option<String>,
    pub grupo: Option<String>,
    pub condicion: Option<String>,
    pub fecha_informe_calificacion: Option<i64>,
    pub fecha_registro: Option<i64>,
    pub fecha_ultima_revision: Option<i64>,
    pub orcid: Option<String>,
    pub scopus_author_id: Option<String>,
    pub ficha_url: String,
    pub formaciones_academicas_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenacytLookupResult {
    pub codigo_registro: String,
    pub id_investigador: String,
    pub nombre_completo: Option<String>,
    pub numero_documento: Option<String>,
    pub nivel: Option<String>,
    pub grupo: Option<String>,
    pub condicion: Option<String>,
    pub fecha_informe_calificacion: Option<i64>,
    pub fecha_registro: Option<i64>,
    pub fecha_ultima_revision: Option<i64>,
    pub orcid: Option<String>,
    pub scopus_author_id: Option<String>,
    pub ficha_url: String,
    pub solicitud_id: Option<i64>,
    pub formaciones_academicas_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvestigadorDto {
    pub id_investigador: String,
    pub persona_id: String,
    pub id_grado: String,
    pub activo: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_perfil")]
    pub perfil: String,
    #[serde(default)]
    pub renacyt_codigo_registro: Option<String>,
    #[serde(default)]
    pub renacyt_id_investigador: Option<String>,
    #[serde(default)]
    pub renacyt_nivel: Option<String>,
    #[serde(default)]
    pub renacyt_grupo: Option<String>,
    #[serde(default)]
    pub renacyt_condicion: Option<String>,
    #[serde(default)]
    pub renacyt_fecha_informe_calificacion: Option<i64>,
    #[serde(default)]
    pub renacyt_fecha_registro: Option<i64>,
    #[serde(default)]
    pub renacyt_fecha_ultima_revision: Option<i64>,
    #[serde(default)]
    pub renacyt_orcid: Option<String>,
    #[serde(default)]
    pub renacyt_scopus_author_id: Option<String>,
    #[serde(default)]
    pub renacyt_fecha_ultima_sincronizacion: Option<i64>,
    #[serde(default)]
    pub renacyt_ficha_url: Option<String>,
    #[serde(default)]
    pub renacyt_formaciones_academicas_json: Option<String>,
    #[serde(default)]
    pub grupo_investigacion_id: Option<String>,
    #[serde(default)]
    pub tipo_documento: Option<String>,
    /// PersonID del Master List de Pure (PER000X). Asignado por
    /// `sincronizar_pure_person_ids`; permite upsert sin duplicar.
    #[serde(default)]
    pub pure_person_id: Option<String>,
    /// UUID canonico PeruCRIS (alineamiento N2-G). Permite dedupe
    /// durante el importador y evita crear duplicados al validar.
    #[serde(default)]
    pub perucris_uuid: Option<String>,
    /// Marca temporal (ms epoch) de la ultima revision del kardex
    /// RENACYT por parte del usuario. `None` = nunca revisado.
    /// Lo setea el handler `marcar_cambios_renacyt_revisados`.
    #[serde(default)]
    pub renacyt_cambios_revisados_en: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInvestigadorRequest {
    pub dni: String,
    pub id_grado: String,
    pub nombres: String,
    pub apellido_paterno: String,
    pub apellido_materno: Option<String>,
    pub correo: Option<String>,
    pub telefono: Option<String>,
    pub direccion: Option<String>,
    pub sexo: Option<String>,
    pub fecha_nacimiento: Option<i64>,
    #[serde(default = "default_perfil")]
    pub perfil: String,
    #[serde(default)]
    pub renacyt: Option<CreateInvestigadorRenacytRequest>,
    /// Fase N0-D (D11): DNI | CE | PASAPORTE. Default DNI.
    #[serde(default)]
    pub tipo_documento: Option<String>,
    /// PersonID del Master List de Pure (PER000X). Lo setea el importador
    /// masivo tras matchear el DNI contra `pure_client::fetch_all_persons_mapping`.
    #[serde(default)]
    pub pure_person_id: Option<String>,
    /// UUID canonico PeruCRIS. Lo setea el importador masivo tras matchear
    /// el DNI contra `perucris_validator::search_by_query(entity_type=Person)`.
    #[serde(default)]
    pub perucris_uuid: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInvestigadorRequest {
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub correo: Option<String>,
    pub telefono: Option<String>,
    pub direccion: Option<String>,
    pub sexo: Option<String>,
    pub fecha_nacimiento: Option<i64>,
    pub id_grado: Option<String>,
    pub grupo_investigacion_id: Option<String>,
    pub perfil: Option<String>,
    /// UUID PeruCRIS (alineamiento N2-G). Solo lo setea el importador
    /// o el validador al confirmar match.
    #[serde(default)]
    pub perucris_uuid: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvestigadorDetalleDto {
    pub id_investigador: String,
    pub persona_id: String,
    pub dni: String,
    pub nombres_apellidos: String,
    pub nombres: Option<String>,
    pub apellido_paterno: Option<String>,
    pub apellido_materno: Option<String>,
    pub correo: Option<String>,
    pub telefono: Option<String>,
    pub direccion: Option<String>,
    pub grado: String,
    pub cantidad_proyectos: i64,
    pub proyectos: Option<String>,
    pub activo: i64,
    pub perfil: String,
    pub renacyt_codigo_registro: Option<String>,
    pub renacyt_id_investigador: Option<String>,
    pub renacyt_nivel: Option<String>,
    pub renacyt_grupo: Option<String>,
    pub renacyt_condicion: Option<String>,
    pub renacyt_fecha_informe_calificacion: Option<i64>,
    pub renacyt_fecha_registro: Option<i64>,
    pub renacyt_fecha_ultima_revision: Option<i64>,
    pub renacyt_orcid: Option<String>,
    pub renacyt_scopus_author_id: Option<String>,
    pub renacyt_fecha_ultima_sincronizacion: Option<i64>,
    pub renacyt_ficha_url: Option<String>,
    pub renacyt_formaciones_academicas_json: Option<String>,
    /// Marca temporal (ms epoch) de la ultima revision del kardex
    /// RENACYT por parte del usuario. `None` = nunca revisado.
    pub renacyt_cambios_revisados_en: Option<i64>,
    /// Cambios RENACYT recientes con `tiene_cambio_clasificatorio() == true`
    /// (ultimos N). Alimenta el panel de kardex en la ficha.
    pub cambios_renacyt_recientes: Vec<CambioKardex>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReniecDniLookupResult {
    pub first_name: String,
    pub first_last_name: String,
    pub second_last_name: String,
    pub full_name: String,
    pub document_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EliminarInvestigadorResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshInvestigadorRenacytFormacionResultadoDto {
    pub investigador: InvestigadorDetalleDto,
    pub actualizada: bool,
    pub mensaje: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPublicacionesResult {
    pub persona_id: String,
    pub scopus_author_id: String,
    pub pure_person_uuid: Option<String>,
    pub total_encontradas: usize,
    pub nuevas: usize,
    pub actualizadas: usize,
}

/// Resultado agregado del refresh masivo RENACYT.
/// - `procesados`: investigadores con vínculo RENACYT que intentaron refrescarse.
/// - `errores`: cantidad de fallos (RENACYT caido, timeout, sin vínculo, etc.).
/// - `kardex_generados`: cantidad de entradas de kardex insertadas
///   (cambios clasificadorios detectados y persistidos).
/// - `errores_detalle`: primeros N mensajes para mostrar al usuario.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RefreshMasivoRenacytResultadoDto {
    pub procesados: usize,
    pub errores: usize,
    pub kardex_generados: usize,
    #[serde(default)]
    pub errores_detalle: Vec<String>,
    #[serde(default)]
    pub mensaje: String,
}
