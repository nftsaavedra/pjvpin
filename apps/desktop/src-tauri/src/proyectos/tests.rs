//! Tests unitarios del modulo `proyectos`.
//!
//! Solo cubren la logica de dominio pura (modelos + validacion de input).
//! La capa de repositorio y handlers se prueba indirectamente via
//! `npm run tauri:dev` + interfaz grafica.
//!
//! Phase J.5 introduce cobertura minima equivalente a la de `investigadores`
//! (Phase I.11). Pendiente: tests de integracion MongoDB (M10+ requerido).

use crate::proyectos::dto::{
    CreateProyectoConParticipantesRequest, CreateProyectoRequest, ParticipacionRecordDto,
    ProyectoDto, UpdateProyectoConParticipantesRequest,
};
use crate::proyectos::models::{ParticipacionRecord, Proyecto};
use crate::shared::error::AppError;

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- Proyecto::new ----------

    #[test]
    fn proyecto_new_asigna_campos_basicos() {
        let req = CreateProyectoRequest {
            titulo_proyecto: "Analisis de datos abiertos".to_string(),
            codigo: Some("PRJ-001".to_string()),
            ..Default::default()
        };
        let p = Proyecto::new("p-1".to_string(), req).unwrap();
        assert_eq!(p.id_proyecto, "p-1");
        assert_eq!(p.titulo_proyecto, "Analisis de datos abiertos");
        assert!(p.activo, "activo debe iniciar en true");
        assert!(p.created_at.is_some());
        assert!(p.updated_at.is_some());
        assert!(p.campo_ocde.is_none());
        assert!(p.programas_relacionados.is_empty());
    }

    #[test]
    fn proyecto_new_rechaza_id_vacio() {
        let req = CreateProyectoRequest {
            titulo_proyecto: "X".to_string(),
            codigo: Some("P".to_string()),
            ..Default::default()
        };
        let err = Proyecto::new("   ".to_string(), req).expect_err("id vacio -> error");
        assert!(matches!(err, AppError::InternalError(_)), "got {err:?}");
    }

    #[test]
    fn proyecto_new_rechaza_titulo_vacio_o_whitespace() {
        for titulo in ["", "   ", "\t\n"] {
            let req = CreateProyectoRequest {
                titulo_proyecto: titulo.to_string(),
                codigo: Some("P".to_string()),
                ..Default::default()
            };
            let err = Proyecto::new("p".to_string(), req).expect_err("titulo vacio -> error");
            assert!(matches!(err, AppError::InternalError(_)), "got {err:?}");
        }
    }

    // ---------- Proyecto From / TryFrom round-trip ----------

    #[test]
    fn proyecto_dto_round_trip_preserva_campos() {
        let original = Proyecto {
            id_proyecto: "p-2".to_string(),
            titulo_proyecto: "Titulo".to_string(),
            codigo: "PRJ-002".to_string(),
            activo: true,
            created_at: Some(1_700_000_000_000),
            updated_at: Some(1_700_000_001_000),
            campo_ocde: Some("1.1".to_string()),
            programas_relacionados: vec!["prog-a".to_string(), "prog-b".to_string()],
            tipo_actividad_ocde: None,
            ambito_geografico: None,
            estado_concytec: None,
            tematica_ambiental: None,
            tematica_salud: None,
            perucris_uuid: None,
        };
        let dto = ProyectoDto::from(original.clone());
        let recovered = Proyecto::try_from(dto).expect("round-trip valido");
        assert_eq!(recovered.id_proyecto, original.id_proyecto);
        assert_eq!(recovered.titulo_proyecto, original.titulo_proyecto);
        assert_eq!(recovered.activo, original.activo);
        assert_eq!(recovered.created_at, original.created_at);
        assert_eq!(recovered.updated_at, original.updated_at);
        assert_eq!(recovered.campo_ocde, original.campo_ocde);
        assert_eq!(
            recovered.programas_relacionados,
            original.programas_relacionados
        );
    }

    #[test]
    fn proyecto_dto_from_ref_no_consume_proyecto() {
        let p = Proyecto::new(
            "p-3".to_string(),
            CreateProyectoRequest {
                titulo_proyecto: "X".to_string(),
                codigo: Some("PRJ-003".to_string()),
                tipo_actividad_ocde: None,
                ambito_geografico: None,
                estado_concytec: None,
                tematica_ambiental: None,
                tematica_salud: None,
            },
        )
        .unwrap();
        let dto_ref: ProyectoDto = (&p).into();
        // El original sigue usable
        assert_eq!(p.titulo_proyecto, "X");
        assert_eq!(dto_ref.titulo_proyecto, "X");
    }

    // ---------- ParticipacionRecord round-trip ----------

    #[test]
    fn participacion_round_trip_con_es_responsable_true() {
        let original = ParticipacionRecord {
            id: "p-1:inv-1".to_string(),
            id_proyecto: "p-1".to_string(),
            id_investigador: "inv-1".to_string(),
            es_responsable: true,
            rol: crate::shared::vocab_mapper::ROLE_INVESTIGADOR_PRINCIPAL.to_string(),
            ..Default::default()
        };
        let dto = ParticipacionRecordDto::from(original.clone());
        let recovered = ParticipacionRecord::try_from(dto).unwrap();
        assert_eq!(recovered.id, original.id);
        assert_eq!(recovered.id_proyecto, original.id_proyecto);
        assert_eq!(recovered.id_investigador, original.id_investigador);
        assert!(recovered.es_responsable);
    }

    #[test]
    fn participacion_round_trip_con_es_responsable_false() {
        let original = ParticipacionRecord {
            id: "p-1:inv-2".to_string(),
            id_proyecto: "p-1".to_string(),
            id_investigador: "inv-2".to_string(),
            es_responsable: false,
            rol: crate::shared::vocab_mapper::ROLE_CO_INVESTIGADOR.to_string(),
            ..Default::default()
        };
        let dto = ParticipacionRecordDto::from(original.clone());
        let recovered = ParticipacionRecord::try_from(dto).unwrap();
        assert!(!recovered.es_responsable);
    }

    // ---------- CreateProyectoConParticipantesRequest::validate ----------

    #[test]
    fn create_validate_acepta_input_valido() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "Investigacion X".to_string(),
            investigadores_ids: vec!["inv-1".to_string(), "inv-2".to_string()],
            investigador_responsable_id: Some("inv-1".to_string()),
        };
        let out = req.validate().expect("validate OK");
        assert_eq!(out.titulo_proyecto, "Investigacion X");
        assert_eq!(out.investigadores_ids, vec!["inv-1", "inv-2"]);
        assert_eq!(out.investigador_responsable_id.as_deref(), Some("inv-1"));
    }

    #[test]
    fn create_validate_trim_y_dedupe_investigadores() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec![
                "  inv-1  ".to_string(),
                "inv-1".to_string(),
                "inv-2".to_string(),
            ],
            investigador_responsable_id: Some("inv-1".to_string()),
        };
        let out = req.validate().unwrap();
        assert_eq!(
            out.investigadores_ids,
            vec!["inv-1".to_string(), "inv-2".to_string()],
            "deduplica tras trim"
        );
    }

    #[test]
    fn create_validate_rechaza_lista_vacia() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec![],
            investigador_responsable_id: None,
        };
        let err = req.validate().expect_err("lista vacia -> error");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("al menos un investigador")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }

    #[test]
    fn create_validate_rechaza_id_invalido_vacio() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec!["".to_string()],
            investigador_responsable_id: None,
        };
        let err = req.validate().expect_err("id vacio -> error");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("valores invalidos")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }

    #[test]
    fn create_validate_rechaza_responsable_fuera_de_lista() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec!["inv-1".to_string()],
            investigador_responsable_id: Some("inv-99".to_string()),
        };
        let err = req.validate().expect_err("responsable fuera -> error");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("responsable")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }

    #[test]
    fn create_validate_rechaza_responsable_sin_investigadores() {
        // No se valida aqui (lo bloquea antes con "lista vacia"); este test
        // confirma el caso limite: lista no vacia pero responsable vacio -> error
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec!["inv-1".to_string()],
            investigador_responsable_id: None,
        };
        let err = req
            .validate()
            .expect_err("responsable obligatorio -> error");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("responsable")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }

    #[test]
    fn create_validate_trim_responsable_a_none_si_blanco() {
        let req = CreateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec!["inv-1".to_string()],
            investigador_responsable_id: Some("   ".to_string()),
        };
        let err = req
            .validate()
            .expect_err("responsable whitespace -> obligatorio");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("responsable")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }

    // ---------- UpdateProyectoConParticipantesRequest::validate ----------

    #[test]
    fn update_validate_permite_lista_vacia() {
        let req = UpdateProyectoConParticipantesRequest {
            titulo_proyecto: "Solo cambio titulo".to_string(),
            investigadores_ids: vec![],
            investigador_responsable_id: None,
        };
        let out = req.validate().expect("update permite lista vacia");
        assert_eq!(out.titulo_proyecto, "Solo cambio titulo");
        assert!(out.investigadores_ids.is_empty());
        assert!(out.investigador_responsable_id.is_none());
    }

    #[test]
    fn update_validate_trim_titulo() {
        let req = UpdateProyectoConParticipantesRequest {
            titulo_proyecto: "  Titulo con espacios  ".to_string(),
            investigadores_ids: vec![],
            investigador_responsable_id: None,
        };
        let out = req.validate().unwrap();
        assert_eq!(out.titulo_proyecto, "Titulo con espacios");
    }

    #[test]
    fn update_validate_rechaza_responsable_fuera_de_lista() {
        let req = UpdateProyectoConParticipantesRequest {
            titulo_proyecto: "X".to_string(),
            investigadores_ids: vec!["inv-1".to_string()],
            investigador_responsable_id: Some("inv-99".to_string()),
        };
        let err = req.validate().expect_err("responsable fuera -> error");
        match err {
            AppError::InternalError(msg) => assert!(msg.contains("responsable")),
            _ => panic!("esperaba InternalError, got {err:?}"),
        }
    }
}
