//! Regression guard: confirma que el wire format de los DTOs de `eventos`
//! acepta camelCase desde el frontend sin perder campos multi-word.

use crate::eventos::dto::{CreateEventoRequest, EventoAcademicoDto, ParticipanteEventoDto};

#[test]
fn evento_dto_roundtrip_preserva_campos() {
    let dto = EventoAcademicoDto {
        id: "ev-1".to_string(),
        id_evento: "ev-1".to_string(),
        nombre: "Congreso X".to_string(),
        tipo: "conferencia".to_string(),
        fecha_inicio: Some(1700000000000),
        fecha_fin: Some(1700100000000),
        lugar: Some("Lima".to_string()),
        descripcion: None,
        participantes: vec![ParticipanteEventoDto {
            investigador_id: "inv-1".to_string(),
            rol: "ponente".to_string(),
        }],
        created_at: Some(1700000000000),
        updated_at: None,
        activo: 1,
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    let back: EventoAcademicoDto = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.id_evento, "ev-1");
    assert_eq!(back.nombre, "Congreso X");
    assert_eq!(back.participantes.len(), 1);
    assert_eq!(back.participantes[0].investigador_id, "inv-1");
}

#[test]
fn create_evento_request_accepts_camel_case_keys() {
    let json = r#"{
        "nombre": "Seminario Y",
        "tipo": "seminario",
        "fechaInicio": 1700000000000,
        "participantes": [
            { "investigadorId": "inv-1", "rol": "asistente" }
        ]
    }"#;
    let req: CreateEventoRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(req.nombre, "Seminario Y");
    assert_eq!(req.fecha_inicio, Some(1700000000000));
    assert_eq!(req.participantes.len(), 1);
    assert_eq!(req.participantes[0].investigador_id, "inv-1");
}
