use crate::recursos::dto::{CreateFinanciamientoRequest, FinanciamientoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct Financiamiento {
    pub id: String,
    pub id_financiamiento: String,
    pub proyecto_id: Option<String>,
    pub entidad_financiadora: String,
    pub tipo: Option<String>,
    pub monto: Option<f64>,
    pub moneda: Option<String>,
    pub fecha_inicio: Option<i64>,
    pub fecha_fin: Option<i64>,
    pub descripcion: Option<String>,
    pub estado_financiero: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Financiamiento {
    pub fn new(
        id_financiamiento: String,
        request: CreateFinanciamientoRequest,
    ) -> Result<Self, AppError> {
        if id_financiamiento.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de financiamiento no puede estar vacio.".to_string(),
            ));
        }
        if request.entidad_financiadora.trim().is_empty() {
            return Err(AppError::InternalError(
                "La entidad financiadora es obligatoria.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_financiamiento.clone(),
            id_financiamiento,
            proyecto_id: request.proyecto_id,
            entidad_financiadora: request.entidad_financiadora,
            tipo: request.tipo,
            monto: request.monto,
            moneda: request.moneda,
            fecha_inicio: request.fecha_inicio,
            fecha_fin: request.fecha_fin,
            descripcion: request.descripcion,
            estado_financiero: request.estado_financiero,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Financiamiento> for FinanciamientoDto {
    fn from(m: Financiamiento) -> Self {
        Self {
            id: m.id,
            id_financiamiento: m.id_financiamiento,
            proyecto_id: m.proyecto_id,
            entidad_financiadora: m.entidad_financiadora,
            tipo: m.tipo,
            monto: m.monto,
            moneda: m.moneda,
            fecha_inicio: m.fecha_inicio,
            fecha_fin: m.fecha_fin,
            descripcion: m.descripcion,
            estado_financiero: m.estado_financiero,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Financiamiento> for FinanciamientoDto {
    fn from(m: &Financiamiento) -> Self {
        Self {
            id: m.id.clone(),
            id_financiamiento: m.id_financiamiento.clone(),
            proyecto_id: m.proyecto_id.clone(),
            entidad_financiadora: m.entidad_financiadora.clone(),
            tipo: m.tipo.clone(),
            monto: m.monto,
            moneda: m.moneda.clone(),
            fecha_inicio: m.fecha_inicio,
            fecha_fin: m.fecha_fin,
            descripcion: m.descripcion.clone(),
            estado_financiero: m.estado_financiero.clone(),
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<FinanciamientoDto> for Financiamiento {
    type Error = crate::shared::error::AppError;
    fn try_from(d: FinanciamientoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_financiamiento: d.id_financiamiento,
            proyecto_id: d.proyecto_id,
            entidad_financiadora: d.entidad_financiadora,
            tipo: d.tipo,
            monto: d.monto,
            moneda: d.moneda,
            fecha_inicio: d.fecha_inicio,
            fecha_fin: d.fecha_fin,
            descripcion: d.descripcion,
            estado_financiero: d.estado_financiero,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}
