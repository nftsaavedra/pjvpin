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

#[cfg(test)]
mod format_error_chain_tests {
    use crate::shared::error::format_error_chain;
    use std::error::Error;

    #[derive(Debug)]
    struct LeafErr(&'static str);

    impl std::fmt::Display for LeafErr {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.0)
        }
    }

    impl Error for LeafErr {}

    #[derive(Debug)]
    struct MidErr {
        msg: &'static str,
        leaf: LeafErr,
    }

    impl std::fmt::Display for MidErr {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.msg)
        }
    }

    impl Error for MidErr {
        fn source(&self) -> Option<&(dyn Error + 'static)> {
            Some(&self.leaf)
        }
    }

    #[derive(Debug)]
    struct RootErr {
        msg: &'static str,
        mid: MidErr,
    }

    impl std::fmt::Display for RootErr {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.msg)
        }
    }

    impl Error for RootErr {
        fn source(&self) -> Option<&(dyn Error + 'static)> {
            Some(&self.mid)
        }
    }

    #[test]
    fn format_error_chain_includes_all_levels() {
        let err = RootErr {
            msg: "outer",
            mid: MidErr {
                msg: "middle",
                leaf: LeafErr("leaf"),
            },
        };
        let chain = format_error_chain(&err);
        assert!(
            chain.contains("outer"),
            "chain debe incluir nivel raíz: {chain}"
        );
        assert!(
            chain.contains("middle"),
            "chain debe incluir nivel medio: {chain}"
        );
        assert!(
            chain.contains("leaf"),
            "chain debe incluir nivel hoja: {chain}"
        );
        assert!(
            chain.starts_with("outer"),
            "nivel raíz debe ir primero: {chain}"
        );
        let p_outer = chain.find("outer").unwrap();
        let p_middle = chain.find("middle").unwrap();
        let p_leaf = chain.find("leaf").unwrap();
        assert!(p_outer < p_middle, "orden esperado: outer < middle");
        assert!(p_middle < p_leaf, "orden esperado: middle < leaf");
    }

    #[test]
    fn format_error_chain_handles_single_level() {
        let err = LeafErr("solo");
        assert_eq!(format_error_chain(&err), "solo");
    }

    #[test]
    fn format_error_chain_handles_empty_chain() {
        let err = LeafErr("unico");
        let chain = format_error_chain(&err);
        assert!(
            !chain.contains('—'),
            "sin source no debe haber separador: {chain}"
        );
    }
}
