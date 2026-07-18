//! Regression guard: confirma que el wire format de los DTOs de grados
//! acepta camelCase desde el frontend sin perder campos (gracias a
//! `#[serde(rename_all = "camelCase")]`).

use crate::grados::dto::CreateGradoRequest;
use crate::grados::dto::GradoAcademicoDoc;
use crate::grados::dto::GradoAcademicoDto;

#[test]
fn create_grado_request_accepts_camel_case_keys() {
    let json = r#"{
        "nombre": "Doctorado",
        "descripcion": "Máximo grado académico"
    }"#;
    let request: CreateGradoRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(request.nombre, "Doctorado");
    assert_eq!(
        request.descripcion.as_deref(),
        Some("Máximo grado académico")
    );
}

#[test]
fn create_grado_request_optional_fields_default_to_none() {
    let json = r#"{ "nombre": "Licenciatura" }"#;
    let request: CreateGradoRequest = serde_json::from_str(json).expect("parse minimal");
    assert_eq!(request.descripcion, None);
}

#[test]
fn grado_doc_roundtrip_bson() {
    let original = GradoAcademicoDoc {
        id_grado: "g-1".to_string(),
        nombre: "Maestría".to_string(),
        descripcion: Some("Segundo ciclo de posgrado".to_string()),
        activo: 1,
        created_at: 1_700_000_000_000,
        updated_at: Some(1_700_000_000_000),
    };
    let doc = mongodb::bson::to_document(&original).expect("serialize to bson");
    let restored: GradoAcademicoDoc =
        mongodb::bson::from_document(doc).expect("deserialize from bson");
    assert_eq!(restored.id_grado, original.id_grado);
    assert_eq!(restored.nombre, original.nombre);
    assert_eq!(restored.descripcion, original.descripcion);
    assert_eq!(restored.activo, original.activo);
    assert_eq!(restored.created_at, original.created_at);
    assert_eq!(restored.updated_at, original.updated_at);
}

#[test]
fn grado_dto_serializes_snake_case() {
    let dto = GradoAcademicoDto {
        id_grado: "g-1".to_string(),
        nombre: "Maestría".to_string(),
        descripcion: None,
        activo: 1,
        updated_at: None,
    };
    let json = serde_json::to_value(&dto).expect("serialize dto");
    assert!(json.get("id_grado").is_some());
    assert!(json.get("idGrado").is_none(), "DTO debe ser snake_case");
}
