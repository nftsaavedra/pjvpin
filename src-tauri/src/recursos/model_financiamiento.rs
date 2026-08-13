use crate::recursos::dto::{CreateFinanciamientoRequest, FinanciamientoDto};
use crate::shared::error::AppError;
use crate::shared::vocab_mapper::is_iso_4217;

#[derive(Debug, Clone)]
pub struct Financiamiento {
    pub id: String,
    pub id_financiamiento: String,
    /// Codigo institucional/resolucion del fondo. UNIQUE en BD.
    pub codigo: Option<String>,
    /// Nombre/denominacion oficial del fondo.
    pub nombre: Option<String>,
    /// Modalidad del fondo (FK vocab `concytec_terminos`, ej: I+D+i, Equipamiento).
    pub modalidad: Option<String>,
    /// FK org_units -- entidad financiadora como organizacion CERIF.
    pub id_org_unit_financiadora: Option<String>,
    /// FK self-ref -- jerarquia (programa marco -> subvencion hija).
    pub parent_id: Option<String>,
    /// Fase N1-B (N1-B): vinculacion directa legacy con proyecto. El
    /// pivot `proyecto_financiamientos` (N2-C) absorbe este vinculo
    /// N:M; este campo se conserva durante la transicion (D10 modulo).
    pub proyecto_id: Option<String>,
    /// Legacy: nombre textual de la entidad financiadora (compat).
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
        let codigo = request
            .codigo
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if codigo.is_none() {
            return Err(AppError::InternalError(
                "El codigo del financiamiento es obligatorio.".to_string(),
            ));
        }
        let nombre = request
            .nombre
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        // Validar fechas: fin >= inicio cuando ambos presentes.
        if let (Some(ini), Some(fin)) = (request.fecha_inicio, request.fecha_fin) {
            if fin < ini {
                return Err(AppError::InternalError(format!(
                    "La fecha de fin ({fin}) debe ser >= a la fecha de inicio ({ini})."
                )));
            }
        }
        // Validar moneda ISO4217 si presente.
        if let Some(ref m) = request.moneda {
            if !is_iso_4217(m.trim()) {
                return Err(AppError::InternalError(format!(
                    "La moneda '{m}' no es un codigo ISO 4217 valido (3 letras ASCII uppercase)."
                )));
            }
        }
        // Validar parent_id != self.
        let parent_id = request.parent_id.and_then(|p| {
            let t = p.trim();
            if t.is_empty() {
                None
            } else {
                Some(t.to_string())
            }
        });
        if let Some(p) = parent_id.as_ref() {
            if *p == id_financiamiento {
                return Err(AppError::InternalError(
                    "Un financiamiento no puede ser su propio padre.".to_string(),
                ));
            }
        }

        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_financiamiento.clone(),
            id_financiamiento,
            codigo,
            nombre,
            modalidad: request.modalidad.and_then(|m| {
                let t = m.trim();
                if t.is_empty() {
                    None
                } else {
                    Some(t.to_string())
                }
            }),
            id_org_unit_financiadora: request.id_org_unit_financiadora.and_then(|s| {
                let t = s.trim();
                if t.is_empty() {
                    None
                } else {
                    Some(t.to_string())
                }
            }),
            parent_id,
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
            codigo: m.codigo,
            nombre: m.nombre,
            modalidad: m.modalidad,
            id_org_unit_financiadora: m.id_org_unit_financiadora,
            parent_id: m.parent_id,
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
            codigo: m.codigo.clone(),
            nombre: m.nombre.clone(),
            modalidad: m.modalidad.clone(),
            id_org_unit_financiadora: m.id_org_unit_financiadora.clone(),
            parent_id: m.parent_id.clone(),
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
            codigo: d.codigo,
            nombre: d.nombre,
            modalidad: d.modalidad,
            id_org_unit_financiadora: d.id_org_unit_financiadora,
            parent_id: d.parent_id,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn req_min_codigo(
        codigo: &str,
        fecha_inicio: Option<i64>,
        fecha_fin: Option<i64>,
    ) -> CreateFinanciamientoRequest {
        CreateFinanciamientoRequest {
            codigo: Some(codigo.to_string()),
            nombre: Some("Convenio 001".to_string()),
            modalidad: Some("modalidad_i+d".to_string()),
            id_org_unit_financiadora: Some("org-funder".to_string()),
            parent_id: None,
            proyecto_id: None,
            entidad_financiadora: "CONCYTEC".to_string(),
            tipo: Some("concursable".to_string()),
            monto: Some(50_000.0),
            moneda: Some("PEN".to_string()),
            fecha_inicio,
            fecha_fin,
            descripcion: Some("Financiamiento para I+D".to_string()),
            estado_financiero: Some("aprobado".to_string()),
        }
    }

    #[test]
    fn new_accepts_valid() {
        let f = Financiamiento::new("fin-1".to_string(), req_min_codigo("FIN-001", None, None))
            .unwrap();
        assert_eq!(f.codigo.as_deref(), Some("FIN-001"));
        assert_eq!(f.id_org_unit_financiadora.as_deref(), Some("org-funder"));
        assert_eq!(f.moneda.as_deref(), Some("PEN"));
        assert!(f.parent_id.is_none());
    }

    #[test]
    fn empty_codigo_rejected() {
        assert!(Financiamiento::new("fin-1".to_string(), req_min_codigo("", None, None)).is_err());
        assert!(
            Financiamiento::new("fin-1".to_string(), req_min_codigo("   ", None, None)).is_err()
        );
    }

    #[test]
    fn fecha_fin_menor_inicio_rejected() {
        let req = req_min_codigo("FIN-X", Some(2_000), Some(1_000));
        assert!(Financiamiento::new("fin-1".to_string(), req).is_err());
    }

    #[test]
    fn fecha_fin_igual_inicio_acepta() {
        let req = req_min_codigo("FIN-Y", Some(1_000), Some(1_000));
        assert!(Financiamiento::new("fin-1".to_string(), req).is_ok());
    }

    #[test]
    fn moneda_invalida_rejected() {
        let mut req = req_min_codigo("FIN-Z", None, None);
        req.moneda = Some("pen".to_string());
        assert!(Financiamiento::new("fin-1".to_string(), req).is_err());
        let mut req = req_min_codigo("FIN-Z", None, None);
        req.moneda = Some("PESO".to_string());
        assert!(Financiamiento::new("fin-1".to_string(), req).is_err());
    }

    #[test]
    fn self_parent_rejected() {
        let mut req = req_min_codigo("FIN-W", None, None);
        req.parent_id = Some("self-id".to_string());
        assert!(Financiamiento::new("self-id".to_string(), req).is_err());
    }
}
