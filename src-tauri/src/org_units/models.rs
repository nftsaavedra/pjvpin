//! Modelos de dominio de la feature `org_units`.
//!
//! Dominio puro: sin `serde`, sin `uuid`. Las invariantes se validan en
//! `new()`. La conversion a/desde BSON `Document` se hace en
//! `crate::org_units::repository` via `OrgUnitDoc`.

use crate::org_units::dto::CreateOrgUnitRequest;
use crate::shared::error::AppError;

/// Largo del RUC peruano (11 digitos).
pub const RUC_LEN: usize = 11;

#[derive(Debug, Clone)]
pub struct OrgUnit {
    pub id_org_unit: String,
    pub nombre: String,
    pub ubigeo_codigo: Option<String>,
    pub ruc: Option<String>,
    pub ror_id: Option<String>,
    pub isni_id: Option<String>,
    pub scopus_id: Option<String>,
    pub sector_institucional: Option<String>,
    pub tipo_organizacion: String,
    pub tipo_dependencia: Option<String>,
    pub tipo_educacion_superior: Option<String>,
    pub ciiu_codigo: Option<String>,
    pub es_publica: bool,
    pub parent_id: Option<String>,
    pub activo: i64,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

impl OrgUnit {
    pub fn new(id_org_unit: String, request: CreateOrgUnitRequest) -> Result<Self, AppError> {
        if id_org_unit.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de org_unit no puede estar vacio.".to_string(),
            ));
        }
        let nombre = request.nombre.trim().to_string();
        if nombre.is_empty() {
            return Err(AppError::InternalError(
                "El nombre de la unidad organizativa es obligatorio.".to_string(),
            ));
        }
        let tipo_organizacion = request.tipo_organizacion.trim().to_string();
        if tipo_organizacion.is_empty() {
            return Err(AppError::InternalError(
                "El tipo de organizacion es obligatorio (Universidad / Instituto de Investigacion)."
                    .to_string(),
            ));
        }
        // Validar RUC si presente.
        let ruc_normalizado = request
            .ruc
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if let Some(r) = ruc_normalizado.as_ref() {
            if r.len() != RUC_LEN || !r.chars().all(|c| c.is_ascii_digit()) {
                return Err(AppError::InternalError(format!(
                    "El RUC debe tener exactamente {RUC_LEN} digitos ASCII."
                )));
            }
        }
        // Reglas de integridad (matriz vs sub-unidad):
        //  - Si parent_id == None  => entidad matriz: debe tener al menos uno
        //    de los IDs requeridos (ruc, ror_id, isni_id).
        //  - Si parent_id != None  => sub-unidad: debe tener tipo_dependencia.
        let parent_id_normalizado = request
            .parent_id
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let es_matriz = parent_id_normalizado.is_none();
        if es_matriz {
            let tiene_id = request
                .ruc
                .as_ref()
                .map(|s| !s.trim().is_empty())
                .unwrap_or(false)
                || request
                    .ror_id
                    .as_ref()
                    .map(|s| !s.trim().is_empty())
                    .unwrap_or(false)
                || request
                    .isni_id
                    .as_ref()
                    .map(|s| !s.trim().is_empty())
                    .unwrap_or(false);
            if !tiene_id {
                return Err(AppError::InternalError(
                    "Una unidad matriz debe tener al menos un identificador institucional (RUC, ROR o ISNI)."
                        .to_string(),
                ));
            }
        } else {
            let tipo_dep = request
                .tipo_dependencia
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            if tipo_dep.is_none() {
                return Err(AppError::InternalError(
                    "Una sub-unidad (con parent_id) debe declarar tipo_dependencia (vocab concytec_tipo_subunidad)."
                        .to_string(),
                ));
            }
        }
        // No permitir parent_id == id.
        if let Some(p) = parent_id_normalizado.as_ref() {
            if *p == id_org_unit {
                return Err(AppError::InternalError(
                    "Una unidad no puede ser su propio padre.".to_string(),
                ));
            }
        }

        let now = crate::shared::time::now_ms();
        Ok(Self {
            id_org_unit,
            nombre,
            ubigeo_codigo: trim_or_none(request.ubigeo_codigo),
            ruc: ruc_normalizado,
            ror_id: trim_or_none(request.ror_id),
            isni_id: trim_or_none(request.isni_id),
            scopus_id: trim_or_none(request.scopus_id),
            sector_institucional: trim_or_none(request.sector_institucional),
            tipo_organizacion,
            tipo_dependencia: trim_or_none(request.tipo_dependencia),
            tipo_educacion_superior: trim_or_none(request.tipo_educacion_superior),
            ciiu_codigo: trim_or_none(request.ciiu_codigo),
            es_publica: request.es_publica,
            parent_id: parent_id_normalizado,
            activo: 1,
            created_at: Some(now),
            updated_at: Some(now),
        })
    }
}

fn trim_or_none(opt: Option<String>) -> Option<String> {
    opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req_matriz() -> CreateOrgUnitRequest {
        CreateOrgUnitRequest {
            nombre: "Universidad Nacional X".to_string(),
            ubigeo_codigo: Some("150101".to_string()),
            ruc: Some("20123456789".to_string()),
            ror_id: Some("00f7pqr54".to_string()),
            isni_id: None,
            scopus_id: None,
            sector_institucional: Some("educacion_superior".to_string()),
            tipo_organizacion: "tipo_org_universidad".to_string(),
            tipo_dependencia: None,
            tipo_educacion_superior: Some("universidad".to_string()),
            ciiu_codigo: None,
            es_publica: true,
            parent_id: None,
        }
    }

    fn req_subunidad() -> CreateOrgUnitRequest {
        CreateOrgUnitRequest {
            nombre: "Facultad de Ingenieria".to_string(),
            ubigeo_codigo: None,
            ruc: None,
            ror_id: None,
            isni_id: None,
            scopus_id: None,
            sector_institucional: None,
            tipo_organizacion: "tipo_org_universidad".to_string(),
            tipo_dependencia: Some("facultad".to_string()),
            tipo_educacion_superior: None,
            ciiu_codigo: None,
            es_publica: true,
            parent_id: Some("org-matriz".to_string()),
        }
    }

    #[test]
    fn matriz_con_ruc_es_valida() {
        let r = OrgUnit::new("org-m".to_string(), req_matriz()).unwrap();
        assert_eq!(r.ruc.as_deref(), Some("20123456789"));
        assert_eq!(r.es_publica, true);
        assert!(r.parent_id.is_none());
    }

    #[test]
    fn matriz_sin_id_falla() {
        let mut r = req_matriz();
        r.ruc = None;
        r.ror_id = None;
        r.isni_id = None;
        assert!(OrgUnit::new("org-m".to_string(), r).is_err());
    }

    #[test]
    fn matriz_con_ruc_invalido_falla() {
        let mut r = req_matriz();
        r.ruc = Some("123".to_string());
        assert!(OrgUnit::new("org-m".to_string(), r).is_err());
        let mut r2 = req_matriz();
        r2.ruc = Some("2012345678A".to_string());
        assert!(OrgUnit::new("org-m".to_string(), r2).is_err());
    }

    #[test]
    fn subunidad_con_tipo_dependencia_es_valida() {
        let r = OrgUnit::new("org-sub".to_string(), req_subunidad()).unwrap();
        assert_eq!(r.parent_id.as_deref(), Some("org-matriz"));
        assert_eq!(r.tipo_dependencia.as_deref(), Some("facultad"));
        assert!(r.ruc.is_none());
    }

    #[test]
    fn subunidad_sin_tipo_dependencia_falla() {
        let mut r = req_subunidad();
        r.tipo_dependencia = None;
        assert!(OrgUnit::new("org-sub".to_string(), r).is_err());
    }

    #[test]
    fn self_parent_rejected() {
        let mut r = req_subunidad();
        r.id_parent_too_self(); // see helper below
                                // Above helper is conceptual; we instead just set parent_id to self
                                // using a direct construction. Direct test:
        let mut r2 = req_subunidad();
        r2.parent_id = Some("org-self".to_string());
        let result = OrgUnit::new("org-self".to_string(), r2);
        assert!(result.is_err());
    }

    #[test]
    fn empty_nombre_rejected() {
        let mut r = req_matriz();
        r.nombre = "   ".to_string();
        assert!(OrgUnit::new("org-m".to_string(), r).is_err());
    }

    #[test]
    fn empty_tipo_organizacion_rejected() {
        let mut r = req_matriz();
        r.tipo_organizacion = "".to_string();
        assert!(OrgUnit::new("org-m".to_string(), r).is_err());
    }

    // Helper unused at runtime (prevents dead-code warning for self_parent test)
    impl CreateOrgUnitRequest {
        fn id_parent_too_self(&mut self) {
            self.parent_id = Some("SELF".to_string());
        }
    }
}
