use crate::publicaciones::dto::{CreatePublicacionRequest, PublicacionCientificaDto};
use crate::shared::error::AppError;
use crate::shared::vocab_mapper::{
    is_acceso_abierto_valor, is_allowed_publication_tipo, is_cuartil_valor, is_iso_639_1,
    CUARTILES_VALIDOS, DEFAULT,
};

pub const DEFAULT_DOMINIO_ORIGEN: &str = DEFAULT; // "MANUAL"

#[derive(Debug, Clone, Default)]
pub struct PublicacionCientifica {
    pub id: String,
    pub id_publicacion: String,
    pub titulo: String,
    pub autores_ids: Vec<String>,
    pub revista: Option<String>,
    pub doi: Option<String>,
    pub issn: Option<String>,
    pub anio: Option<i32>,
    pub cuartil: Option<String>,
    pub tipo: String,
    pub url: Option<String>,
    pub resumen: Option<String>,
    pub palabras_clave: Vec<String>,
    pub pure_id: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub activo: i64,

    // ---- Extension N2-F (alineamiento CONCYTEC/PeruCRIS) ----
    /// DOI validado por `shared::doi::Doi::new_opt`. Persistente como
    /// `Option<String>`; el VO solo se usa en `new()`.
    pub doi_val: Option<String>,
    /// URL persistente/handle (ej: https://hdl.handle.net/...).
    pub handle_url: Option<String>,
    /// Fecha de publicacion (epoch ms).
    pub fecha_publicacion: Option<i64>,
    /// Editorial textual.
    pub editorial: Option<String>,
    /// FK opcional a `org_units` (editorial institucional).
    pub id_org_unit_editora: Option<String>,
    /// Titulo de la revista (separado de `revista` que era mas generico).
    pub revista_titulo: Option<String>,
    /// ISBN (libros/capitulos).
    pub isbn: Option<String>,
    /// Cuartil Scimago (`vocab_mapper::CUARTILES_VALIDOS`).
    pub scimago_cuartil: Option<String>,
    /// Cuartil WOS.
    pub wos_cuartil: Option<String>,
    /// True si la publicacion fue revisada por pares (default true).
    pub es_revisado_por_pares: bool,
    /// Acceso abierto (`vocab_mapper::acceso_abierto_validos`).
    pub acceso_abierto: Option<String>,
    /// Idioma ISO 639-1 (2 letras lowercase).
    pub idioma: Option<String>,
    pub volumen: Option<String>,
    pub numero_issue: Option<String>,
    pub paginas: Option<String>,
    /// Origen de la publicacion: `MANUAL` o `PURE` (sync).
    pub dominio_origen: String,
    /// UUID de Pure (UNIQUE sparse). Diferente de `pure_id` legacy.
    pub pure_uuid: Option<String>,
    /// Estado de la publicacion (vocab `concytec_estado_proyecto`).
    pub estado_publicacion: Option<String>,
    /// FK desnormalizada a `proyectos` (D5): solo poblado en publicaciones
    /// que son productos de un proyecto (ej: tipo=Software). Permite
    /// `get_publicaciones_by_proyecto` sin pivot.
    pub id_proyecto: Option<String>,
}

impl PublicacionCientifica {
    pub fn new(
        id_publicacion: String,
        request: CreatePublicacionRequest,
    ) -> Result<Self, AppError> {
        if id_publicacion.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de publicación no puede estar vacio.".to_string(),
            ));
        }
        if request.titulo.trim().is_empty() {
            return Err(AppError::InternalError(
                "El título de la publicación es obligatorio.".to_string(),
            ));
        }
        let tipo_trim = request.tipo.trim().to_string();
        if tipo_trim.is_empty() {
            return Err(AppError::InternalError(
                "El tipo de publicación es obligatorio.".to_string(),
            ));
        }
        if !is_allowed_publication_tipo(&tipo_trim) {
            return Err(AppError::InternalError(format!(
                "El tipo de publicacion '{}' no esta en los tipos validos.",
                tipo_trim
            )));
        }
        // Validacion DOI via VO
        let doi_val = if let Some(ref raw) = request.doi {
            Some(crate::shared::doi::Doi::new(raw)?.into_string())
        } else {
            None
        };
        // Validacion idioma ISO 639-1
        if let Some(ref lang) = request.idioma {
            if !is_iso_639_1(lang) {
                return Err(AppError::InternalError(format!(
                    "El idioma '{}' no es un codigo ISO 639-1 valido (2 letras lowercase).",
                    lang
                )));
            }
        }
        // Validacion cuartiles
        if let Some(ref q) = request.scimago_cuartil {
            if !is_cuartil_valor(Some(q)) {
                return Err(AppError::InternalError(format!(
                    "El cuartil Scimago '{}' no esta en los cuartiles validos ({:?}).",
                    q, CUARTILES_VALIDOS
                )));
            }
        }
        if let Some(ref q) = request.wos_cuartil {
            if !is_cuartil_valor(Some(q)) {
                return Err(AppError::InternalError(format!(
                    "El cuartil WOS '{}' no esta en los cuartiles validos.",
                    q
                )));
            }
        }
        // Validacion acceso_abierto
        if !is_acceso_abierto_valor(request.acceso_abierto.as_deref()) {
            return Err(AppError::InternalError(format!(
                "El valor de acceso_abierto '{:?}' no es valido.",
                request.acceso_abierto
            )));
        }
        // Dominio origen
        let dominio_origen = request
            .dominio_origen
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_DOMINIO_ORIGEN.to_string());
        if !crate::shared::vocab_mapper::DOMINIOS_ORIGEN_VALIDOS
            .iter()
            .any(|d| *d == dominio_origen)
        {
            return Err(AppError::InternalError(format!(
                "El dominio_origen '{}' no esta en los dominios validos.",
                dominio_origen
            )));
        }
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id: id_publicacion.clone(),
            id_publicacion,
            titulo: request.titulo,
            autores_ids: request.autores_ids,
            revista: request.revista,
            doi: doi_val.clone(),
            issn: request.issn,
            anio: request.anio,
            cuartil: request.cuartil,
            tipo: tipo_trim,
            url: request.url,
            resumen: request.resumen,
            palabras_clave: request.palabras_clave,
            pure_id: request.pure_id,
            created_at: Some(now),
            updated_at: Some(now),
            activo: 1,
            doi_val,
            handle_url: trim_some(request.handle_url),
            fecha_publicacion: request.fecha_publicacion,
            editorial: trim_some(request.editorial),
            id_org_unit_editora: trim_some(request.id_org_unit_editora),
            revista_titulo: trim_some(request.revista_titulo),
            isbn: trim_some(request.isbn),
            scimago_cuartil: request.scimago_cuartil,
            wos_cuartil: request.wos_cuartil,
            es_revisado_por_pares: request.es_revisado_por_pares,
            acceso_abierto: request.acceso_abierto,
            idioma: request.idioma,
            volumen: trim_some(request.volumen),
            numero_issue: trim_some(request.numero_issue),
            paginas: trim_some(request.paginas),
            dominio_origen,
            pure_uuid: trim_some(request.pure_uuid),
            estado_publicacion: trim_some(request.estado_publicacion),
            id_proyecto: trim_some(request.id_proyecto),
        })
    }
}

fn trim_some(opt: Option<String>) -> Option<String> {
    opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

impl From<PublicacionCientifica> for PublicacionCientificaDto {
    fn from(m: PublicacionCientifica) -> Self {
        Self {
            id: m.id,
            id_publicacion: m.id_publicacion,
            titulo: m.titulo,
            autores_ids: m.autores_ids,
            revista: m.revista,
            doi: m.doi,
            issn: m.issn,
            anio: m.anio,
            cuartil: m.cuartil,
            tipo: m.tipo,
            url: m.url,
            resumen: m.resumen,
            palabras_clave: m.palabras_clave,
            pure_id: m.pure_id,
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
            handle_url: m.handle_url,
            fecha_publicacion: m.fecha_publicacion,
            editorial: m.editorial,
            id_org_unit_editora: m.id_org_unit_editora,
            revista_titulo: m.revista_titulo,
            isbn: m.isbn,
            scimago_cuartil: m.scimago_cuartil,
            wos_cuartil: m.wos_cuartil,
            es_revisado_por_pares: m.es_revisado_por_pares,
            acceso_abierto: m.acceso_abierto,
            idioma: m.idioma,
            volumen: m.volumen,
            numero_issue: m.numero_issue,
            paginas: m.paginas,
            dominio_origen: m.dominio_origen,
            pure_uuid: m.pure_uuid,
            estado_publicacion: m.estado_publicacion,
            id_proyecto: m.id_proyecto,
        }
    }
}

impl From<&PublicacionCientifica> for PublicacionCientificaDto {
    fn from(m: &PublicacionCientifica) -> Self {
        Self {
            id: m.id.clone(),
            id_publicacion: m.id_publicacion.clone(),
            titulo: m.titulo.clone(),
            autores_ids: m.autores_ids.clone(),
            revista: m.revista.clone(),
            doi: m.doi.clone(),
            issn: m.issn.clone(),
            anio: m.anio,
            cuartil: m.cuartil.clone(),
            tipo: m.tipo.clone(),
            url: m.url.clone(),
            resumen: m.resumen.clone(),
            palabras_clave: m.palabras_clave.clone(),
            pure_id: m.pure_id.clone(),
            created_at: m.created_at,
            updated_at: m.updated_at,
            activo: m.activo,
            handle_url: m.handle_url.clone(),
            fecha_publicacion: m.fecha_publicacion,
            editorial: m.editorial.clone(),
            id_org_unit_editora: m.id_org_unit_editora.clone(),
            revista_titulo: m.revista_titulo.clone(),
            isbn: m.isbn.clone(),
            scimago_cuartil: m.scimago_cuartil.clone(),
            wos_cuartil: m.wos_cuartil.clone(),
            es_revisado_por_pares: m.es_revisado_por_pares,
            acceso_abierto: m.acceso_abierto.clone(),
            idioma: m.idioma.clone(),
            volumen: m.volumen.clone(),
            numero_issue: m.numero_issue.clone(),
            paginas: m.paginas.clone(),
            dominio_origen: m.dominio_origen.clone(),
            pure_uuid: m.pure_uuid.clone(),
            estado_publicacion: m.estado_publicacion.clone(),
            id_proyecto: m.id_proyecto.clone(),
        }
    }
}

impl TryFrom<PublicacionCientificaDto> for PublicacionCientifica {
    type Error = AppError;
    fn try_from(d: PublicacionCientificaDto) -> Result<Self, Self::Error> {
        // Si no hay dominio_origen, completar con default "MANUAL".
        let dominio_origen = if d.dominio_origen.trim().is_empty() {
            DEFAULT_DOMINIO_ORIGEN.to_string()
        } else {
            d.dominio_origen
        };
        Ok(Self {
            id: d.id,
            id_publicacion: d.id_publicacion,
            titulo: d.titulo,
            autores_ids: d.autores_ids,
            revista: d.revista,
            doi: d.doi.clone(),
            issn: d.issn,
            anio: d.anio,
            cuartil: d.cuartil,
            tipo: d.tipo,
            url: d.url,
            resumen: d.resumen,
            palabras_clave: d.palabras_clave,
            pure_id: d.pure_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
            activo: d.activo,
            doi_val: d.doi,
            handle_url: d.handle_url,
            fecha_publicacion: d.fecha_publicacion,
            editorial: d.editorial,
            id_org_unit_editora: d.id_org_unit_editora,
            revista_titulo: d.revista_titulo,
            isbn: d.isbn,
            scimago_cuartil: d.scimago_cuartil,
            wos_cuartil: d.wos_cuartil,
            es_revisado_por_pares: d.es_revisado_por_pares,
            acceso_abierto: d.acceso_abierto,
            idioma: d.idioma,
            volumen: d.volumen,
            numero_issue: d.numero_issue,
            paginas: d.paginas,
            dominio_origen,
            pure_uuid: d.pure_uuid,
            estado_publicacion: d.estado_publicacion,
            id_proyecto: d.id_proyecto,
        })
    }
}

#[cfg(test)]
mod tests_n2f {
    use super::*;

    fn req_base() -> CreatePublicacionRequest {
        CreatePublicacionRequest {
            titulo: "Quantum supremacy revisited".to_string(),
            autores_ids: vec!["inv-1".to_string()],
            revista: Some("Nature".to_string()),
            doi: Some("10.1038/nature.2024.001".to_string()),
            issn: None,
            anio: Some(2024),
            cuartil: Some("Q1".to_string()),
            tipo: crate::shared::vocab_mapper::PUBLICACION_TIPO_ARTICULO.to_string(),
            url: None,
            resumen: None,
            palabras_clave: Vec::new(),
            pure_id: None,
            handle_url: Some("https://hdl.handle.net/20.500.12820/xyz".to_string()),
            fecha_publicacion: Some(1_700_000_000_000),
            editorial: Some("Springer".to_string()),
            id_org_unit_editora: Some("org-publisher".to_string()),
            revista_titulo: Some("Nature Physics".to_string()),
            isbn: None,
            scimago_cuartil: Some("Q1".to_string()),
            wos_cuartil: Some("Q2".to_string()),
            es_revisado_por_pares: true,
            acceso_abierto: Some(
                crate::shared::vocab_mapper::ACCESO_ABIERTO_ACCESO_ABIERTO.to_string(),
            ),
            idioma: Some("en".to_string()),
            volumen: Some("20".to_string()),
            numero_issue: Some("3".to_string()),
            paginas: Some("12-34".to_string()),
            dominio_origen: None,
            pure_uuid: Some("pure-uuid-001".to_string()),
            estado_publicacion: Some("publicada".to_string()),
            id_proyecto: Some("proy-1".to_string()),
        }
    }

    #[test]
    fn new_acepta_publication_minima() {
        let r = CreatePublicacionRequest {
            titulo: "X".to_string(),
            tipo: crate::shared::vocab_mapper::PUBLICACION_TIPO_LIBRO.to_string(),
            autores_ids: vec![],
            doi: None,
            ..Default::default()
        };
        let p = PublicacionCientifica::new("p-1".to_string(), r).unwrap();
        assert_eq!(p.tipo, "libro");
        assert_eq!(
            p.dominio_origen, "MANUAL",
            "dominio_origen default = MANUAL"
        );
        // es_revisado_por_pares lo fija serde default = true; en este test
        // viene de Default::default() = false. El JSON-tagged real (serde)
        // se cubre en el test del request DTO.
    }

    #[test]
    fn new_acepta_campos_completos() {
        let p = PublicacionCientifica::new("p-1".to_string(), req_base()).unwrap();
        assert_eq!(p.doi.as_deref(), Some("10.1038/nature.2024.001"));
        assert_eq!(p.idioma.as_deref(), Some("en"));
        assert_eq!(p.scimago_cuartil.as_deref(), Some("Q1"));
        assert_eq!(p.acceso_abierto.as_deref(), Some("acceso_abierto"));
        assert!(p.es_revisado_por_pares);
    }

    #[test]
    fn new_rechaza_tipo_invalido() {
        let mut r = req_base();
        r.tipo = "diario".to_string();
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("tipo invalido");
        match err {
            AppError::InternalError(m) => assert!(m.contains("tipo")),
            other => panic!("esperaba InternalError, got {other:?}"),
        }
    }

    #[test]
    fn new_rechaza_doi_invalido() {
        let mut r = req_base();
        r.doi = Some("no-es-doi".to_string());
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("doi invalido");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_rechaza_idioma_invalido() {
        let mut r = req_base();
        r.idioma = Some("EN".to_string());
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("idioma invalido");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_rechaza_cuartil_invalido() {
        let mut r = req_base();
        r.scimago_cuartil = Some("Q5".to_string());
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("cuartil invalido");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_rechaza_acceso_abierto_invalido() {
        let mut r = req_base();
        r.acceso_abierto = Some("libre".to_string());
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("acceso invalido");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_rechaza_dominio_origen_invalido() {
        let mut r = req_base();
        r.dominio_origen = Some("SCOPUS".to_string());
        let err = PublicacionCientifica::new("p-1".to_string(), r).expect_err("dominio invalido");
        assert!(matches!(err, AppError::InternalError(_)));
    }

    #[test]
    fn new_trim_a_none_si_vacio() {
        let mut r = req_base();
        r.handle_url = Some("   ".to_string());
        r.editorial = Some("   ".to_string());
        let p = PublicacionCientifica::new("p-1".to_string(), r).unwrap();
        assert!(p.handle_url.is_none());
        assert!(p.editorial.is_none());
    }

    #[test]
    fn dto_round_trip_preserva_campos_nuevos() {
        let p = PublicacionCientifica::new("p-1".to_string(), req_base()).unwrap();
        let d: PublicacionCientificaDto = (&p).into();
        let r = PublicacionCientifica::try_from(d).unwrap();
        assert_eq!(r.doi, p.doi);
        assert_eq!(r.handle_url, p.handle_url);
        assert_eq!(r.fecha_publicacion, p.fecha_publicacion);
        assert_eq!(r.editorial, p.editorial);
        assert_eq!(r.id_org_unit_editora, p.id_org_unit_editora);
        assert_eq!(r.revista_titulo, p.revista_titulo);
        assert_eq!(r.scimago_cuartil, p.scimago_cuartil);
        assert_eq!(r.wos_cuartil, p.wos_cuartil);
        assert_eq!(r.es_revisado_por_pares, p.es_revisado_por_pares);
        assert_eq!(r.acceso_abierto, p.acceso_abierto);
        assert_eq!(r.idioma, p.idioma);
        assert_eq!(r.volumen, p.volumen);
        assert_eq!(r.numero_issue, p.numero_issue);
        assert_eq!(r.paginas, p.paginas);
        assert_eq!(r.dominio_origen, p.dominio_origen);
        assert_eq!(r.pure_uuid, p.pure_uuid);
        assert_eq!(r.estado_publicacion, p.estado_publicacion);
        assert_eq!(r.id_proyecto, p.id_proyecto);
    }
}
