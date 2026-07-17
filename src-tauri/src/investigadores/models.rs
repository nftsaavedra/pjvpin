use crate::investigadores::dto::{
    CreateInvestigadorRequest, InvestigadorDetalleDto, InvestigadorDto, PublicacionDto,
    RenacytLookupResult,
};
use crate::personas::models::Persona;
use crate::shared::error::AppError;

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
            renacyt_orcid: renacyt
                .as_ref()
                .and_then(|value| value.orcid.clone())
                .filter(|value| !value.trim().is_empty()),
            renacyt_scopus_author_id: renacyt
                .as_ref()
                .and_then(|value| value.scopus_author_id.clone())
                .filter(|value| !value.trim().is_empty()),
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
        })
    }

    pub fn with_persona_id(mut self, persona_id: String) -> Self {
        self.persona_id = persona_id;
        self
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
        })
    }
}

impl InvestigadorDetalleDto {
    pub fn from_parts(
        investigador: Investigador,
        persona: Persona,
        grado: String,
        proyectos: Vec<String>,
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
        }
    }
}

#[derive(Debug, Clone)]
pub struct Publicacion {
    pub id_publicacion: String,
    pub pure_uuid: String,
    pub persona_id: String,
    pub proyecto_id: Option<String>,
    pub titulo: String,
    pub tipo_publicacion: Option<String>,
    pub doi: Option<String>,
    pub scopus_eid: Option<String>,
    pub anio_publicacion: Option<i32>,
    pub autores_json: Option<String>,
    pub estado_publicacion: Option<String>,
    pub journal_titulo: Option<String>,
    pub issn: Option<String>,
    pub pure_sincronizado_at: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

impl From<Publicacion> for PublicacionDto {
    fn from(m: Publicacion) -> Self {
        Self {
            id_publicacion: m.id_publicacion,
            pure_uuid: m.pure_uuid,
            persona_id: m.persona_id,
            proyecto_id: m.proyecto_id,
            titulo: m.titulo,
            tipo_publicacion: m.tipo_publicacion,
            doi: m.doi,
            scopus_eid: m.scopus_eid,
            anio_publicacion: m.anio_publicacion,
            autores_json: m.autores_json,
            estado_publicacion: m.estado_publicacion,
            journal_titulo: m.journal_titulo,
            issn: m.issn,
            pure_sincronizado_at: m.pure_sincronizado_at,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

impl TryFrom<PublicacionDto> for Publicacion {
    type Error = AppError;
    fn try_from(d: PublicacionDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id_publicacion: d.id_publicacion,
            pure_uuid: d.pure_uuid,
            persona_id: d.persona_id,
            proyecto_id: d.proyecto_id,
            titulo: d.titulo,
            tipo_publicacion: d.tipo_publicacion,
            doi: d.doi,
            scopus_eid: d.scopus_eid,
            anio_publicacion: d.anio_publicacion,
            autores_json: d.autores_json,
            estado_publicacion: d.estado_publicacion,
            journal_titulo: d.journal_titulo,
            issn: d.issn,
            pure_sincronizado_at: d.pure_sincronizado_at,
            created_at: d.created_at,
            updated_at: d.updated_at,
        })
    }
}
