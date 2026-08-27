use crate::proyectos::dto::{CreateProyectoRequest, ParticipacionRecordDto, ProyectoDto};
use crate::shared::error::AppError;
use crate::shared::time;
use crate::shared::vocab_mapper::ROLES_VALIDOS;

#[derive(Debug, Clone, Default)]
pub struct Proyecto {
    pub id_proyecto: String,
    pub titulo_proyecto: String,
    pub codigo: String, // UNIQUE
    pub activo: bool,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub campo_ocde: Option<String>,
    pub programas_relacionados: Vec<String>,
    // ---- Fase N2-A (D11) ----
    pub tipo_actividad_ocde: Option<String>, // FK ocde_tipo_proyecto
    pub ambito_geografico: Option<String>,   // FK concytec_terminos
    pub estado_concytec: Option<String>,     // FK concytec_estado_proyecto
    pub tematica_ambiental: Option<String>,  // FK minam_tematicas_ambientales
    pub tematica_salud: Option<String>,      // FK ins_tematicas_salud
    // ---- Fase N2-G (alineamiento PeruCRIS): UUID canónico. Permite dedupe
    // en el importador inicial y validación de outputs vía find_by_uuid. ----
    pub perucris_uuid: Option<String>,
}

impl Proyecto {
    pub fn new(id: String, request: CreateProyectoRequest) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de proyecto no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo_proyecto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El titulo del proyecto es obligatorio.".to_string(),
            ));
        }
        let codigo = request
            .codigo
            .as_ref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if codigo.is_none() {
            return Err(AppError::InternalError(
                "El codigo del proyecto es obligatorio.".to_string(),
            ));
        }
        let codigo = codigo.unwrap();
        let now = time::now_ms();

        Ok(Self {
            id_proyecto: id,
            titulo_proyecto: request.titulo_proyecto,
            codigo,
            activo: true,
            created_at: Some(now),
            updated_at: Some(now),
            campo_ocde: None,
            programas_relacionados: Vec::new(),
            tipo_actividad_ocde: trim_or_none(request.tipo_actividad_ocde),
            ambito_geografico: trim_or_none(request.ambito_geografico),
            estado_concytec: trim_or_none(request.estado_concytec),
            tematica_ambiental: trim_or_none(request.tematica_ambiental),
            tematica_salud: trim_or_none(request.tematica_salud),
            perucris_uuid: None,
        })
    }
}

fn trim_or_none(opt: Option<String>) -> Option<String> {
    opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests_n2a {
    use super::*;
    use crate::proyectos::dto::CreateProyectoRequest;

    fn req_base(codigo: Option<&str>) -> CreateProyectoRequest {
        CreateProyectoRequest {
            titulo_proyecto: "Proyecto X".to_string(),
            codigo: codigo.map(|s| s.to_string()),
            tipo_actividad_ocde: Some("investigacion_aplicada".to_string()),
            ambito_geografico: Some("ambito_nacional".to_string()),
            estado_concytec: Some("ejecucion".to_string()),
            tematica_ambiental: None,
            tematica_salud: None,
        }
    }

    #[test]
    fn new_with_codigo_and_vocabs() {
        let p = Proyecto::new("proj-1".to_string(), req_base(Some("PRJ-001"))).unwrap();
        assert_eq!(p.codigo, "PRJ-001");
        assert_eq!(
            p.tipo_actividad_ocde.as_deref(),
            Some("investigacion_aplicada")
        );
        assert_eq!(p.ambito_geografico.as_deref(), Some("ambito_nacional"));
        assert_eq!(p.estado_concytec.as_deref(), Some("ejecucion"));
        assert!(p.tematica_ambiental.is_none());
    }

    #[test]
    fn new_requires_codigo() {
        assert!(Proyecto::new("p".to_string(), req_base(None)).is_err());
        assert!(Proyecto::new("p".to_string(), req_base(Some(""))).is_err());
        assert!(Proyecto::new("p".to_string(), req_base(Some("   "))).is_err());
    }

    #[test]
    fn new_requires_titulo() {
        let mut r = req_base(Some("C-1"));
        r.titulo_proyecto = "  ".to_string();
        assert!(Proyecto::new("p".to_string(), r).is_err());
    }

    #[test]
    fn vocabs_trimmed() {
        let mut r = req_base(Some("C-1"));
        r.ambito_geografico = Some("  ambito_local  ".to_string());
        let p = Proyecto::new("p".to_string(), r).unwrap();
        assert_eq!(p.ambito_geografico.as_deref(), Some("ambito_local"));
    }
}

impl From<Proyecto> for ProyectoDto {
    fn from(m: Proyecto) -> Self {
        Self {
            id_proyecto: m.id_proyecto,
            titulo_proyecto: m.titulo_proyecto,
            codigo: m.codigo,
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
            campo_ocde: m.campo_ocde,
            programas_relacionados: m.programas_relacionados,
            tipo_actividad_ocde: m.tipo_actividad_ocde,
            ambito_geografico: m.ambito_geografico,
            estado_concytec: m.estado_concytec,
            tematica_ambiental: m.tematica_ambiental,
            tematica_salud: m.tematica_salud,
            perucris_uuid: m.perucris_uuid,
        }
    }
}

impl From<&Proyecto> for ProyectoDto {
    fn from(m: &Proyecto) -> Self {
        Self {
            id_proyecto: m.id_proyecto.clone(),
            titulo_proyecto: m.titulo_proyecto.clone(),
            codigo: m.codigo.clone(),
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
            campo_ocde: m.campo_ocde.clone(),
            programas_relacionados: m.programas_relacionados.clone(),
            tipo_actividad_ocde: m.tipo_actividad_ocde.clone(),
            ambito_geografico: m.ambito_geografico.clone(),
            estado_concytec: m.estado_concytec.clone(),
            tematica_ambiental: m.tematica_ambiental.clone(),
            tematica_salud: m.tematica_salud.clone(),
            perucris_uuid: m.perucris_uuid.clone(),
        }
    }
}

impl TryFrom<ProyectoDto> for Proyecto {
    type Error = AppError;
    fn try_from(d: ProyectoDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id_proyecto: d.id_proyecto,
            titulo_proyecto: d.titulo_proyecto,
            codigo: d.codigo,
            activo: d.activo,
            created_at: d.created_at,
            updated_at: d.updated_at,
            campo_ocde: d.campo_ocde,
            programas_relacionados: d.programas_relacionados,
            tipo_actividad_ocde: d.tipo_actividad_ocde,
            ambito_geografico: d.ambito_geografico,
            estado_concytec: d.estado_concytec,
            tematica_ambiental: d.tematica_ambiental,
            tematica_salud: d.tematica_salud,
            perucris_uuid: d.perucris_uuid,
        })
    }
}

#[derive(Debug, Clone, Default)]
pub struct ParticipacionRecord {
    pub id: String,
    pub id_proyecto: String,
    pub id_investigador: String,
    /// Fase N2-B: rol canónico del participante en el proyecto. Validado contra
    /// `shared::vocab_mapper::ROLES_VALIDOS` (INVESTIGADOR_PRINCIPAL,
    /// CO_INVESTIGADOR, TESISTA, ASISTENTE_INVESTIGACION,
    /// ASISTENTE_ADMINISTRATIVO).
    pub rol: String,
    /// Fase N2-B: FK opcional hacia `org_units` (afiliación institucional
    /// del participante en este proyecto). Solo se valida como FK si está
    /// presente; nunca requerido.
    pub id_org_unit_afiliacion: Option<String>,
    /// Fase N2-B: horas semanales dedicadas, opcional y validado como f64
    /// (MongoDB persiste como double).
    pub horas_dedicacion_semanal: Option<f64>,
    /// Legacy alias (v0.1.0-alpha): se infiere del `rol` para mantener
    /// compatibilidad con consumidores existentes. `true` si
    /// `rol == INVESTIGADOR_PRINCIPAL`.
    pub es_responsable: bool,
}

impl ParticipacionRecord {
    /// Construye un `ParticipacionRecord` aplicando las reglas:
    /// - `id`, `id_proyecto`, `id_investigador`: requerido, no vacío.
    /// - `rol`: requerido, debe estar en `ROLES_VALIDOS`.
    /// - `id_org_unit_afiliacion`: opcional; si presente, debe ser no vacío.
    /// - `horas_dedicacion_semanal`: opcional; si presente, debe ser >= 0.
    pub fn new(
        id: String,
        id_proyecto: String,
        id_investigador: String,
        rol: String,
        id_org_unit_afiliacion: Option<String>,
        horas_dedicacion_semanal: Option<f64>,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de participacion no puede estar vacio.".to_string(),
            ));
        }
        if id_proyecto.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_proyecto de la participacion no puede estar vacio.".to_string(),
            ));
        }
        if id_investigador.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_investigador de la participacion no puede estar vacio.".to_string(),
            ));
        }
        let rol_trim = rol.trim().to_string();
        if rol_trim.is_empty() {
            return Err(AppError::InternalError(
                "El rol de la participacion es obligatorio.".to_string(),
            ));
        }
        if !ROLES_VALIDOS.iter().any(|r| *r == rol_trim) {
            return Err(AppError::InternalError(format!(
                "El rol '{}' no esta en los roles validos.",
                rol_trim
            )));
        }
        let id_org_norm = id_org_unit_afiliacion
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if let Some(h) = horas_dedicacion_semanal {
            if h < 0.0 || !h.is_finite() {
                return Err(AppError::InternalError(format!(
                    "Las horas de dedicacion semanal deben ser un numero finito >= 0 (recibido: {h})."
                )));
            }
        }
        let es_responsable = rol_trim == crate::shared::vocab_mapper::ROLE_INVESTIGADOR_PRINCIPAL;
        Ok(Self {
            id,
            id_proyecto,
            id_investigador,
            rol: rol_trim,
            id_org_unit_afiliacion: id_org_norm,
            horas_dedicacion_semanal,
            es_responsable,
        })
    }
}

impl From<ParticipacionRecord> for ParticipacionRecordDto {
    fn from(m: ParticipacionRecord) -> Self {
        Self {
            id: m.id,
            id_proyecto: m.id_proyecto,
            id_investigador: m.id_investigador,
            rol: m.rol,
            id_org_unit_afiliacion: m.id_org_unit_afiliacion,
            horas_dedicacion_semanal: m.horas_dedicacion_semanal,
            es_responsable: m.es_responsable,
        }
    }
}

impl From<&ParticipacionRecord> for ParticipacionRecordDto {
    fn from(m: &ParticipacionRecord) -> Self {
        Self {
            id: m.id.clone(),
            id_proyecto: m.id_proyecto.clone(),
            id_investigador: m.id_investigador.clone(),
            rol: m.rol.clone(),
            id_org_unit_afiliacion: m.id_org_unit_afiliacion.clone(),
            horas_dedicacion_semanal: m.horas_dedicacion_semanal,
            es_responsable: m.es_responsable,
        }
    }
}

impl TryFrom<ParticipacionRecordDto> for ParticipacionRecord {
    type Error = AppError;
    fn try_from(d: ParticipacionRecordDto) -> Result<Self, Self::Error> {
        // Si `rol` viene vacío pero el DTO solo trae el legacy `es_responsable`,
        // inferimos el rol para preservar la informacion del documento.
        let rol = if d.rol.trim().is_empty() {
            if d.es_responsable {
                crate::shared::vocab_mapper::ROLE_INVESTIGADOR_PRINCIPAL.to_string()
            } else {
                crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR.to_string()
            }
        } else {
            d.rol
        };
        let id_org = d
            .id_org_unit_afiliacion
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        Ok(Self {
            id: d.id,
            id_proyecto: d.id_proyecto,
            id_investigador: d.id_investigador,
            rol,
            id_org_unit_afiliacion: id_org,
            horas_dedicacion_semanal: d.horas_dedicacion_semanal,
            es_responsable: d.es_responsable,
        })
    }
}

#[cfg(test)]
mod tests_n2b {
    use super::*;

    fn new_basic(
        id: &str,
        id_proyecto: &str,
        id_investigador: &str,
        rol: &str,
    ) -> Result<ParticipacionRecord, AppError> {
        ParticipacionRecord::new(
            id.to_string(),
            id_proyecto.to_string(),
            id_investigador.to_string(),
            rol.to_string(),
            None,
            None,
        )
    }

    #[test]
    fn participacion_new_acepta_rol_valido() {
        let p = new_basic(
            "p-1:inv-1",
            "p-1",
            "inv-1",
            crate::shared::vocab_mapper::ROLE_INVESTIGADOR_PRINCIPAL,
        )
        .unwrap();
        assert_eq!(p.rol, "INVESTIGADOR_PRINCIPAL");
        assert!(
            p.es_responsable,
            "rol INVESTIGADOR_PRINCIPAL -> es_responsable=true"
        );
    }

    #[test]
    fn participacion_rechaza_rol_invalido() {
        let r = new_basic("x", "p", "i", "ROL_INVENTADO");
        assert!(r.is_err());
    }

    #[test]
    fn participacion_rechaza_rol_vacio() {
        let r = new_basic("x", "p", "i", "   ");
        assert!(r.is_err());
    }

    #[test]
    fn participacion_rechaza_id_vacio() {
        let r = new_basic(
            "  ",
            "p",
            "i",
            crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR,
        );
        assert!(r.is_err());
        let r = new_basic(
            "x",
            "  ",
            "i",
            crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR,
        );
        assert!(r.is_err());
        let r = new_basic(
            "x",
            "p",
            "  ",
            crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR,
        );
        assert!(r.is_err());
    }

    #[test]
    fn participacion_acepta_afiliacion_y_horas() {
        let p = ParticipacionRecord::new(
            "p-1:inv-2".to_string(),
            "p-1".to_string(),
            "inv-2".to_string(),
            crate::shared::vocab_mapper::ROLE_TESISTA.to_string(),
            Some("  org-u-1  ".to_string()),
            Some(8.5),
        )
        .unwrap();
        assert_eq!(p.id_org_unit_afiliacion.as_deref(), Some("org-u-1"));
        assert_eq!(p.horas_dedicacion_semanal, Some(8.5));
        assert!(!p.es_responsable);
    }

    #[test]
    fn participacion_rechaza_horas_negativas() {
        let r = ParticipacionRecord::new(
            "x".to_string(),
            "p".to_string(),
            "i".to_string(),
            crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR.to_string(),
            None,
            Some(-1.0),
        );
        assert!(r.is_err());
    }

    #[test]
    fn participacion_tryfrom_inference_legacy() {
        // DTO con rol vacio + es_responsable=true -> inferir INVESTIGADOR_PRINCIPAL
        let d = ParticipacionRecordDto {
            id: "x".to_string(),
            id_proyecto: "p".to_string(),
            id_investigador: "i".to_string(),
            rol: "".to_string(),
            id_org_unit_afiliacion: None,
            horas_dedicacion_semanal: None,
            es_responsable: true,
        };
        let p = ParticipacionRecord::try_from(d).unwrap();
        assert_eq!(p.rol, "INVESTIGADOR_PRINCIPAL");
        assert!(p.es_responsable);
    }

    #[test]
    fn participacion_tryfrom_inference_legacy_false() {
        let d = ParticipacionRecordDto {
            id: "x".to_string(),
            id_proyecto: "p".to_string(),
            id_investigador: "i".to_string(),
            rol: "".to_string(),
            id_org_unit_afiliacion: None,
            horas_dedicacion_semanal: None,
            es_responsable: false,
        };
        let p = ParticipacionRecord::try_from(d).unwrap();
        assert_eq!(p.rol, "CO_INVESTIGADOR");
        assert!(!p.es_responsable);
    }

    #[test]
    fn participacion_dto_round_trip() {
        let p = ParticipacionRecord::new(
            "x".to_string(),
            "p".to_string(),
            "i".to_string(),
            crate::shared::vocab_mapper::ROLE_ASISTENTE_INVESTIGACION.to_string(),
            Some("org-u".to_string()),
            Some(4.0),
        )
        .unwrap();
        let dto: ParticipacionRecordDto = (&p).into();
        let r = ParticipacionRecord::try_from(dto).unwrap();
        assert_eq!(r.rol, "ASISTENTE_INVESTIGACION");
        assert_eq!(r.id_org_unit_afiliacion.as_deref(), Some("org-u"));
        assert_eq!(r.horas_dedicacion_semanal, Some(4.0));
    }
}
