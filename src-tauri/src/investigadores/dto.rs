use serde::{Deserialize, Serialize};

fn default_perfil() -> String {
    "docente".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
}

#[derive(Debug, Clone, Serialize)]
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReniecDniLookupResult {
    pub first_name: String,
    pub first_last_name: String,
    pub second_last_name: String,
    pub full_name: String,
    pub document_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminarInvestigadorResultadoDto {
    pub accion: String,
    pub mensaje: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RefreshInvestigadorRenacytFormacionResultadoDto {
    pub investigador: InvestigadorDetalleDto,
    pub actualizada: bool,
    pub mensaje: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicacionDto {
    pub id_publicacion: String,
    pub pure_uuid: String,
    pub persona_id: String,
    #[serde(default)]
    pub proyecto_id: Option<String>,
    pub titulo: String,
    #[serde(default)]
    pub tipo_publicacion: Option<String>,
    #[serde(default)]
    pub doi: Option<String>,
    #[serde(default)]
    pub scopus_eid: Option<String>,
    #[serde(default)]
    pub anio_publicacion: Option<i32>,
    #[serde(default)]
    pub autores_json: Option<String>,
    #[serde(default)]
    pub estado_publicacion: Option<String>,
    #[serde(default)]
    pub journal_titulo: Option<String>,
    #[serde(default)]
    pub issn: Option<String>,
    #[serde(default)]
    pub pure_sincronizado_at: Option<i64>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPublicacionesResult {
    pub persona_id: String,
    pub scopus_author_id: String,
    pub pure_person_uuid: Option<String>,
    pub total_encontradas: usize,
    pub nuevas: usize,
    pub actualizadas: usize,
}
