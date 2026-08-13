//! Pivot `proyecto_organizaciones` (project_organizations).
//!
//! Resuelve la relacion M:N entre `proyectos` y `org_units` con un atributo
//! `rol` (EJECUTORA|CO_EJECUTORA|PATROCINADORA|COLABORADORA). Un proyecto
//! puede tener varias organizaciones, cada una con un rol distinto.
//!
//! Las funciones de persistencia (CRUD sobre la coleccion) viven en
//! `repository.rs` (modulo padre) y se invocan desde los handlers de
//! proyectos al crear/actualizar/eliminar. Aqui solo se conserva el modelo
//! de dominio y el DTO para mantener el principio hexagonal.

use crate::shared::error::AppError;
use crate::shared::vocab_mapper::ORG_ROLES_VALIDOS;

/// Modelo de dominio de `proyecto_organizaciones`. Pivote polimorfico
/// entre `proyectos` y `org_units` con un `rol` (ORG_ROLES_VALIDOS).
#[derive(Debug, Clone, Default)]
pub struct ProyectoOrganizacion {
    pub id: String,
    pub id_proyecto: String,
    pub id_org_unit: String,
    pub rol: String,
}

impl ProyectoOrganizacion {
    /// Construye un registro. Aplica validaciones:
    /// - `id`, `id_proyecto`, `id_org_unit`: no vacios.
    /// - `rol`: debe estar en `ORG_ROLES_VALIDOS`.
    pub fn new(
        id: String,
        id_proyecto: String,
        id_org_unit: String,
        rol: String,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de proyecto_organizacion no puede estar vacio.".to_string(),
            ));
        }
        if id_proyecto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_proyecto no puede estar vacio.".to_string(),
            ));
        }
        if id_org_unit.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_org_unit no puede estar vacio.".to_string(),
            ));
        }
        let rol_trim = rol.trim().to_string();
        if rol_trim.is_empty() {
            return Err(AppError::InternalError(
                "El rol de la organizacion en el proyecto es obligatorio.".to_string(),
            ));
        }
        if !ORG_ROLES_VALIDOS.iter().any(|r| *r == rol_trim) {
            return Err(AppError::InternalError(format!(
                "El rol '{}' no esta en los roles validos para organizaciones ({}).",
                rol_trim,
                ORG_ROLES_VALIDOS.join(", ")
            )));
        }
        Ok(Self {
            id,
            id_proyecto: id_proyecto.trim().to_string(),
            id_org_unit: id_org_unit.trim().to_string(),
            rol: rol_trim,
        })
    }

    /// Helper de unicidad: clave materializada (id_proyecto, id_org_unit, rol).
    /// Permite multiples roles por la misma organizacion en el mismo proyecto
    /// (ej: una universidad puede ser EJECUTORA y PATROCINADORA).
    pub fn uniqueness_key(&self) -> (String, String, String) {
        (
            self.id_proyecto.clone(),
            self.id_org_unit.clone(),
            self.rol.clone(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_acepta_rol_valido() {
        let po = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_EJECUTORA.to_string(),
        )
        .unwrap();
        assert_eq!(po.id, "po-1");
        assert_eq!(po.rol, "EJECUTORA");
    }

    #[test]
    fn new_acepta_los_4_roles_canonicos() {
        for r in ORG_ROLES_VALIDOS {
            let po = ProyectoOrganizacion::new(
                "po-1".to_string(),
                "p-1".to_string(),
                "org-1".to_string(),
                r.to_string(),
            )
            .unwrap_or_else(|e| panic!("rol {r} rechazado: {e:?}"));
            assert_eq!(po.rol, *r);
        }
    }

    #[test]
    fn new_rechaza_rol_invalido() {
        let r = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            "BENEFICIARIA".to_string(),
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_rechaza_rol_vacio() {
        let r = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            "   ".to_string(),
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_rechaza_id_vacio() {
        let r = ProyectoOrganizacion::new(
            "  ".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_CO_EJECUTORA.to_string(),
        );
        assert!(r.is_err());
        let r = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "  ".to_string(),
            "org-1".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_CO_EJECUTORA.to_string(),
        );
        assert!(r.is_err());
        let r = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "p-1".to_string(),
            "  ".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_CO_EJECUTORA.to_string(),
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_trim() {
        let po = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "  p-1 ".to_string(),
            "  org-1 ".to_string(),
            "  PATROCINADORA  ".to_string(),
        )
        .unwrap();
        assert_eq!(po.id_proyecto, "p-1");
        assert_eq!(po.id_org_unit, "org-1");
        assert_eq!(po.rol, "PATROCINADORA");
    }

    #[test]
    fn uniqueness_key_incluye_rol() {
        let po1 = ProyectoOrganizacion::new(
            "po-1".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_EJECUTORA.to_string(),
        )
        .unwrap();
        let po2 = ProyectoOrganizacion::new(
            "po-2".to_string(),
            "p-1".to_string(),
            "org-1".to_string(),
            crate::shared::vocab_mapper::ORG_ROL_PATROCINADORA.to_string(),
        )
        .unwrap();
        assert_ne!(po1.uniqueness_key(), po2.uniqueness_key());
    }
}

/// DTO canónico (BSON + IPC) del pivot `proyecto_organizaciones`.
/// snake_case para casar con la persistencia y con el frontend TS.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ProyectoOrganizacionDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_proyecto: String,
    pub id_org_unit: String,
    pub rol: String,
}

impl From<ProyectoOrganizacion> for ProyectoOrganizacionDoc {
    fn from(m: ProyectoOrganizacion) -> Self {
        Self {
            id: m.id,
            id_proyecto: m.id_proyecto,
            id_org_unit: m.id_org_unit,
            rol: m.rol,
        }
    }
}

impl From<ProyectoOrganizacionDoc> for ProyectoOrganizacion {
    fn from(d: ProyectoOrganizacionDoc) -> Self {
        Self {
            id: d.id,
            id_proyecto: d.id_proyecto,
            id_org_unit: d.id_org_unit,
            rol: d.rol,
        }
    }
}
