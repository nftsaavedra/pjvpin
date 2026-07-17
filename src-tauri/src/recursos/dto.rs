use serde::{Deserialize, Serialize};

fn default_activo() -> i64 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatenteDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_patente: String,
    #[serde(default)]
    pub proyecto_id: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
    pub titulo: String,
    #[serde(default)]
    pub numero_patente: Option<String>,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub estado: Option<String>,
    #[serde(default)]
    pub fecha_solicitud: Option<i64>,
    #[serde(default)]
    pub fecha_concesion: Option<i64>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub entidad_concedente: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePatenteRequest {
    #[serde(default)]
    pub proyecto_id: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
    pub titulo: String,
    #[serde(default)]
    pub numero_patente: Option<String>,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub estado: Option<String>,
    #[serde(default)]
    pub fecha_solicitud: Option<i64>,
    #[serde(default)]
    pub fecha_concesion: Option<i64>,
    #[serde(default)]
    pub pais: Option<String>,
    #[serde(default)]
    pub entidad_concedente: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatenteRequest {
    pub titulo: Option<String>,
    pub numero_patente: Option<String>,
    pub tipo: Option<String>,
    pub estado: Option<String>,
    pub fecha_solicitud: Option<i64>,
    pub fecha_concesion: Option<i64>,
    pub pais: Option<String>,
    pub entidad_concedente: Option<String>,
    pub descripcion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductoDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_producto: String,
    #[serde(default)]
    pub proyecto_id: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
    pub nombre: String,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub etapa: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub fecha_registro: Option<i64>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductoRequest {
    #[serde(default)]
    pub proyecto_id: Option<String>,
    #[serde(default)]
    pub investigador_id: Option<String>,
    pub nombre: String,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub etapa: Option<String>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub fecha_registro: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductoRequest {
    pub nombre: Option<String>,
    pub tipo: Option<String>,
    pub etapa: Option<String>,
    pub descripcion: Option<String>,
    pub fecha_registro: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipamientoDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_equipamiento: String,
    #[serde(default)]
    pub proyecto_id: Option<String>,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub especificaciones: Option<String>,
    #[serde(default)]
    pub valor_estimado: Option<f64>,
    #[serde(default)]
    pub moneda: Option<String>,
    #[serde(default)]
    pub proveedor: Option<String>,
    #[serde(default)]
    pub fecha_adquisicion: Option<i64>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateEquipamientoRequest {
    #[serde(default)]
    pub proyecto_id: Option<String>,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub especificaciones: Option<String>,
    #[serde(default)]
    pub valor_estimado: Option<f64>,
    #[serde(default)]
    pub moneda: Option<String>,
    #[serde(default)]
    pub proveedor: Option<String>,
    #[serde(default)]
    pub fecha_adquisicion: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateEquipamientoRequest {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub especificaciones: Option<String>,
    pub valor_estimado: Option<f64>,
    pub moneda: Option<String>,
    pub proveedor: Option<String>,
    pub fecha_adquisicion: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanciamientoDto {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_financiamiento: String,
    #[serde(default)]
    pub proyecto_id: Option<String>,
    pub entidad_financiadora: String,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub monto: Option<f64>,
    #[serde(default)]
    pub moneda: Option<String>,
    #[serde(default)]
    pub fecha_inicio: Option<i64>,
    #[serde(default)]
    pub fecha_fin: Option<i64>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub estado_financiero: Option<String>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default = "default_activo")]
    pub activo: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateFinanciamientoRequest {
    #[serde(default)]
    pub proyecto_id: Option<String>,
    pub entidad_financiadora: String,
    #[serde(default)]
    pub tipo: Option<String>,
    #[serde(default)]
    pub monto: Option<f64>,
    #[serde(default)]
    pub moneda: Option<String>,
    #[serde(default)]
    pub fecha_inicio: Option<i64>,
    #[serde(default)]
    pub fecha_fin: Option<i64>,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub estado_financiero: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFinanciamientoRequest {
    pub entidad_financiadora: Option<String>,
    pub tipo: Option<String>,
    pub monto: Option<f64>,
    pub moneda: Option<String>,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub descripcion: Option<String>,
    pub estado_financiero: Option<String>,
}
