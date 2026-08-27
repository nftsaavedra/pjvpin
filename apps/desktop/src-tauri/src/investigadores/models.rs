use crate::investigadores::dto::{
    CreateInvestigadorRequest, InvestigadorDetalleDto, InvestigadorDto, RenacytLookupResult,
};
use crate::personas::models::Persona;
use crate::shared::error::AppError;
use crate::shared::orcid::Orcid;
use crate::shared::vocab_mapper::{DOC_TYPE_CE, DOC_TYPE_DNI, DOC_TYPE_PASAPORTE};

#[derive(Debug, Clone)]
pub struct Investigador {
    pub id_investigador: String,
    pub persona_id: String,
    pub id_grado: String,
    pub activo: i64,
    pub updated_at: Option<i64>,
    pub perfil: String,
    pub renacyt_codigo_registro: Option<String>,
    pub renacyt_id_investigador: Option<String>,
    pub renacyt_nivel: Option<String>,
    pub renacyt_grupo: Option<String>,
    pub renacyt_condicion: Option<String>,
    pub renacyt_fecha_informe_calificacion: Option<i64>,
    pub renacyt_fecha_registro: Option<i64>,
    pub renacyt_fecha_ultima_revision: Option<i64>,
    pub renacyt_orcid: Option<String>,
    pub renacyt_scopus_author_id: Option<String>,
    pub renacyt_fecha_ultima_sincronizacion: Option<i64>,
    pub renacyt_ficha_url: Option<String>,
    pub renacyt_formaciones_academicas_json: Option<String>,
    pub grupo_investigacion_id: Option<String>,
    /// Fase N0-D (D11): tipo de documento de identidad (DNI|CE|PASAPORTE).
    /// Vive en Investigador porque CONCYTEC lo exige para `persons` y
    /// `Persona` no debe amplificarse (D7). `None` se trata como "DNI"
    /// por defecto en la capa IPC.
    pub tipo_documento: Option<String>,
    /// PersonID del Master List de Pure (ej. "PER0001" para personas ya
    /// importadas en `pure.unf.edu.pe`). Sincronizado via el comando
    /// `sincronizar_pure_person_ids` que pagina `GET /persons` y matchea
    /// por DNI. Permite upsert en Pure sin duplicar personas.
    pub pure_person_id: Option<String>,
    /// UUID canonico PeruCRIS (alineamiento N2-G). Permite dedupe
    /// durante el importador y ancla el match persona↔PeruCRIS.
    pub perucris_uuid: Option<String>,
    /// Marca temporal (ms epoch) de la ultima vez que el usuario reviso
    /// los cambios RENACYT pendientes en la ficha del investigador.
    /// `None` indica que nunca se han revisado (entrada nueva en el
    /// kardex requiere atencion). Lo setea el handler
    /// `marcar_cambios_renacyt_revisados` (RBAC `InvestigadoresView`).
    pub renacyt_cambios_revisados_en: Option<i64>,
}

impl Investigador {
    pub fn new(
        id_investigador: String,
        request: &CreateInvestigadorRequest,
    ) -> Result<Self, AppError> {
        if id_investigador.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de investigador no puede estar vacio.".to_string(),
            ));
        }
        let renacyt = &request.renacyt;
        let fecha_ultima_sincronizacion = renacyt.as_ref().map(|_| crate::shared::time::now_ms());
        let perfil = match request.perfil.as_str() {
            "docente" | "tesista" | "alumno_egresado" => request.perfil.clone(),
            _ => "docente".to_string(),
        };

        // ORCID best-effort: llega del auto-check RENACYT (fuente externa).
        // Un ORCID con checksum invalido NO debe abortar el alta (RENACYT
        // puede devolver valores corruptos). Intentamos normalizarlo; si la
        // validacion ISO 7064 11-2 falla, conservamos la cadena cruda para
        // trazabilidad (mismo criterio leniente que `apply_renacyt_refresh`).
        let orcid_validado: Option<String> = renacyt
            .as_ref()
            .and_then(|value| value.orcid.clone())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(|s| match Orcid::new_opt(Some(&s)) {
                Ok(Some(orc)) => orc.into_string(),
                _ => s,
            });

        let tipo_documento_raw = request
            .tipo_documento
            .as_ref()
            .map(|s| s.trim().to_ascii_uppercase())
            .filter(|s| !s.is_empty());
        if let Some(td) = tipo_documento_raw.as_ref() {
            if td != DOC_TYPE_DNI && td != DOC_TYPE_CE && td != DOC_TYPE_PASAPORTE {
                return Err(AppError::InternalError(format!(
                    "El tipo de documento '{td}' no es valido. Permitidos: DNI, CE, PASAPORTE."
                )));
            }
        }

        Ok(Self {
            id_investigador,
            persona_id: String::new(),
            id_grado: request.id_grado.clone(),
            activo: 1,
            updated_at: Some(crate::shared::time::now_ms()),
            perfil,
            renacyt_codigo_registro: renacyt
                .as_ref()
                .map(|value| value.codigo_registro.trim().to_string())
                .filter(|value| !value.is_empty()),
            renacyt_id_investigador: renacyt
                .as_ref()
                .map(|value| value.id_investigador.trim().to_string())
                .filter(|value| !value.is_empty()),
            renacyt_nivel: renacyt
                .as_ref()
                .and_then(|value| value.nivel.clone())
                .filter(|value| !value.trim().is_empty()),
            renacyt_grupo: renacyt
                .as_ref()
                .and_then(|value| value.grupo.clone())
                .filter(|value| !value.trim().is_empty()),
            renacyt_condicion: renacyt
                .as_ref()
                .and_then(|value| value.condicion.clone())
                .filter(|value| !value.trim().is_empty()),
            renacyt_fecha_informe_calificacion: renacyt
                .as_ref()
                .and_then(|value| value.fecha_informe_calificacion),
            renacyt_fecha_registro: renacyt.as_ref().and_then(|value| value.fecha_registro),
            renacyt_fecha_ultima_revision: renacyt
                .as_ref()
                .and_then(|value| value.fecha_ultima_revision),
            renacyt_orcid: orcid_validado,
            renacyt_scopus_author_id: renacyt
                .as_ref()
                .and_then(|value| value.scopus_author_id.clone())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
            renacyt_fecha_ultima_sincronizacion: fecha_ultima_sincronizacion,
            renacyt_ficha_url: renacyt
                .as_ref()
                .map(|value| value.ficha_url.trim().to_string())
                .filter(|value| !value.is_empty()),
            renacyt_formaciones_academicas_json: renacyt
                .as_ref()
                .and_then(|value| value.formaciones_academicas_json.clone())
                .filter(|value| !value.trim().is_empty()),
            grupo_investigacion_id: None,
            tipo_documento: tipo_documento_raw,
            pure_person_id: request
                .pure_person_id
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty()),
            perucris_uuid: request
                .perucris_uuid
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty()),
            renacyt_cambios_revisados_en: None,
        })
    }

    pub fn with_persona_id(mut self, persona_id: String) -> Self {
        self.persona_id = persona_id;
        self
    }

    /// Marca el instante actual como la ultima revision del kardex
    /// RENACYT por parte del usuario. Usado por el handler
    /// `marcar_cambios_renacyt_revisados` para silenciar la alerta
    /// de "cambios sin revisar" en la ficha. No se expone como API
    /// publica al frontend: solo el handler decide cuando aplicarlo.
    pub fn marcar_cambios_revisados(&mut self) {
        self.renacyt_cambios_revisados_en = Some(crate::shared::time::now_ms());
    }

    pub fn apply_renacyt_refresh(&mut self, lookup: RenacytLookupResult) -> bool {
        let nuevas_formaciones = lookup
            .formaciones_academicas_json
            .filter(|value| !value.trim().is_empty());
        let tiene_nuevas_formaciones = nuevas_formaciones.is_some();

        self.renacyt_codigo_registro =
            Some(lookup.codigo_registro.trim().to_string()).filter(|value| !value.is_empty());
        self.renacyt_id_investigador =
            Some(lookup.id_investigador.trim().to_string()).filter(|value| !value.is_empty());
        self.renacyt_nivel = lookup.nivel.filter(|value| !value.trim().is_empty());
        self.renacyt_grupo = lookup.grupo.filter(|value| !value.trim().is_empty());
        self.renacyt_condicion = lookup.condicion.filter(|value| !value.trim().is_empty());
        self.renacyt_fecha_informe_calificacion = lookup.fecha_informe_calificacion;
        self.renacyt_fecha_registro = lookup.fecha_registro;
        self.renacyt_fecha_ultima_revision = lookup.fecha_ultima_revision;
        self.renacyt_orcid = lookup.orcid.filter(|value| !value.trim().is_empty());
        // Validar ORCID del lookup (si falla el checksum, se conserva la cadena
        // cruda para que el usuario pueda corregir; refresh no aborta).
        self.renacyt_scopus_author_id = lookup
            .scopus_author_id
            .filter(|value| !value.trim().is_empty());
        self.renacyt_ficha_url =
            Some(lookup.ficha_url.trim().to_string()).filter(|value| !value.is_empty());
        self.renacyt_fecha_ultima_sincronizacion = Some(crate::shared::time::now_ms());

        if let Some(formaciones) = nuevas_formaciones {
            self.renacyt_formaciones_academicas_json = Some(formaciones);
        }

        tiene_nuevas_formaciones
    }
}

impl From<Investigador> for InvestigadorDto {
    fn from(m: Investigador) -> Self {
        Self {
            id_investigador: m.id_investigador,
            persona_id: m.persona_id,
            id_grado: m.id_grado,
            activo: m.activo,
            updated_at: m.updated_at,
            perfil: m.perfil,
            renacyt_codigo_registro: m.renacyt_codigo_registro,
            renacyt_id_investigador: m.renacyt_id_investigador,
            renacyt_nivel: m.renacyt_nivel,
            renacyt_grupo: m.renacyt_grupo,
            renacyt_condicion: m.renacyt_condicion,
            renacyt_fecha_informe_calificacion: m.renacyt_fecha_informe_calificacion,
            renacyt_fecha_registro: m.renacyt_fecha_registro,
            renacyt_fecha_ultima_revision: m.renacyt_fecha_ultima_revision,
            renacyt_orcid: m.renacyt_orcid,
            renacyt_scopus_author_id: m.renacyt_scopus_author_id,
            renacyt_fecha_ultima_sincronizacion: m.renacyt_fecha_ultima_sincronizacion,
            renacyt_ficha_url: m.renacyt_ficha_url,
            renacyt_formaciones_academicas_json: m.renacyt_formaciones_academicas_json,
            grupo_investigacion_id: m.grupo_investigacion_id,
            tipo_documento: m.tipo_documento,
            pure_person_id: m.pure_person_id,
            perucris_uuid: m.perucris_uuid,
            renacyt_cambios_revisados_en: m.renacyt_cambios_revisados_en,
        }
    }
}

impl TryFrom<InvestigadorDto> for Investigador {
    type Error = AppError;
    fn try_from(d: InvestigadorDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id_investigador: d.id_investigador,
            persona_id: d.persona_id,
            id_grado: d.id_grado,
            activo: d.activo,
            updated_at: d.updated_at,
            perfil: d.perfil,
            renacyt_codigo_registro: d.renacyt_codigo_registro,
            renacyt_id_investigador: d.renacyt_id_investigador,
            renacyt_nivel: d.renacyt_nivel,
            renacyt_grupo: d.renacyt_grupo,
            renacyt_condicion: d.renacyt_condicion,
            renacyt_fecha_informe_calificacion: d.renacyt_fecha_informe_calificacion,
            renacyt_fecha_registro: d.renacyt_fecha_registro,
            renacyt_fecha_ultima_revision: d.renacyt_fecha_ultima_revision,
            renacyt_orcid: d.renacyt_orcid,
            renacyt_scopus_author_id: d.renacyt_scopus_author_id,
            renacyt_fecha_ultima_sincronizacion: d.renacyt_fecha_ultima_sincronizacion,
            renacyt_ficha_url: d.renacyt_ficha_url,
            renacyt_formaciones_academicas_json: d.renacyt_formaciones_academicas_json,
            grupo_investigacion_id: d.grupo_investigacion_id,
            tipo_documento: d.tipo_documento,
            pure_person_id: d.pure_person_id,
            perucris_uuid: d.perucris_uuid,
            renacyt_cambios_revisados_en: d.renacyt_cambios_revisados_en,
        })
    }
}

impl InvestigadorDetalleDto {
    /// Construye el DTO desde sus partes sin kardex. Mantener este
    /// overload para los call-sites que solo necesitan el detalle
    /// (ej. `get_all_investigadores_con_proyectos` que paginar N
    /// investigadores no debe disparar N lecturas de kardex).
    pub fn from_parts(
        investigador: Investigador,
        persona: Persona,
        grado: String,
        proyectos: Vec<String>,
    ) -> Self {
        Self::from_parts_with_kardex(investigador, persona, grado, proyectos, Vec::new())
    }

    /// Overload que ademas recibe los cambios RENACYT recientes (con
    /// `tiene_cambio_clasificatorio() == true`). Usado por
    /// `get_investigador_detalle_by_id` para alimentar el panel de
    /// kardex y la marca de revision en la ficha.
    pub fn from_parts_with_kardex(
        investigador: Investigador,
        persona: Persona,
        grado: String,
        proyectos: Vec<String>,
        cambios_renacyt_recientes: Vec<crate::investigadores::kardex::CambioKardex>,
    ) -> Self {
        let cantidad_proyectos = proyectos.len() as i64;
        Self {
            id_investigador: investigador.id_investigador,
            persona_id: investigador.persona_id,
            dni: persona.dni,
            nombres_apellidos: persona.nombre_completo,
            nombres: persona.nombres,
            apellido_paterno: persona.apellido_paterno,
            apellido_materno: persona.apellido_materno,
            correo: persona.correo,
            telefono: persona.telefono,
            direccion: persona.direccion,
            grado,
            cantidad_proyectos,
            proyectos: if proyectos.is_empty() {
                None
            } else {
                Some(proyectos.join(" | "))
            },
            activo: investigador.activo,
            perfil: investigador.perfil,
            renacyt_codigo_registro: investigador.renacyt_codigo_registro,
            renacyt_id_investigador: investigador.renacyt_id_investigador,
            renacyt_nivel: investigador.renacyt_nivel,
            renacyt_grupo: investigador.renacyt_grupo,
            renacyt_condicion: investigador.renacyt_condicion,
            renacyt_fecha_informe_calificacion: investigador.renacyt_fecha_informe_calificacion,
            renacyt_fecha_registro: investigador.renacyt_fecha_registro,
            renacyt_fecha_ultima_revision: investigador.renacyt_fecha_ultima_revision,
            renacyt_orcid: investigador.renacyt_orcid,
            renacyt_scopus_author_id: investigador.renacyt_scopus_author_id,
            renacyt_fecha_ultima_sincronizacion: investigador.renacyt_fecha_ultima_sincronizacion,
            renacyt_ficha_url: investigador.renacyt_ficha_url,
            renacyt_formaciones_academicas_json: investigador.renacyt_formaciones_academicas_json,
            renacyt_cambios_revisados_en: investigador.renacyt_cambios_revisados_en,
            cambios_renacyt_recientes,
        }
    }
}
