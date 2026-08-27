//! Regression guard: confirma que el wire format de los DTOs de `geo`
//! acepta snake_case desde el frontend (convencion del proyecto).

use crate::geo::dto::{UbigeoDoc, UbigeoDto};

#[test]
fn ubigeo_doc_roundtrip_preserva_campos() {
    let doc = UbigeoDoc {
        codigo: "010101".to_string(),
        departamento: "Amazonas".to_string(),
        provincia: "Chachapoyas".to_string(),
        distrito: "Chachapoyas".to_string(),
        activo: 1,
        created_at: Some(1700000000000),
        updated_at: None,
    };
    let json = serde_json::to_string(&doc).expect("serializar");
    let back: UbigeoDoc = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.codigo, "010101");
    assert_eq!(back.departamento, "Amazonas");
    assert_eq!(back.provincia, "Chachapoyas");
    assert_eq!(back.distrito, "Chachapoyas");
    assert_eq!(back.activo, 1);
    assert_eq!(back.updated_at, None);
}

#[test]
fn ubigeo_dto_roundtrip_preserva_campos() {
    let dto = UbigeoDto {
        codigo: "150101".to_string(),
        departamento: "Lima".to_string(),
        provincia: "Lima".to_string(),
        distrito: "Lima".to_string(),
        updated_at: Some(1700000000000),
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    let back: UbigeoDto = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.codigo, "150101");
    assert_eq!(back.departamento, "Lima");
}
