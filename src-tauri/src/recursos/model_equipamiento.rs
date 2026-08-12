use crate::recursos::dto::{CreateEquipamientoRequest, EquipamientoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct Equipamiento {
    pub id: String,
    pub id_equipamiento: String,
    pub proyecto_id: Option<String>,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub especificaciones: Option<String>,
    pub valor_estimado: Option<f64>,
    pub moneda: Option<String>,
    pub proveedor: Option<String>,
    pub fecha_adquisicion: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Equipamiento {
    pub fn new(
        id_equipamiento: String,
        request: CreateEquipamientoRequest,
    ) -> Result<Self, AppError> {
        if id_equipamiento.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de equipamiento no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del equipamiento es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_equipamiento.clone(),
            id_equipamiento,
            proyecto_id: request.proyecto_id,
            nombre: request.nombre,
            descripcion: request.descripcion,
            especificaciones: request.especificaciones,
            valor_estimado: request.valor_estimado,
            moneda: request.moneda,
            proveedor: request.proveedor,
            fecha_adquisicion: request.fecha_adquisicion,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Equipamiento> for EquipamientoDto {
    fn from(m: Equipamiento) -> Self {
        Self {
            id: m.id,
            id_equipamiento: m.id_equipamiento,
            proyecto_id: m.proyecto_id,
            nombre: m.nombre,
            descripcion: m.descripcion,
            especificaciones: m.especificaciones,
            valor_estimado: m.valor_estimado,
            moneda: m.moneda,
            proveedor: m.proveedor,
            fecha_adquisicion: m.fecha_adquisicion,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Equipamiento> for EquipamientoDto {
    fn from(m: &Equipamiento) -> Self {
        Self {
            id: m.id.clone(),
            id_equipamiento: m.id_equipamiento.clone(),
            proyecto_id: m.proyecto_id.clone(),
            nombre: m.nombre.clone(),
            descripcion: m.descripcion.clone(),
            especificaciones: m.especificaciones.clone(),
            valor_estimado: m.valor_estimado,
            moneda: m.moneda.clone(),
            proveedor: m.proveedor.clone(),
            fecha_adquisicion: m.fecha_adquisicion,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<EquipamientoDto> for Equipamiento {
    type Error = crate::shared::error::AppError;
    fn try_from(d: EquipamientoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_equipamiento: d.id_equipamiento,
            proyecto_id: d.proyecto_id,
            nombre: d.nombre,
            descripcion: d.descripcion,
            especificaciones: d.especificaciones,
            valor_estimado: d.valor_estimado,
            moneda: d.moneda,
            proveedor: d.proveedor,
            fecha_adquisicion: d.fecha_adquisicion,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}
