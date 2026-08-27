//! Regression guard: confirma que el wire format de los DTOs de `grupos`
//! acepta camelCase desde el frontend sin perder campos multi-word.

use crate::grupos::dto::{
    CreateGrupoInvestigacionRequest, GrupoInvestigacionDto, UpdateGrupoInvestigacionRequest,
};
use crate::grupos::models::GrupoInvestigacion;

#[test]
fn grupo_dto_roundtrip_preserva_campos() {
    let dto = GrupoInvestigacionDto {
        id_grupo: "g-1".to_string(),
        nombre: "GIA".to_string(),
        descripcion: Some("Grupo IA".to_string()),
        coordinador_id: Some("inv-1".to_string()),
        lineas_investigacion: vec!["ML".to_string(), "NLP".to_string()],
        activo: 1,
        created_at: Some(1700000000000),
        updated_at: None,
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    let back: GrupoInvestigacionDto = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.id_grupo, "g-1");
    assert_eq!(back.nombre, "GIA");
    assert_eq!(back.coordinador_id.as_deref(), Some("inv-1"));
    assert_eq!(back.lineas_investigacion.len(), 2);
}

#[test]
fn create_grupo_request_accepts_camel_case_keys() {
    let json = r#"{
        "nombre": "GIB",
        "descripcion": "Grupo Bio",
        "coordinadorId": "inv-2",
        "lineasInvestigacion": ["Genomica"]
    }"#;
    let req: CreateGrupoInvestigacionRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(req.nombre, "GIB");
    assert_eq!(req.coordinador_id.as_deref(), Some("inv-2"));
    assert_eq!(req.lineas_investigacion, vec!["Genomica"]);
}

#[test]
fn update_grupo_request_accepts_camel_case_keys() {
    let json = r#"{
        "nombre": "GIB-v2",
        "lineasInvestigacion": []
    }"#;
    let req: UpdateGrupoInvestigacionRequest = serde_json::from_str(json).expect("parse");
    assert_eq!(req.nombre, "GIB-v2");
    assert_eq!(req.lineas_investigacion.len(), 0);
    assert!(req.descripcion.is_none());
}

#[test]
fn grupo_modelo_new_rechaza_nombre_vacio() {
    use crate::grupos::dto::CreateGrupoInvestigacionRequest;
    let req = CreateGrupoInvestigacionRequest {
        nombre: String::new(),
        descripcion: None,
        coordinador_id: None,
        lineas_investigacion: vec![],
    };
    let res = GrupoInvestigacion::new("g-1".to_string(), req);
    assert!(res.is_err(), "nombre vacio debe rechazarse");
}
