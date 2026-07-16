use crate::usuarios::dto::{BootstrapUsuarioRequest, CreateUsuarioRequest};
use serde_json::json;

#[cfg(test)]
mod request_serde_tests {
    use super::*;

    #[test]
    fn bootstrap_request_accepts_camel_case_keys() {
        let payload = json!({
            "username": "admin",
            "password": "Clave#123",
            "dni": "12345678",
            "nombres": "Juan",
            "apellidoPaterno": "Perez",
            "apellidoMaterno": "Lopez",
            "mongodbUri": "mongodb://localhost:27017",
            "mongodbDb": "pjvpin"
        });

        let req: BootstrapUsuarioRequest = serde_json::from_value(payload)
            .expect("BootstrapUsuarioRequest debe aceptar JSON con keys camelCase");

        assert_eq!(req.username, "admin");
        assert_eq!(req.password, "Clave#123");
        assert_eq!(req.dni, "12345678");
        assert_eq!(req.nombres.as_deref(), Some("Juan"));
        assert_eq!(req.apellido_paterno.as_deref(), Some("Perez"));
        assert_eq!(req.apellido_materno.as_deref(), Some("Lopez"));
        assert_eq!(
            req.mongodb_uri.as_deref(),
            Some("mongodb://localhost:27017")
        );
        assert_eq!(req.mongodb_db.as_deref(), Some("pjvpin"));
    }

    #[test]
    fn bootstrap_request_optional_fields_default_to_none() {
        let payload = json!({
            "username": "admin",
            "password": "Clave#123",
            "dni": "12345678"
        });

        let req: BootstrapUsuarioRequest = serde_json::from_value(payload)
            .expect("BootstrapUsuarioRequest debe tolerar campos opcionales faltantes");

        assert_eq!(req.nombres, None);
        assert_eq!(req.apellido_paterno, None);
        assert_eq!(req.apellido_materno, None);
        assert_eq!(req.rol, None);
        assert_eq!(req.mongodb_uri, None);
        assert_eq!(req.mongodb_db, None);
    }

    #[test]
    fn create_request_accepts_camel_case_keys() {
        let payload = json!({
            "username": "newadmin",
            "dni": "87654321",
            "nombres": "Maria",
            "apellidoPaterno": "Garcia",
            "apellidoMaterno": "Rodriguez",
            "rol": "admin",
            "password": "Clave#456"
        });

        let req: CreateUsuarioRequest = serde_json::from_value(payload)
            .expect("CreateUsuarioRequest debe aceptar JSON con keys camelCase");

        assert_eq!(req.username, "newadmin");
        assert_eq!(req.dni, "87654321");
        assert_eq!(req.apellido_paterno.as_deref(), Some("Garcia"));
        assert_eq!(req.apellido_materno.as_deref(), Some("Rodriguez"));
        assert_eq!(req.rol, "admin");
        assert_eq!(req.password, "Clave#456");
    }
}
