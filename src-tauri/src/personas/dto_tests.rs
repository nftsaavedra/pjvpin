//! Regression guard: confirma que el wire format de los DTOs de `personas`
//! acepta los campos esperados desde el frontend.

use crate::personas::dto::{CreatePersonaRequest, PersonaDto};

#[test]
fn persona_dto_roundtrip_preserva_campos() {
    let dto = PersonaDto {
        id_persona: "p-1".to_string(),
        dni: "45678912".to_string(),
        nombres: Some("Maria".to_string()),
        apellido_paterno: Some("Perez".to_string()),
        apellido_materno: Some("Gomez".to_string()),
        nombre_completo: "Maria Perez Gomez".to_string(),
        correo: Some("maria@example.com".to_string()),
        telefono: None,
        direccion: None,
        sexo: Some("F".to_string()),
        fecha_nacimiento: Some(800000000000),
        activo: 1,
        created_at: Some(1700000000000),
        updated_at: None,
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    let back: PersonaDto = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.id_persona, "p-1");
    assert_eq!(back.dni, "45678912");
    assert_eq!(back.nombre_completo, "Maria Perez Gomez");
    assert_eq!(back.correo.as_deref(), Some("maria@example.com"));
}

#[test]
fn create_persona_request_campos_obligatorios_presentes() {
    let json = r#"{
        "dni": "45678912",
        "nombres": "Maria",
        "apellido_paterno": "Perez",
        "apellido_materno": "Gomez",
        "correo": "maria@example.com"
    }"#;
    let req: CreatePersonaRequest = serde_json::from_str(json).expect("parse");
    assert_eq!(req.dni, "45678912");
    assert_eq!(req.nombres, "Maria");
    assert_eq!(req.apellido_paterno, "Perez");
    assert_eq!(req.apellido_materno.as_deref(), Some("Gomez"));
}
