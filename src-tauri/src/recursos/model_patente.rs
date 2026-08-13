use crate::recursos::dto::{CreatePatenteRequest, PatenteDto};
use crate::shared::error::AppError;
use crate::shared::vocab_mapper::PATENTES_TIPOS_VALIDOS;

#[derive(Debug, Clone, Default)]
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

    // ---- Extension N2-G (alineamiento CONCYTEC) ----
    /// Clasificacion IPC (International Patent Classification).
    pub clasificacion_ipc: Option<String>,
    /// FK opcional a `org_units` (entidad que concede la patente).
    pub id_org_unit_concedente: Option<String>,
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
        let tipo_trim = request
            .tipo
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if let Some(ref t) = tipo_trim {
            if !PATENTES_TIPOS_VALIDOS.iter().any(|p| *p == t) {
                return Err(AppError::InternalError(format!(
                    "El tipo de patente '{}' no esta en los tipos validos ({}).",
                    t,
                    PATENTES_TIPOS_VALIDOS.join(", ")
                )));
            }
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_patente.clone(),
            id_patente,
            proyecto_id: request.proyecto_id,
            investigador_id: request.investigador_id,
            titulo: request.titulo,
            numero_patente: trim_some(request.numero_patente),
            tipo: tipo_trim,
            estado: trim_some(request.estado),
            fecha_solicitud: request.fecha_solicitud,
            fecha_concesion: request.fecha_concesion,
            pais: trim_some(request.pais),
            entidad_concedente: trim_some(request.entidad_concedente),
            descripcion: request.descripcion,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
            clasificacion_ipc: trim_some(request.clasificacion_ipc),
            id_org_unit_concedente: trim_some(request.id_org_unit_concedente),
        })
    }
}

fn trim_some(opt: Option<String>) -> Option<String> {
    opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
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
            clasificacion_ipc: m.clasificacion_ipc,
            id_org_unit_concedente: m.id_org_unit_concedente,
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
            clasificacion_ipc: m.clasificacion_ipc.clone(),
            id_org_unit_concedente: m.id_org_unit_concedente.clone(),
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
            clasificacion_ipc: d.clasificacion_ipc,
            id_org_unit_concedente: d.id_org_unit_concedente,
        })
    }
}

#[cfg(test)]
mod tests_n2g {
    use super::*;
    use crate::recursos::dto::CreatePatenteRequest;

    fn req_base() -> CreatePatenteRequest {
        CreatePatenteRequest {
            proyecto_id: Some("p-1".to_string()),
            investigador_id: Some("inv-1".to_string()),
            titulo: "Sistema X".to_string(),
            numero_patente: Some("  PE-001-2024  ".to_string()),
            tipo: Some("invencion".to_string()),
            estado: Some("concedida".to_string()),
            fecha_solicitud: Some(1_700_000_000_000),
            fecha_concesion: Some(1_700_500_000_000),
            pais: Some("PE".to_string()),
            entidad_concedente: Some("INDECOPI".to_string()),
            descripcion: Some("Una invención".to_string()),
            clasificacion_ipc: Some("A01B 1/00".to_string()),
            id_org_unit_concedente: Some("org-indecopi".to_string()),
        }
    }

    #[test]
    fn new_acepta_campos_nuevos() {
        let p = Patente::new("pat-1".to_string(), req_base()).unwrap();
        assert_eq!(p.numero_patente.as_deref(), Some("PE-001-2024"));
        assert_eq!(p.clasificacion_ipc.as_deref(), Some("A01B 1/00"));
        assert_eq!(p.id_org_unit_concedente.as_deref(), Some("org-indecopi"));
        assert_eq!(p.tipo.as_deref(), Some("invencion"));
    }

    #[test]
    fn new_trim_a_none_si_vacio() {
        let mut r = req_base();
        r.numero_patente = Some("   ".to_string());
        r.clasificacion_ipc = Some("".to_string());
        let p = Patente::new("pat-1".to_string(), r).unwrap();
        assert!(p.numero_patente.is_none());
        assert!(p.clasificacion_ipc.is_none());
    }

    #[test]
    fn new_rechaza_tipo_invalido() {
        let mut r = req_base();
        r.tipo = Some("marca_registrada".to_string());
        let err = Patente::new("pat-1".to_string(), r).expect_err("tipo invalido");
        match err {
            AppError::InternalError(m) => assert!(m.contains("tipo")),
            other => panic!("esperaba InternalError, got {other:?}"),
        }
    }

    #[test]
    fn new_acepta_los_3_tipos_canonicos() {
        for t in PATENTES_TIPOS_VALIDOS {
            let mut r = req_base();
            r.tipo = Some(t.to_string());
            let p = Patente::new("pat-1".to_string(), r)
                .unwrap_or_else(|e| panic!("tipo {t} rechazado: {e:?}"));
            assert_eq!(p.tipo.as_deref(), Some(*t));
        }
    }

    #[test]
    fn new_acepta_sin_tipo() {
        let mut r = req_base();
        r.tipo = None;
        let p = Patente::new("pat-1".to_string(), r).unwrap();
        assert!(p.tipo.is_none());
    }

    #[test]
    fn new_rechaza_id_vacio() {
        let r = req_base();
        let err = Patente::new("  ".to_string(), r).expect_err("id vacio");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_rechaza_titulo_vacio() {
        let mut r = req_base();
        r.titulo = "   ".to_string();
        let err = Patente::new("pat-1".to_string(), r).expect_err("titulo vacio");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn dto_round_trip() {
        let p = Patente::new("pat-1".to_string(), req_base()).unwrap();
        let d: PatenteDto = (&p).into();
        let r = Patente::try_from(d).unwrap();
        assert_eq!(r.clasificacion_ipc, p.clasificacion_ipc);
        assert_eq!(r.id_org_unit_concedente, p.id_org_unit_concedente);
    }
}
