use crate::catalogos::dto::{CatalogoItemDoc, CatalogoItemDto, CreateCatalogoRequest};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct CatalogoItem {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub orden: Option<i32>,
    pub activo: i64,
    pub created_at: i64,
    pub updated_at: Option<i64>,

    // ---- Extension SKOS (D11/Fase N0-C) ----
    /// Vocabulario CONCYTEC al que pertenece el item (`ocde_ford`,
    /// `concytec_terminos`, etc.). None para los catalogos internos
    /// legacy (tipo_patente, moneda, etc.).
    pub esquema: Option<String>,
    /// Codigo SKOS notation tal como aparece en el vocabulario oficial
    /// (ej: `1.1`, `2.10.02`). Para catalogos internos = mismo que `codigo`.
    pub codigo_skos: Option<String>,
    /// Padre SKOS (broader). Construye la jerarquia dentro de un esquema.
    /// Ej: `2.10` es padre de `2.10.02` en `ocde_ford`.
    pub padre_codigo: Option<String>,
    /// Nivel de profundidad (1=dominio mayor, 2=subcampo, 3=rama).
    pub nivel: Option<i32>,
    /// Etiquetas alternativas (altLabels). JSON-style string o None.
    pub etiquetas: Option<Vec<String>>,
    /// 1 si el item puede ser editado por el usuario; 0 si es oficial
    /// CONCYTEC (bloqueado a reimports).
    pub editable: i64,
}

impl CatalogoItem {
    pub fn new(id_catalogo: String, request: CreateCatalogoRequest) -> Result<Self, AppError> {
        if id_catalogo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de catálogo no puede estar vacio.".to_string(),
            ));
        }
        if request.tipo.trim().is_empty() || request.codigo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El tipo y código del catálogo no pueden estar vacios.".to_string(),
            ));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id_catalogo,
            tipo: request.tipo,
            codigo: request.codigo,
            nombre: request.nombre,
            descripcion: request.descripcion,
            orden: request.orden,
            activo: 1,
            created_at: now,
            updated_at: Some(now),
            esquema: request.esquema,
            codigo_skos: request.codigo_skos,
            padre_codigo: request.padre_codigo,
            nivel: request.nivel,
            etiquetas: request.etiquetas,
            editable: if request.editable { 1 } else { 0 },
        })
    }
}

impl From<CatalogoItemDoc> for CatalogoItem {
    fn from(doc: CatalogoItemDoc) -> Self {
        Self {
            id_catalogo: doc.id_catalogo,
            tipo: doc.tipo,
            codigo: doc.codigo,
            nombre: doc.nombre,
            descripcion: doc.descripcion,
            orden: doc.orden,
            activo: doc.activo,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            esquema: doc.esquema,
            codigo_skos: doc.codigo_skos,
            padre_codigo: doc.padre_codigo,
            nivel: doc.nivel,
            etiquetas: doc.etiquetas,
            editable: doc.editable,
        }
    }
}

impl From<CatalogoItem> for CatalogoItemDoc {
    fn from(m: CatalogoItem) -> Self {
        Self {
            id_catalogo: m.id_catalogo,
            tipo: m.tipo,
            codigo: m.codigo,
            nombre: m.nombre,
            descripcion: m.descripcion,
            orden: m.orden,
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
            esquema: m.esquema,
            codigo_skos: m.codigo_skos,
            padre_codigo: m.padre_codigo,
            nivel: m.nivel,
            etiquetas: m.etiquetas,
            editable: m.editable,
        }
    }
}

impl From<CatalogoItem> for CatalogoItemDto {
    fn from(m: CatalogoItem) -> Self {
        Self {
            id_catalogo: m.id_catalogo,
            tipo: m.tipo,
            codigo: m.codigo,
            nombre: m.nombre,
            descripcion: m.descripcion,
            orden: m.orden,
            activo: m.activo,
            updated_at: m.updated_at,
            esquema: m.esquema,
            codigo_skos: m.codigo_skos,
            padre_codigo: m.padre_codigo,
            nivel: m.nivel,
            editable: m.editable,
        }
    }
}
