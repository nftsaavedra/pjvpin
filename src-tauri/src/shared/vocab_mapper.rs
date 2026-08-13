//! Mappers entre valores de dominio y codigos SKOS de los vocabularios
//! CONCYTEC.
//!
//! Estos mappers son la frontera entre datos internos (`Persona.sexo`,
//! etiquetas de producto, etc.) y los codigos que exige CONCYTEC/PeruCRIS en
//! su esquema `concytec_terminos`. **No** se persisten en el modelo; se
//! aplican en la capa DTO al exportar hacia PeruCRIS.

/// Tipos de documento de identidad aceptados por PJVPIN.
pub const DOC_TYPE_DNI: &str = "DNI";
pub const DOC_TYPE_CE: &str = "CE";
pub const DOC_TYPE_PASAPORTE: &str = "PASAPORTE";

/// Conjuntos enumerados canonicos. Se usan para validacion en `Model::new()`
/// en features donde la cardinalidad es cerrada. Cuando el conjunto es
/// controlado por un vocabulario CONCYTEC (ej. `tipo_organizacion`,
/// `tipo_proyecto`), el conjunto se consulta en tiempo de escritura via
/// `shared::refs::ensure_vocab_active`.

/// Roles aceptados en `participaciones.rol` (project_members).
pub const ROLE_INVESTIGADOR_PRINCIPAL: &str = "INVESTIGADOR_PRINCIPAL";
pub const ROLE_CO_INVESTIGADOR: &str = "CO_INVESTIGADOR";
pub const ROLE_TESISTA: &str = "TESISTA";
pub const ROLE_ASISTENTE_INVESTIGACION: &str = "ASISTENTE_INVESTIGACION";
pub const ROLE_ASISTENTE_ADMINISTRATIVO: &str = "ASISTENTE_ADMINISTRATIVO";

pub const ROLES_VALIDOS: &[&str] = &[
    ROLE_INVESTIGADOR_PRINCIPAL,
    ROLE_CO_INVESTIGADOR,
    ROLE_TESISTA,
    ROLE_ASISTENTE_INVESTIGACION,
    ROLE_ASISTENTE_ADMINISTRATIVO,
];

/// Roles de org unit en un proyecto (project_organizations).
pub const ORG_ROL_EJECUTORA: &str = "EJECUTORA";
pub const ORG_ROL_CO_EJECUTORA: &str = "CO_EJECUTORA";
pub const ORG_ROL_PATROCINADORA: &str = "PATROCINADORA";
pub const ORG_ROL_COLABORADORA: &str = "COLABORADORA";

pub const ORG_ROLES_VALIDOS: &[&str] = &[
    ORG_ROL_EJECUTORA,
    ORG_ROL_CO_EJECUTORA,
    ORG_ROL_PATROCINADORA,
    ORG_ROL_COLABORADORA,
];

/// Tipos de patente (catalogo interno alineado con el subconjunto CONCYTEC).
pub const PATENTE_TIPO_INVENCION: &str = "invencion";
pub const PATENTE_TIPO_MODELO_UTILIDAD: &str = "modelo_utilidad";
pub const PATENTE_TIPO_DISENO_INDUSTRIAL: &str = "diseno_industrial";

pub const PATENTES_TIPOS_VALIDOS: &[&str] = &[
    PATENTE_TIPO_INVENCION,
    PATENTE_TIPO_MODELO_UTILIDAD,
    PATENTE_TIPO_DISENO_INDUSTRIAL,
];

/// Cuartiles Scimago/WoS aceptados.
pub const CUARTIL_Q1: &str = "Q1";
pub const CUARTIL_Q2: &str = "Q2";
pub const CUARTIL_Q3: &str = "Q3";
pub const CUARTIL_Q4: &str = "Q4";

pub const CUARTILES_VALIDOS: &[&str] = &[CUARTIL_Q1, CUARTIL_Q2, CUARTIL_Q3, CUARTIL_Q4];

/// Proveniencia de una publicacion (Pure sync vs captura manual).
pub const DEFAULT: &str = "MANUAL";
pub const DOMINIO_ORIGEN_MANUAL: &str = DEFAULT;
pub const DOMINIO_ORIGEN_PURE: &str = "PURE";

pub const DOMINIOS_ORIGEN_VALIDOS: &[&str] = &[DOMINIO_ORIGEN_MANUAL, DOMINIO_ORIGEN_PURE];

/// Tipos de entidad soportados por `entity_ocde_fields.entity_type` (pivote
/// polimorfico). Mantener sincronizado con los `entity_type` que los repos de
/// proyectos / equipamiento / org_units / patentes invocan al limpiar.
pub const ENTITY_TYPE_PROJECT: &str = "PROJECT";
pub const ENTITY_TYPE_EQUIPMENT: &str = "EQUIPMENT";
pub const ENTITY_TYPE_ORG_UNIT: &str = "ORG_UNIT";
pub const ENTITY_TYPE_PATENT: &str = "PATENT";

pub const ENTITY_TYPES_VALIDOS: &[&str] = &[
    ENTITY_TYPE_PROJECT,
    ENTITY_TYPE_EQUIPMENT,
    ENTITY_TYPE_ORG_UNIT,
    ENTITY_TYPE_PATENT,
];

/// Tipos de holder para `patente_titulares`.
pub const HOLDER_TYPE_ORG_UNIT: &str = "ORG_UNIT";
pub const HOLDER_TYPE_PERSON: &str = "PERSON";

pub const HOLDER_TYPES_VALIDOS: &[&str] = &[HOLDER_TYPE_ORG_UNIT, HOLDER_TYPE_PERSON];

/// Tipos de publicacion aceptados (subconjunto de `concytec_terminos`).
/// Incluye los terminos en espanol y los CERIF/PeruCRIS en ingles para
/// interoperabilidad.
pub const PUBLICACION_TIPO_ARTICULO: &str = "articulo";
pub const PUBLICACION_TIPO_ARTICULO_REVISTA: &str = "articulo_revista";
pub const PUBLICACION_TIPO_ARTICULO_CONFERENCIA: &str = "articulo_conferencia";
pub const PUBLICACION_TIPO_CARTA: &str = "carta";
pub const PUBLICACION_TIPO_RESENA: &str = "resena";
pub const PUBLICACION_TIPO_COMUNICACION_CONGRESO: &str = "comunicacion_congreso";
pub const PUBLICACION_TIPO_LIBRO: &str = "libro";
pub const PUBLICACION_TIPO_CAPITULO_LIBRO: &str = "capitulo_libro";
pub const PUBLICACION_TIPO_SOFTWARE: &str = "software";
pub const PUBLICACION_TIPO_TESIS: &str = "tesis";
pub const PUBLICACION_TIPO_JOURNAL_ARTICLE: &str = "journal article";
pub const PUBLICACION_TIPO_CONFERENCE_PAPER: &str = "conference paper";
pub const PUBLICACION_TIPO_LETTER: &str = "letter";
pub const PUBLICACION_TIPO_REVIEW: &str = "review";

pub const PUBLICACIONES_TIPOS_VALIDOS: &[&str] = &[
    PUBLICACION_TIPO_ARTICULO,
    PUBLICACION_TIPO_ARTICULO_REVISTA,
    PUBLICACION_TIPO_ARTICULO_CONFERENCIA,
    PUBLICACION_TIPO_CARTA,
    PUBLICACION_TIPO_RESENA,
    PUBLICACION_TIPO_COMUNICACION_CONGRESO,
    PUBLICACION_TIPO_LIBRO,
    PUBLICACION_TIPO_CAPITULO_LIBRO,
    PUBLICACION_TIPO_SOFTWARE,
    PUBLICACION_TIPO_TESIS,
    PUBLICACION_TIPO_JOURNAL_ARTICLE,
    PUBLICACION_TIPO_CONFERENCE_PAPER,
    PUBLICACION_TIPO_LETTER,
    PUBLICACION_TIPO_REVIEW,
];

/// Terminos del vocabulario `concytec_terminos` para `acceso_abierto`.
pub const ACCESO_ABIERTO_ACCESO_ABIERTO: &str = "acceso_abierto";
pub const ACCESO_ABIERTO_SOLO_METADATOS: &str = "solo_metadatos";
pub const ACCESO_ABIERTO_EMBARGADO: &str = "embargado";

pub const ACCESO_ABIERTO_VALIDOS: &[&str] = &[
    ACCESO_ABIERTO_ACCESO_ABIERTO,
    ACCESO_ABIERTO_SOLO_METADATOS,
    ACCESO_ABIERTO_EMBARGADO,
];

/// Valida que un valor pertenezca al conjunto de tipos de publicacion.
pub fn is_allowed_publication_tipo(tipo: &str) -> bool {
    PUBLICACIONES_TIPOS_VALIDOS.iter().any(|t| *t == tipo)
}

/// Valida que el valor de `acceso_abierto` este en el conjunto canonico.
pub fn is_acceso_abierto_valor(valor: Option<&str>) -> bool {
    match valor {
        None => true,
        Some(v) => ACCESO_ABIERTO_VALIDOS.iter().any(|a| *a == v),
    }
}

/// Mapea el sexo interno (`Persona.sexo`) a un codigo SKOS del vocabulario
/// `concytec_terminos`. Devuelve `None` cuando no hay valor o no se reconoce.
pub fn genero_to_skos(sexo: Option<&str>) -> Option<&'static str> {
    match sexo.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(s)
            if s.eq_ignore_ascii_case("M")
                || s.eq_ignore_ascii_case("masculino")
                || s.eq_ignore_ascii_case("male") =>
        {
            Some("masculino")
        }
        Some(s)
            if s.eq_ignore_ascii_case("F")
                || s.eq_ignore_ascii_case("femenino")
                || s.eq_ignore_ascii_case("female") =>
        {
            Some("femenino")
        }
        _ => None,
    }
}

/// Mapea el codigo CONCYTEC de naturaleza de institucion a un bool
/// (`publica` -> true). Utilizado al persistir `org_units.es_publica`.
pub fn naturaleza_to_bool(codigo: &str) -> Option<bool> {
    match codigo.trim().to_ascii_lowercase().as_str() {
        "publica" | "publico" => Some(true),
        "privada" | "privado" => Some(false),
        _ => None,
    }
}

/// Valida que un cuartil este en el conjunto canonico. Util para `Model::new()`.
pub fn is_cuartil_valor(valor: Option<&str>) -> bool {
    match valor {
        None => true,
        Some(v) => CUARTILES_VALIDOS.iter().any(|c| *c == v),
    }
}

/// Valida que una cadena sea un codigo ISO 4217 (3 letras ASCII uppercase).
pub fn is_iso_4217(moneda: &str) -> bool {
    moneda.len() == 3 && moneda.chars().all(|c| c.is_ascii_uppercase())
}

/// Valida que un codigo de idioma sea un ISO 639-1 plausible (2 letras
/// lowercase). No valida contra la lista oficial, solo el formato.
pub fn is_iso_639_1(idioma: &str) -> bool {
    idioma.len() == 2 && idioma.chars().all(|c| c.is_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn genero_maps_basic() {
        assert_eq!(genero_to_skos(Some("M")), Some("masculino"));
        assert_eq!(genero_to_skos(Some("F")), Some("femenino"));
        assert_eq!(genero_to_skos(Some("masculino")), Some("masculino"));
        assert_eq!(genero_to_skos(Some("female")), Some("femenino"));
        assert_eq!(genero_to_skos(None), None);
        assert_eq!(genero_to_skos(Some("   ")), None);
        assert_eq!(genero_to_skos(Some("otro")), None);
    }

    #[test]
    fn naturaleza_bool() {
        assert_eq!(naturaleza_to_bool("publica"), Some(true));
        assert_eq!(naturaleza_to_bool("privada"), Some(false));
        assert_eq!(naturaleza_to_bool("otro"), None);
    }

    #[test]
    fn cuartil_validator() {
        assert!(is_cuartil_valor(None));
        assert!(is_cuartil_valor(Some("Q1")));
        assert!(!is_cuartil_valor(Some("Q5")));
    }

    #[test]
    fn iso_4217_validator() {
        assert!(is_iso_4217("PEN"));
        assert!(is_iso_4217("USD"));
        assert!(!is_iso_4217("pesos"));
        assert!(!is_iso_4217("PE"));
        assert!(!is_iso_4217("PENs"));
    }

    #[test]
    fn iso_639_1_validator() {
        assert!(is_iso_639_1("es"));
        assert!(is_iso_639_1("en"));
        assert!(!is_iso_639_1("ES"));
        assert!(!is_iso_639_1("eng"));
    }
}
