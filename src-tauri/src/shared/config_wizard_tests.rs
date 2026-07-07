use crate::shared::config_wizard::WizardConfigRequest;
use serde_json::json;

#[cfg(test)]
mod wizard_config_request_serde_tests {
    use super::*;

    #[test]
    fn wizard_config_request_accepts_camel_case_keys() {
        let payload = json!({
            "masterPassword": "Clave#123",
            "mongodbUri": "mongodb://localhost:27017",
            "mongodbDb": "pjvpin",
            "reniecToken": "token-reniec",
            "renacytBaseUrl": "https://api.renacyt.example",
            "renacytActoVersion": "2021",
            "pureApiKey": "key-pure"
        });

        let req: WizardConfigRequest = serde_json::from_value(payload)
            .expect("WizardConfigRequest debe aceptar JSON con keys camelCase");

        assert_eq!(req.master_password, "Clave#123");
        assert_eq!(req.mongodb_uri, "mongodb://localhost:27017");
        assert_eq!(req.mongodb_db.as_deref(), Some("pjvpin"));
        assert_eq!(req.reniec_token.as_deref(), Some("token-reniec"));
        assert_eq!(
            req.renacyt_base_url.as_deref(),
            Some("https://api.renacyt.example")
        );
        assert_eq!(req.renacyt_acto_version.as_deref(), Some("2021"));
        assert_eq!(req.pure_api_key.as_deref(), Some("key-pure"));
    }

    #[test]
    fn wizard_config_request_accepts_optional_fields_as_null() {
        let payload = json!({
            "masterPassword": "Clave#123",
            "mongodbUri": "mongodb://localhost:27017",
            "mongodbDb": null,
            "reniecToken": null,
            "renacytBaseUrl": null,
            "renacytActoVersion": null,
            "pureApiKey": null
        });

        let req: WizardConfigRequest = serde_json::from_value(payload)
            .expect("WizardConfigRequest debe tolerar null en Option<String>");

        assert_eq!(req.mongodb_db, None);
        assert_eq!(req.reniec_token, None);
        assert_eq!(req.renacyt_base_url, None);
        assert_eq!(req.renacyt_acto_version, None);
        assert_eq!(req.pure_api_key, None);
    }

    #[test]
    fn wizard_config_request_rejects_missing_required_fields() {
        let payload = json!({
            "mongodbUri": "mongodb://localhost:27017"
        });

        let result: Result<WizardConfigRequest, _> = serde_json::from_value(payload);

        assert!(
            result.is_err(),
            "master_password es required y debe rechazarse si falta"
        );
    }
}
