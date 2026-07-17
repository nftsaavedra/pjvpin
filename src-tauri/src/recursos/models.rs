use crate::recursos::dto::{
    CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
    CreateProductoRequest, EquipamientoDto, FinanciamientoDto, PatenteDto, ProductoDto,
};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct Patente {
    pub id: String,
    pub id_patente: String,
    pub proyecto_id: Option<String>,
    pub investigador_id: Option<String>,
    pub titulo: String,
    pub numero_patente: Option<String>,
    pub tipo: Option<String>,
    pub estado: Option<String>,
    pub fecha_solicitud: Option<i64>,
    pub fecha_concesion: Option<i64>,
    pub pais: Option<String>,
    pub entidad_concedente: Option<String>,
    pub descripcion: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Patente {
    pub fn new(id_patente: String, request: CreatePatenteRequest) -> Result<Self, AppError> {
        if id_patente.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de patente no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El título de la patente es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_patente.clone(),
            id_patente,
            proyecto_id: request.proyecto_id,
            investigador_id: request.investigador_id,
            titulo: request.titulo,
            numero_patente: request.numero_patente,
            tipo: request.tipo,
            estado: request.estado,
            fecha_solicitud: request.fecha_solicitud,
            fecha_concesion: request.fecha_concesion,
            pais: request.pais,
            entidad_concedente: request.entidad_concedente,
            descripcion: request.descripcion,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Patente> for PatenteDto {
    fn from(m: Patente) -> Self {
        Self {
            id: m.id,
            id_patente: m.id_patente,
            proyecto_id: m.proyecto_id,
            investigador_id: m.investigador_id,
            titulo: m.titulo,
            numero_patente: m.numero_patente,
            tipo: m.tipo,
            estado: m.estado,
            fecha_solicitud: m.fecha_solicitud,
            fecha_concesion: m.fecha_concesion,
            pais: m.pais,
            entidad_concedente: m.entidad_concedente,
            descripcion: m.descripcion,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Patente> for PatenteDto {
    fn from(m: &Patente) -> Self {
        Self {
            id: m.id.clone(),
            id_patente: m.id_patente.clone(),
            proyecto_id: m.proyecto_id.clone(),
            investigador_id: m.investigador_id.clone(),
            titulo: m.titulo.clone(),
            numero_patente: m.numero_patente.clone(),
            tipo: m.tipo.clone(),
            estado: m.estado.clone(),
            fecha_solicitud: m.fecha_solicitud,
            fecha_concesion: m.fecha_concesion,
            pais: m.pais.clone(),
            entidad_concedente: m.entidad_concedente.clone(),
            descripcion: m.descripcion.clone(),
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<PatenteDto> for Patente {
    type Error = crate::shared::error::AppError;
    fn try_from(d: PatenteDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_patente: d.id_patente,
            proyecto_id: d.proyecto_id,
            investigador_id: d.investigador_id,
            titulo: d.titulo,
            numero_patente: d.numero_patente,
            tipo: d.tipo,
            estado: d.estado,
            fecha_solicitud: d.fecha_solicitud,
            fecha_concesion: d.fecha_concesion,
            pais: d.pais,
            entidad_concedente: d.entidad_concedente,
            descripcion: d.descripcion,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}

#[derive(Debug, Clone)]
pub struct Producto {
    pub id: String,
    pub id_producto: String,
    pub proyecto_id: Option<String>,
    pub investigador_id: Option<String>,
    pub nombre: String,
    pub tipo: Option<String>,
    pub etapa: Option<String>,
    pub descripcion: Option<String>,
    pub fecha_registro: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,
}

impl Producto {
    pub fn new(id_producto: String, request: CreateProductoRequest) -> Result<Self, AppError> {
        if id_producto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de producto no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del producto es obligatorio.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_producto.clone(),
            id_producto,
            proyecto_id: request.proyecto_id,
            investigador_id: request.investigador_id,
            nombre: request.nombre,
            tipo: request.tipo,
            etapa: request.etapa,
            descripcion: request.descripcion,
            fecha_registro: request.fecha_registro,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
        })
    }
}

impl From<Producto> for ProductoDto {
    fn from(m: Producto) -> Self {
        Self {
            id: m.id,
            id_producto: m.id_producto,
            proyecto_id: m.proyecto_id,
            investigador_id: m.investigador_id,
            nombre: m.nombre,
            tipo: m.tipo,
            etapa: m.etapa,
            descripcion: m.descripcion,
            fecha_registro: m.fecha_registro,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl From<&Producto> for ProductoDto {
    fn from(m: &Producto) -> Self {
        Self {
            id: m.id.clone(),
            id_producto: m.id_producto.clone(),
            proyecto_id: m.proyecto_id.clone(),
            investigador_id: m.investigador_id.clone(),
            nombre: m.nombre.clone(),
            tipo: m.tipo.clone(),
            etapa: m.etapa.clone(),
            descripcion: m.descripcion.clone(),
            fecha_registro: m.fecha_registro,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
        }
    }
}

impl TryFrom<ProductoDto> for Producto {
    type Error = crate::shared::error::AppError;
    fn try_from(d: ProductoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: d.id,
            id_producto: d.id_producto,
            proyecto_id: d.proyecto_id,
            investigador_id: d.investigador_id,
            nombre: d.nombre,
            tipo: d.tipo,
            etapa: d.etapa,
            descripcion: d.descripcion,
            fecha_registro: d.fecha_registro,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
        })
    }
}

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
