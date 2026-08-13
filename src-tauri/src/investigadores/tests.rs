//! Tests unitarios del modulo `investigadores`.
//!
//! Solo cubren la logica de dominio pura (modelos + RENACYT refresh),
//! que NO requiere MongoDB. La capa de repositorio y handlers se prueba
//! indirectamente via el flujo `npm run tauri:dev` + interfaz grafica.
//!
//! Historial: este modulo existia como placeholder `#[ignore]` desde la
//! migracion Investigador→Persona. Phase I.11 lo pobla con cobertura real.

#[cfg(test)]
mod tests {
    use crate::investigadores::dto::{
        CreateInvestigadorRenacytRequest, CreateInvestigadorRequest, InvestigadorDto,
        RenacytLookupResult,
    };
    use crate::investigadores::models::Investigador;
    use crate::shared::error::AppError;

    fn request_minimo() -> CreateInvestigadorRequest {
        CreateInvestigadorRequest {
            dni: "45678912".to_string(),
            id_grado: "g1".to_string(),
            nombres: "Maria".to_string(),
            apellido_paterno: "Lopez".to_string(),
            apellido_materno: Some("Diaz".to_string()),
            correo: None,
            telefono: None,
            direccion: None,
            sexo: None,
            fecha_nacimiento: None,
            perfil: "docente".to_string(),
            renacyt: None,
            tipo_documento: None,
        }
    }

    #[test]
    fn new_asigna_campos_basicos_y_normaliza_perfil() {
        let req = request_minimo();
        let inv = Investigador::new("inv-1".to_string(), &req).expect("modelo valido");
        assert_eq!(inv.id_investigador, "inv-1");
        assert_eq!(inv.persona_id, ""); // todavia sin asignar via `with_persona_id`
        assert_eq!(inv.id_grado, "g1");
        assert_eq!(inv.activo, 1);
        assert_eq!(inv.perfil, "docente");
        assert!(inv.updated_at.is_some());
        assert!(inv.renacyt_codigo_registro.is_none());
        assert!(inv.renacyt_formaciones_academicas_json.is_none());
    }

    #[test]
    fn new_rechaza_id_vacio() {
        let req = request_minimo();
        let err = Investigador::new("   ".to_string(), &req).expect_err("id vacio debe rechazarse");
        assert!(matches!(err, AppError::InternalError(_)), "got {err:?}");
    }

    #[test]
    fn new_normaliza_perfil_invalido_a_docente() {
        let mut req = request_minimo();
        req.perfil = "rol-no-canonico".to_string();
        let inv = Investigador::new("inv-x".to_string(), &req).unwrap();
        assert_eq!(
            inv.perfil, "docente",
            "perfil invalido cae al default docente"
        );
    }

    #[test]
    fn new_normaliza_perfiles_canonicos_alumno_tesista() {
        for (input, expected) in [
            ("docente", "docente"),
            ("tesista", "tesista"),
            ("alumno_egresado", "alumno_egresado"),
        ] {
            let mut req = request_minimo();
            req.perfil = input.to_string();
            let inv = Investigador::new("inv-x".to_string(), &req).unwrap();
            assert_eq!(inv.perfil, expected);
        }
    }

    #[test]
    fn new_persiste_renacyt_minimo_y_set_fecha_sincronizacion() {
        let mut req = request_minimo();
        req.renacyt = Some(CreateInvestigadorRenacytRequest {
            codigo_registro: "REG-001".to_string(),
            id_investigador: "REN-001".to_string(),
            nivel: Some("I".to_string()),
            grupo: Some("A".to_string()),
            condicion: Some("Activo".to_string()),
            fecha_informe_calificacion: Some(1_700_000_000_000),
            fecha_registro: Some(1_700_000_000_000),
            fecha_ultima_revision: Some(1_700_000_000_000),
            orcid: Some("  0000-0000-0000-0005  ".to_string()),
            scopus_author_id: Some("12345678900".to_string()),
            ficha_url: "  https://renacyt.example/foo  ".to_string(),
            formaciones_academicas_json: Some(r#"[{"a":1}]"#.to_string()),
        });
        let inv = Investigador::new("inv-r".to_string(), &req).unwrap();
        // trim + drop empty
        assert_eq!(inv.renacyt_orcid.as_deref(), Some("0000-0000-0000-0005"));
        assert_eq!(inv.renacyt_scopus_author_id.as_deref(), Some("12345678900"));
        assert_eq!(
            inv.renacyt_ficha_url.as_deref(),
            Some("https://renacyt.example/foo")
        );
        assert_eq!(
            inv.renacyt_formaciones_academicas_json.as_deref(),
            Some(r#"[{"a":1}]"#)
        );
        assert!(
            inv.renacyt_fecha_ultima_sincronizacion.is_some(),
            "renacyt presente -> debe setear fecha_ultima_sincronizacion"
        );
    }

    #[test]
    fn new_descarta_campos_renacyt_vacios_o_whitespace() {
        let mut req = request_minimo();
        req.renacyt = Some(CreateInvestigadorRenacytRequest {
            codigo_registro: "REG-X".to_string(),
            id_investigador: "REN-X".to_string(),
            nivel: Some("   ".to_string()),
            grupo: None,
            condicion: Some("".to_string()),
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: Some("   ".to_string()),
            scopus_author_id: Some("  ".to_string()),
            ficha_url: "http://x".to_string(),
            formaciones_academicas_json: Some("   ".to_string()),
        });
        let inv = Investigador::new("inv-e".to_string(), &req).unwrap();
        assert_eq!(inv.renacyt_nivel, None);
        assert_eq!(inv.renacyt_grupo, None);
        assert_eq!(inv.renacyt_condicion, None);
        assert_eq!(inv.renacyt_orcid, None);
        assert_eq!(inv.renacyt_scopus_author_id, None);
        assert_eq!(inv.renacyt_formaciones_academicas_json, None);
        assert_eq!(inv.renacyt_codigo_registro.as_deref(), Some("REG-X"));
        assert_eq!(inv.renacyt_id_investigador.as_deref(), Some("REN-X"));
        assert_eq!(inv.renacyt_ficha_url.as_deref(), Some("http://x"));
    }

    #[test]
    fn new_sin_renacyt_no_setea_fecha_sincronizacion() {
        let req = request_minimo(); // renacyt = None
        let inv = Investigador::new("inv-nr".to_string(), &req).unwrap();
        assert!(
            inv.renacyt_fecha_ultima_sincronizacion.is_none(),
            "sin renacyt no debe haber fecha_ultima_sincronizacion"
        );
    }

    #[test]
    fn with_persona_id_asigna_id_y_no_altera_otros_campos() {
        let req = request_minimo();
        let inv = Investigador::new("inv-w".to_string(), &req).unwrap();
        let original_grado = inv.id_grado.clone();
        let inv = inv.with_persona_id("persona-42".to_string());
        assert_eq!(inv.persona_id, "persona-42");
        assert_eq!(inv.id_grado, original_grado);
    }

    #[test]
    fn apply_renacyt_refresh_con_formaciones_nuevas_devuelve_true_y_reemplaza() {
        let req = request_minimo();
        let mut inv = Investigador::new("inv-r1".to_string(), &req).unwrap();
        let lookup = RenacytLookupResult {
            codigo_registro: "  REG-A  ".to_string(),
            id_investigador: "  REN-A  ".to_string(),
            nombre_completo: Some("Maria Lopez Diaz".to_string()),
            numero_documento: Some("45678912".to_string()),
            nivel: Some("II".to_string()),
            grupo: Some("B".to_string()),
            condicion: Some("Activo".to_string()),
            fecha_informe_calificacion: Some(1_700_000_000_000),
            fecha_registro: Some(1_700_000_000_000),
            fecha_ultima_revision: Some(1_700_000_000_000),
            orcid: Some("0000-0001-2345-6789".to_string()),
            scopus_author_id: Some("12345".to_string()),
            ficha_url: "  https://example/ficha  ".to_string(),
            solicitud_id: Some(99),
            formaciones_academicas_json: Some(r#"[{"nuevo":1}]"#.to_string()),
        };
        let actualizada = inv.apply_renacyt_refresh(lookup);
        assert!(actualizada);
        assert_eq!(inv.renacyt_codigo_registro.as_deref(), Some("REG-A"));
        assert_eq!(inv.renacyt_id_investigador.as_deref(), Some("REN-A"));
        assert_eq!(inv.renacyt_nivel.as_deref(), Some("II"));
        assert_eq!(
            inv.renacyt_ficha_url.as_deref(),
            Some("https://example/ficha")
        );
        assert_eq!(
            inv.renacyt_formaciones_academicas_json.as_deref(),
            Some(r#"[{"nuevo":1}]"#)
        );
        assert!(inv.renacyt_fecha_ultima_sincronizacion.is_some());
    }

    #[test]
    fn apply_renacyt_refresh_sin_formaciones_nuevas_conserva_las_existentes() {
        let mut req = request_minimo();
        req.renacyt = Some(CreateInvestigadorRenacytRequest {
            codigo_registro: "REG".to_string(),
            id_investigador: "REN".to_string(),
            nivel: None,
            grupo: None,
            condicion: None,
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: None,
            scopus_author_id: None,
            ficha_url: "http://x".to_string(),
            formaciones_academicas_json: Some(r#"[{"previo":1}]"#.to_string()),
        });
        let mut inv = Investigador::new("inv-r2".to_string(), &req).unwrap();
        let lookup_vacio = RenacytLookupResult {
            codigo_registro: "REG".to_string(),
            id_investigador: "REN".to_string(),
            nombre_completo: None,
            numero_documento: None,
            nivel: None,
            grupo: None,
            condicion: None,
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: None,
            scopus_author_id: None,
            ficha_url: "http://x".to_string(),
            solicitud_id: None,
            formaciones_academicas_json: None,
        };
        let actualizada = inv.apply_renacyt_refresh(lookup_vacio);
        assert!(!actualizada, "sin formaciones nuevas devuelve false");
        assert_eq!(
            inv.renacyt_formaciones_academicas_json.as_deref(),
            Some(r#"[{"previo":1}]"#),
            "debe conservar formaciones previas"
        );
        assert!(
            inv.renacyt_fecha_ultima_sincronizacion.is_some(),
            "fecha_ultima_sincronizacion SI se actualiza aunque formaciones esten vacias"
        );
    }

    #[test]
    fn apply_renacyt_refresh_descarta_campos_vacios() {
        let req = request_minimo();
        let mut inv = Investigador::new("inv-r3".to_string(), &req).unwrap();
        inv.renacyt_orcid = Some("viejo-orcid".to_string());
        inv.renacyt_grupo = Some("viejo-grupo".to_string());

        let lookup_vacio = RenacytLookupResult {
            codigo_registro: "R".to_string(),
            id_investigador: "I".to_string(),
            nombre_completo: None,
            numero_documento: None,
            nivel: None,
            grupo: Some("  ".to_string()),
            condicion: None,
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: Some("  ".to_string()),
            scopus_author_id: None,
            ficha_url: "http://x".to_string(),
            solicitud_id: None,
            formaciones_academicas_json: None,
        };
        inv.apply_renacyt_refresh(lookup_vacio);
        assert_eq!(inv.renacyt_orcid, None, "whitespace -> None");
        assert_eq!(inv.renacyt_grupo, None, "whitespace -> None");
    }

    #[test]
    fn try_from_dto_a_model_round_trip_preserva_campos() {
        let req = request_minimo();
        let original = Investigador::new("inv-t".to_string(), &req).unwrap();
        let dto = InvestigadorDto::from(original.clone());
        let recovered = Investigador::try_from(dto).expect("round-trip valido");
        assert_eq!(recovered.id_investigador, original.id_investigador);
        assert_eq!(recovered.persona_id, original.persona_id);
        assert_eq!(recovered.id_grado, original.id_grado);
        assert_eq!(recovered.activo, original.activo);
        assert_eq!(recovered.perfil, original.perfil);
    }

    #[test]
    fn from_model_a_dto_no_pierde_opciones_none() {
        let req = request_minimo(); // sin renacyt
        let inv = Investigador::new("inv-d".to_string(), &req).unwrap();
        let dto = InvestigadorDto::from(inv);
        assert!(dto.renacyt_codigo_registro.is_none());
        assert!(dto.renacyt_formaciones_academicas_json.is_none());
        assert_eq!(dto.activo, 1);
        assert_eq!(dto.perfil, "docente");
    }
}
