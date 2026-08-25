use serde::{Deserialize, Serialize};

fn default_activo() -> i64 {
    1
}

fn default_es_revisado_por_pares() -> bool {
    true
}

fn default_dominio_origen() -> String {
    crate::shared::vocab_mapper::DEFAULT.to_string()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PublicacionCientificaDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_publicacion: String,
    pub titulo: String,
    #[serde(default)]
    pub doi: Option<String>,
    #[serde(default)]
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: String,
    pub resumen: Option<String>,
    pub palabras_clave: Vec<String>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
    // ---- Campos N2-F (CONCYTEC/PeruCRIS) ----
    #[serde(default)]
    pub handle_url: Option<String>,
    #[serde(default)]
    pub fecha_publicacion: Option<i64>,
    #[serde(default)]
    pub editorial: Option<String>,
    #[serde(default)]
    pub id_org_unit_editora: Option<String>,
    #[serde(default)]
    pub revista_titulo: Option<String>,
    #[serde(default)]
    pub isbn: Option<String>,
    #[serde(default)]
    pub scimago_cuartil: Option<String>,
    #[serde(default)]
    pub wos_cuartil: Option<String>,
    #[serde(default = "default_es_revisado_por_pares")]
    pub es_revisado_por_pares: bool,
    #[serde(default)]
    pub acceso_abierto: Option<String>,
    #[serde(default)]
    pub idioma: Option<String>,
    #[serde(default)]
    pub volumen: Option<String>,
    #[serde(default)]
    pub numero_issue: Option<String>,
    #[serde(default)]
    pub paginas: Option<String>,
    #[serde(default = "default_dominio_origen")]
    pub dominio_origen: String,
    #[serde(default)]
    pub pure_uuid: Option<String>,
    #[serde(default)]
    pub estado_publicacion: Option<String>,
    /// FK desnormalizada a `proyectos` (D5: software/publicacion producto de
    /// un proyecto se conserva este vinculo directo para queries simples).
    /// No forma parte del modelo CERIF puro (donde la vinculacion proyecto↔
    /// publicacion va via pivot), pero simplifica la lectura del tab de
    /// recursos del proyecto sin un join adicional.
    #[serde(default)]
    pub id_proyecto: Option<String>,
    /// UUID canonico PeruCRIS (alineamiento N2-G). Permite dedupe
    /// durante el importador inicial desde PeruCRIS y ancla el match
    /// publicacion↔PeruCRIS.
    #[serde(default)]
    pub perucris_uuid: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePublicacionRequest {
    pub titulo: String,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: String,
    pub resumen: Option<String>,
    #[serde(default)]
    pub palabras_clave: Vec<String>,
    // ---- Campos N2-F ----
    #[serde(default)]
    pub handle_url: Option<String>,
    #[serde(default)]
    pub fecha_publicacion: Option<i64>,
    #[serde(default)]
    pub editorial: Option<String>,
    #[serde(default)]
    pub id_org_unit_editora: Option<String>,
    #[serde(default)]
    pub revista_titulo: Option<String>,
    #[serde(default)]
    pub isbn: Option<String>,
    #[serde(default)]
    pub scimago_cuartil: Option<String>,
    #[serde(default)]
    pub wos_cuartil: Option<String>,
    #[serde(default = "default_es_revisado_por_pares")]
    pub es_revisado_por_pares: bool,
    #[serde(default)]
    pub acceso_abierto: Option<String>,
    #[serde(default)]
    pub idioma: Option<String>,
    #[serde(default)]
    pub volumen: Option<String>,
    #[serde(default)]
    pub numero_issue: Option<String>,
    #[serde(default)]
    pub paginas: Option<String>,
    #[serde(default)]
    pub dominio_origen: Option<String>,
    #[serde(default)]
    pub pure_uuid: Option<String>,
    #[serde(default)]
    pub estado_publicacion: Option<String>,
    #[serde(default)]
    pub id_proyecto: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePublicacionRequest {
    pub titulo: Option<String>,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: Option<String>,
    pub resumen: Option<String>,
    pub palabras_clave: Option<Vec<String>>,
    // ---- Campos N2-F ----
    #[serde(default)]
    pub handle_url: Option<String>,
    #[serde(default)]
    pub fecha_publicacion: Option<i64>,
    #[serde(default)]
    pub editorial: Option<String>,
    #[serde(default)]
    pub id_org_unit_editora: Option<String>,
    #[serde(default)]
    pub revista_titulo: Option<String>,
    #[serde(default)]
    pub isbn: Option<String>,
    #[serde(default)]
    pub scimago_cuartil: Option<String>,
    #[serde(default)]
    pub wos_cuartil: Option<String>,
    #[serde(default)]
    pub es_revisado_por_pares: Option<bool>,
    #[serde(default)]
    pub acceso_abierto: Option<String>,
    #[serde(default)]
    pub idioma: Option<String>,
    #[serde(default)]
    pub volumen: Option<String>,
    #[serde(default)]
    pub numero_issue: Option<String>,
    #[serde(default)]
    pub paginas: Option<String>,
    #[serde(default)]
    pub dominio_origen: Option<String>,
    #[serde(default)]
    pub pure_uuid: Option<String>,
    #[serde(default)]
    pub estado_publicacion: Option<String>,
    #[serde(default)]
    pub id_proyecto: Option<String>,
    #[serde(default)]
    pub perucris_uuid: Option<String>,
}
