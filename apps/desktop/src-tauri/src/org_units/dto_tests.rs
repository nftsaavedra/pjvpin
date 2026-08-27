//! Regression guard: confirma que el wire format de los DTOs de `org_units`
//! acepta camelCase desde el frontend sin perder campos multi-word.
//!
//! `OrgUnitDto` (IPC salida) es solo `Serialize`; `OrgUnitDoc` (BSON) si
//! implementa `Deserialize` para round-trip con Mongo.

use crate::org_units::dto::{CreateOrgUnitRequest, OrgUnitDoc, OrgUnitDto};

#[test]
fn org_unit_doc_roundtrip_preserva_campos() {
    let doc = OrgUnitDoc {
        id_org_unit: "ou-1".to_string(),
        nombre: "UNF".to_string(),
        ubigeo_codigo: None,
        ruc: Some("20123456789".to_string()),
        ror_id: None,
        isni_id: None,
        scopus_id: None,
        sector_institucional: Some("publico".to_string()),
        tipo_organizacion: "universidad".to_string(),
        tipo_dependencia: None,
        tipo_educacion_superior: Some("publica".to_string()),
        ciiu_codigo: None,
        es_publica: true,
        parent_id: None,
        activo: 1,
        created_at: Some(1700000000000),
        updated_at: None,
        legal_name: None,
        acronimo: None,
        web_site: None,
        direccion: None,
        pais: Some("PE".to_string()),
        descripcion: None,
        rin_id: None,
        sunedu_clasificacion: None,
        sunedu_estado: None,
        sunedu_resolucion: None,
        perucris_uuid: None,
        perucris_handle: None,
    };
    let json = serde_json::to_string(&doc).expect("serializar");
    let back: OrgUnitDoc = serde_json::from_str(&json).expect("deserializar");
    assert_eq!(back.id_org_unit, "ou-1");
    assert_eq!(back.nombre, "UNF");
    assert_eq!(back.ruc.as_deref(), Some("20123456789"));
    assert_eq!(back.pais.as_deref(), Some("PE"));
}

#[test]
fn org_unit_dto_serializa_sin_activo() {
    let dto = OrgUnitDto {
        id_org_unit: "ou-1".to_string(),
        nombre: "UNF".to_string(),
        ubigeo_codigo: None,
        ruc: None,
        ror_id: None,
        isni_id: None,
        scopus_id: None,
        sector_institucional: None,
        tipo_organizacion: "universidad".to_string(),
        tipo_dependencia: None,
        tipo_educacion_superior: None,
        ciiu_codigo: None,
        es_publica: true,
        parent_id: None,
        updated_at: None,
        legal_name: None,
        acronimo: None,
        web_site: None,
        direccion: None,
        pais: None,
        descripcion: None,
        rin_id: None,
        sunedu_clasificacion: None,
        sunedu_estado: None,
        sunedu_resolucion: None,
        perucris_uuid: None,
        perucris_handle: None,
    };
    let json = serde_json::to_string(&dto).expect("serializar");
    assert!(json.contains("\"id_org_unit\":\"ou-1\""));
    assert!(json.contains("\"es_publica\":true"));
    assert!(
        !json.contains("\"activo\""),
        "DTO no expone flag interno activo"
    );
}

#[test]
fn create_org_unit_request_accepts_camel_case_keys() {
    let json = r#"{
        "nombre": "Facultad X",
        "tipoOrganizacion": "facultad",
        "esPublica": true,
        "padreId": "ou-root"
    }"#;
    let req: CreateOrgUnitRequest = serde_json::from_str(json).expect("parse camelCase");
    assert_eq!(req.nombre, "Facultad X");
    assert_eq!(req.tipo_organizacion, "facultad");
    assert!(req.es_publica);
}
