use crate::recursos::dto::{CreateEquipamientoRequest, EquipamientoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone, Default)]
pub struct Equipamiento {
    pub id: String,
    pub id_equipamiento: String,
    /// Legacy (v0.1.0-alpha): FK opcional a proyecto. Conservado para
    /// compatibilidad con consumers existentes. La fase N2 no migra este
    /// campo a un pivot `proyecto_equipamientos` (se mantiene como
    /// `Option<String>` simple).
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
    // ---- Extension N2-E (alineamiento CONCYTEC) ----
    /// Codigo institucional UNIQUE (sparse). Si lo emite el area de
    /// patrimonio, tambien debe ser UNIQUE en BD.
    pub codigo_institucional: Option<String>,
    /// FK al vocabulario `concytec_equipamiento` (registro validado por
    /// `shared::refs::ensure_vocab_active`).
    pub tipo_equipamiento: Option<String>,
    /// FK al vocabulario `concytec_uso_equipamiento`.
    pub uso_equipamiento: Option<String>,
    /// FK opcional a `org_units` (unidad organizativa propietaria).
    pub id_org_unit_propietaria: Option<String>,
    /// FK opcional a `financiamientos` (como se financio el equipamiento).
    pub id_financiamiento: Option<String>,
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
        let codigo_institucional = trim_some(request.codigo_institucional);
        let tipo_equipamiento = trim_some(request.tipo_equipamiento);
        let uso_equipamiento = trim_some(request.uso_equipamiento);
        let id_org_unit_propietaria = trim_some(request.id_org_unit_propietaria);
        let id_financiamiento = trim_some(request.id_financiamiento);
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
            codigo_institucional,
            tipo_equipamiento,
            uso_equipamiento,
            id_org_unit_propietaria,
            id_financiamiento,
        })
    }
}

fn trim_some(opt: Option<String>) -> Option<String> {
    opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
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
            codigo_institucional: m.codigo_institucional,
            tipo_equipamiento: m.tipo_equipamiento,
            uso_equipamiento: m.uso_equipamiento,
            id_org_unit_propietaria: m.id_org_unit_propietaria,
            id_financiamiento: m.id_financiamiento,
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
            codigo_institucional: m.codigo_institucional.clone(),
            tipo_equipamiento: m.tipo_equipamiento.clone(),
            uso_equipamiento: m.uso_equipamiento.clone(),
            id_org_unit_propietaria: m.id_org_unit_propietaria.clone(),
            id_financiamiento: m.id_financiamiento.clone(),
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
            codigo_institucional: d.codigo_institucional,
            tipo_equipamiento: d.tipo_equipamiento,
            uso_equipamiento: d.uso_equipamiento,
            id_org_unit_propietaria: d.id_org_unit_propietaria,
            id_financiamiento: d.id_financiamiento,
        })
    }
}

#[cfg(test)]
mod tests_n2e {
    use super::*;
    use crate::recursos::dto::CreateEquipamientoRequest;

    fn req_base() -> CreateEquipamientoRequest {
        CreateEquipamientoRequest {
            proyecto_id: Some("p-1".to_string()),
            nombre: "Microscopio".to_string(),
            descripcion: Some("Optico".to_string()),
            especificaciones: None,
            valor_estimado: Some(5000.0),
            moneda: Some("PEN".to_string()),
            proveedor: Some("Carl Zeiss".to_string()),
            fecha_adquisicion: Some(1_700_000_000_000),
            codigo_institucional: Some("  EQ-001  ".to_string()),
            tipo_equipamiento: Some("microscopio_optico".to_string()),
            uso_equipamiento: Some("docencia".to_string()),
            id_org_unit_propietaria: Some("org-1".to_string()),
            id_financiamiento: Some("fin-1".to_string()),
        }
    }

    #[test]
    fn new_acepta_campos_nuevos() {
        let e = Equipamiento::new("eq-1".to_string(), req_base()).unwrap();
        assert_eq!(e.codigo_institucional.as_deref(), Some("EQ-001"));
        assert_eq!(e.tipo_equipamiento.as_deref(), Some("microscopio_optico"));
        assert_eq!(e.uso_equipamiento.as_deref(), Some("docencia"));
        assert_eq!(e.id_org_unit_propietaria.as_deref(), Some("org-1"));
        assert_eq!(e.id_financiamiento.as_deref(), Some("fin-1"));
    }

    #[test]
    fn new_trim_a_none_si_vacio() {
        let mut r = req_base();
        r.codigo_institucional = Some("   ".to_string());
        r.tipo_equipamiento = Some("".to_string());
        let e = Equipamiento::new("eq-1".to_string(), r).unwrap();
        assert!(e.codigo_institucional.is_none());
        assert!(e.tipo_equipamiento.is_none());
    }

    #[test]
    fn new_acepta_legacy_sin_campos_nuevos() {
        let r = CreateEquipamientoRequest {
            proyecto_id: None,
            nombre: "Cosa".to_string(),
            descripcion: None,
            especificaciones: None,
            valor_estimado: None,
            moneda: None,
            proveedor: None,
            fecha_adquisicion: None,
            codigo_institucional: None,
            tipo_equipamiento: None,
            uso_equipamiento: None,
            id_org_unit_propietaria: None,
            id_financiamiento: None,
        };
        let e = Equipamiento::new("eq-1".to_string(), r).unwrap();
        assert!(e.codigo_institucional.is_none());
        assert!(e.tipo_equipamiento.is_none());
    }

    #[test]
    fn dto_round_trip() {
        let e = Equipamiento::new("eq-1".to_string(), req_base()).unwrap();
        let d: EquipamientoDto = (&e).into();
        let r = Equipamiento::try_from(d).unwrap();
        assert_eq!(r.codigo_institucional, e.codigo_institucional);
        assert_eq!(r.tipo_equipamiento, e.tipo_equipamiento);
        assert_eq!(r.uso_equipamiento, e.uso_equipamiento);
        assert_eq!(r.id_org_unit_propietaria, e.id_org_unit_propietaria);
        assert_eq!(r.id_financiamiento, e.id_financiamiento);
    }
}
