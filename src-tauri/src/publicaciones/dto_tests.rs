//! Regression guard: confirma que el wire format de los DTOs de
//! `publicaciones` acepta camelCase desde el frontend sin perder campos
//! multi-word (alineamiento N2-F CONCYTEC/PeruCRIS).

use crate::publicaciones::dto::{CreatePublicacionRequest, PublicacionCientificaDto};

#[test]
fn publicacion_dto_roundtrip_preserva_campos() {
    let dto = PublicacionCientificaDto {
        id: "p-1".to_string(),
        id_publicacion: "p-1".to_string(),
        titulo: "Quantum supremacy revisited".to_string(),
        doi: Some("10.1038/nature.2024.001".to_string()),
        issn: Some("1745-2481".to_string()),
        anio: Some(2024),
        cuartil: None,
        tipo: "journal article".to_string(),
        resumen: None,
        palabras_clave: vec!["quantum".to_string()],
        created_at: Some(1700000000000),
        updated_at: None,
        activo: 1,
        handle_url: None,
        fecha_publicacion: None,
        editorial: None,
        id_org_unit_editora: None,
        revista_titulo: Some("Nature Physics".to_string()),
        isbn: None,
        scimago_cuartil: None,
        wos_cuartil: None,
        es_revisado_por_pares: true,
        acceso_abierto: None,
        idioma: None,
        volumen: None,
        numero_issue: None,
        paginas: None,
        dominio_origen: "PURE".to_string(),
        pure_uuid: Some("pure-uuid-001".to_string()),
        estado_publicacion: Some("published".to_string()),
        id_proyecto: None,
        perucris_uuid: None,
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    let back: PublicacionCientificaDto = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.titulo, "Quantum supremacy revisited");
    assert_eq!(back.doi.as_deref(), Some("10.1038/nature.2024.001"));
    assert_eq!(back.dominio_origen, "PURE");
    assert_eq!(back.pure_uuid.as_deref(), Some("pure-uuid-001"));
}

#[test]
fn create_publicacion_request_accepts_camel_case_keys() {
    let json = r#"{
        "titulo": "Quantum supremacy revisited",
        "anio": 2024,
        "tipo": "journal article",
        "doi": "10.1038/nature.2024.001",
        "issn": "1745-2481",
        "revistaTitulo": "Nature Physics",
        "pureUuid": "pure-uuid-001",
        "estadoPublicacion": "published",
        "dominioOrigen": "PURE"
    }"#;
    let req: CreatePublicacionRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(req.titulo, "Quantum supremacy revisited");
    assert_eq!(req.revista_titulo.as_deref(), Some("Nature Physics"));
    assert_eq!(req.pure_uuid.as_deref(), Some("pure-uuid-001"));
    assert_eq!(req.estado_publicacion.as_deref(), Some("published"));
}

#[test]
fn create_publicacion_request_minimo_titulo_y_tipo() {
    let json = r#"{ "titulo": "X", "tipo": "articulo" }"#;
    let req: CreatePublicacionRequest = serde_json::from_str(json).expect("parse minimal");
    assert_eq!(req.titulo, "X");
    assert_eq!(req.tipo, "articulo");
    assert_eq!(req.anio, None);
    assert_eq!(req.palabras_clave.len(), 0);
}
