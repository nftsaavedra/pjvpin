//! Regression guard: confirma que el wire format de los DTOs de catalogos
//! acepta camelCase desde el frontend sin perder campos (gracias a
//! `#[serde(rename_all = "camelCase")]`).

use crate::catalogos::dto::CreateCatalogoRequest;
use crate::catalogos::dto::{CatalogoItemDoc, CatalogoItemDto};
use crate::personas::dto::PersonaDeUsuarioDto;

#[test]
fn create_catalogo_request_accepts_camel_case_keys() {
    let json = r#"{
        "tipo": "moneda",
        "codigo": "USD",
        "nombre": "Dólar",
        "descripcion": "Dólar estadounidense",
        "orden": 2
    }"#;
    let request: CreateCatalogoRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(request.tipo, "moneda");
    assert_eq!(request.codigo, "USD");
    assert_eq!(request.nombre, "Dólar");
    assert_eq!(request.descripcion.as_deref(), Some("Dólar estadounidense"));
    assert_eq!(request.orden, Some(2));
}

#[test]
fn create_catalogo_request_optional_fields_default_to_none() {
    let json = r#"{ "tipo": "moneda", "codigo": "PEN", "nombre": "Sol" }"#;
    let request: CreateCatalogoRequest = serde_json::from_str(json).expect("parse minimal");
    assert_eq!(request.descripcion, None);
    assert_eq!(request.orden, None);
}

#[test]
fn catalogo_item_doc_roundtrip_bson() {
    let original = CatalogoItemDoc {
        id_catalogo: "cat-1".to_string(),
        tipo: "moneda".to_string(),
        codigo: "USD".to_string(),
        nombre: "Dólar".to_string(),
        descripcion: Some("Dólar estadounidense".to_string()),
        orden: Some(2),
        activo: 1,
        created_at: 1_700_000_000_000,
        updated_at: Some(1_700_000_000_000),
    };
    let doc = mongodb::bson::to_document(&original).expect("serialize to bson");
    let restored: CatalogoItemDoc =
        mongodb::bson::from_document(doc).expect("deserialize from bson");
    assert_eq!(restored.id_catalogo, original.id_catalogo);
    assert_eq!(restored.tipo, original.tipo);
    assert_eq!(restored.codigo, original.codigo);
    assert_eq!(restored.nombre, original.nombre);
    assert_eq!(restored.descripcion, original.descripcion);
    assert_eq!(restored.orden, original.orden);
    assert_eq!(restored.activo, original.activo);
    assert_eq!(restored.created_at, original.created_at);
    assert_eq!(restored.updated_at, original.updated_at);
}

#[test]
fn catalogo_item_dto_serializes_snake_case() {
    let dto = CatalogoItemDto {
        id_catalogo: "cat-1".to_string(),
        tipo: "moneda".to_string(),
        codigo: "USD".to_string(),
        nombre: "Dólar".to_string(),
        descripcion: None,
        orden: None,
        activo: 1,
        updated_at: None,
    };
    let json = serde_json::to_value(&dto).expect("serialize dto");
    assert!(json.get("id_catalogo").is_some());
    assert!(json.get("updated_at").is_some());
    // Frontend TS expects snake_case keys.
    assert!(json.get("idCatalogo").is_none(), "DTO debe ser snake_case");
}

#[test]
fn persona_de_usuario_dto_serializes_snake_case() {
    let dto = PersonaDeUsuarioDto {
        id_persona: "per-1".to_string(),
        dni: "12345678".to_string(),
        nombres: "Juan".to_string(),
        apellido_paterno: "Pérez".to_string(),
        apellido_materno: Some("García".to_string()),
        nombre_completo: "Juan Pérez García".to_string(),
    };
    let json = serde_json::to_value(&dto).expect("serialize persona dto");
    assert_eq!(json["id_persona"], "per-1");
    assert_eq!(json["apellido_paterno"], "Pérez");
    assert_eq!(json["apellido_materno"], "García");
}
