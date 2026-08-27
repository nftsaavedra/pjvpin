//! Regression guard: confirma que los DTOs de `seguridad` (status de
//! configuracion y guias de hardening) se serializan correctamente.
//!
//! Estos DTOs son solo `Serialize` (salida IPC).

use crate::seguridad::dto::{
    ConfigurationGuide, ConfigurationStep, SecurityRecommendation, SecurityRecommendations,
    SecurityStatus,
};

#[test]
fn security_status_serializa_flags_de_configuracion() {
    let status = SecurityStatus {
        database_backend: "mongodb".to_string(),
        mongodb_configured: true,
        reniec_configured: true,
        pure_configured: false,
        security_recommendations: vec!["Habilitar TLS".to_string()],
    };
    let json = serde_json::to_string(&status).expect("serializar");
    assert!(json.contains("\"database_backend\":\"mongodb\""));
    assert!(json.contains("\"mongodb_configured\":true"));
    assert!(json.contains("\"pure_configured\":false"));
}

#[test]
fn configuration_guide_serializa_steps_con_example_opcional() {
    let guide = ConfigurationGuide {
        title: "Setup MongoDB".to_string(),
        steps: vec![
            ConfigurationStep {
                step_number: 1,
                title: "Crear URI".to_string(),
                description: "Generar connection string".to_string(),
                example: Some("mongodb://...".to_string()),
            },
            ConfigurationStep {
                step_number: 2,
                title: "Validar".to_string(),
                description: "Probar conexion".to_string(),
                example: None,
            },
        ],
    };
    let json = serde_json::to_string(&guide).expect("serializar");
    assert!(json.contains("\"step_number\":1"));
    assert!(json.contains("\"example\":\"mongodb://...\""));
    assert!(json.contains("\"step_number\":2"));
}

#[test]
fn security_recommendations_serializa_campos() {
    let recs = SecurityRecommendations {
        recommendations: vec![SecurityRecommendation {
            category: "auth".to_string(),
            title: "Argon2".to_string(),
            description: "Usar Argon2 para hashes".to_string(),
            priority: "alta".to_string(),
        }],
    };
    let json = serde_json::to_string(&recs).expect("serializar");
    assert!(json.contains("\"category\":\"auth\""));
    assert!(json.contains("\"priority\":\"alta\""));
}
