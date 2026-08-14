//! Tests del modelo `ocde` (puro, sin MongoDB).

use crate::ocde::models::EntidadCampoOcde;

#[test]
fn new_acepta_valido() {
    let m = EntidadCampoOcde::new(
        "1".to_string(),
        crate::shared::vocab_mapper::ENTITY_TYPE_PROJECT.to_string(),
        "p-1".to_string(),
        "1.1".to_string(),
    )
    .unwrap();
    assert_eq!(m.entity_type, "PROJECT");
    assert_eq!(m.entity_id, "p-1");
    assert_eq!(m.ocde_codigo, "1.1");
}

#[test]
fn new_acepta_los_4_entity_types() {
    for et in crate::shared::vocab_mapper::ENTITY_TYPES_VALIDOS {
        let m = EntidadCampoOcde::new(
            "1".to_string(),
            et.to_string(),
            "any".to_string(),
            "1".to_string(),
        )
        .unwrap_or_else(|e| panic!("entity_type {et} rechazado: {e:?}"));
        assert_eq!(m.entity_type, *et);
    }
}

#[test]
fn new_rechaza_entity_type_invalido() {
    let r = EntidadCampoOcde::new(
        "1".to_string(),
        "PUBMED".to_string(),
        "p".to_string(),
        "1".to_string(),
    );
    assert!(r.is_err());
}

#[test]
fn new_rechaza_id_vacio() {
    let r = EntidadCampoOcde::new(
        "  ".to_string(),
        crate::shared::vocab_mapper::ENTITY_TYPE_PROJECT.to_string(),
        "p".to_string(),
        "1".to_string(),
    );
    assert!(r.is_err());
}

#[test]
fn new_rechaza_entity_id_vacio() {
    let r = EntidadCampoOcde::new(
        "1".to_string(),
        crate::shared::vocab_mapper::ENTITY_TYPE_PROJECT.to_string(),
        "  ".to_string(),
        "1".to_string(),
    );
    assert!(r.is_err());
}

#[test]
fn new_rechaza_ocde_codigo_vacio() {
    let r = EntidadCampoOcde::new(
        "1".to_string(),
        crate::shared::vocab_mapper::ENTITY_TYPE_PROJECT.to_string(),
        "p".to_string(),
        "".to_string(),
    );
    assert!(r.is_err());
}

#[test]
fn new_trim() {
    let m = EntidadCampoOcde::new(
        "1".to_string(),
        "  PROJECT  ".to_string(),
        "  p-1 ".to_string(),
        "  1.1 ".to_string(),
    )
    .unwrap();
    assert_eq!(m.entity_type, "PROJECT");
    assert_eq!(m.entity_id, "p-1");
    assert_eq!(m.ocde_codigo, "1.1");
}
