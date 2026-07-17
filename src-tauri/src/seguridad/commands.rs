use crate::seguridad::dto::{
    ConfigurationGuide, ConfigurationStep, SecurityRecommendation, SecurityRecommendations,
    SecurityStatus,
};
use crate::shared::error::AppError;
use crate::shared::state::AppState;

#[tauri::command]
pub async fn get_security_status(
    state: tauri::State<'_, AppState>,
) -> Result<SecurityStatus, AppError> {
    let mongodb_configured = state.mongo.is_some();
    let reniec_configured = state.tokens.has_reniec();
    let pure_configured = state.tokens.has_pure();

    let mut recommendations = Vec::new();

    if !mongodb_configured {
        recommendations.push(
            "⚠️ MongoDB no está disponible. Verifique la configuración de PJVPIN_MONGODB_URI."
                .to_string(),
        );
    }
    if !reniec_configured {
        recommendations.push(
            "ℹ️ RENIEC no está configurado. Defina PJVPIN_RENIEC_TOKEN para autocompletar DNI en investigadores.".to_string(),
        );
    }
    if !pure_configured {
        recommendations.push(
            "ℹ️ Pure no está configurado. Defina PJVPIN_PURE_API_KEY para sincronizar publicaciones científicas.".to_string(),
        );
    }

    Ok(SecurityStatus {
        database_backend: "MongoDB".to_string(),
        mongodb_configured,
        reniec_configured,
        pure_configured,
        security_recommendations: recommendations,
    })
}

#[tauri::command]
pub async fn get_setup_guide() -> Result<ConfigurationGuide, AppError> {
    let steps = vec![
        ConfigurationStep {
            step_number: 1,
            title: "Crear archivo de configuración".to_string(),
            description: "El archivo de configuración se encuentra en:\n- Windows: %APPDATA%/com.vpin.pjvpin/pjvpin.config.json\n- macOS: ~/Library/Application Support/com.vpin.pjvpin/pjvpin.config.json\n- Linux: ~/.local/share/com.vpin.pjvpin/pjvpin.config.json".to_string(),
            example: Some("{\n  \"database\": {\n    \"mongodbUri\": \"mongodb://localhost:27017\",\n    \"mongodbDb\": \"pjvpin\"\n  }\n}".to_string()),
        },
        ConfigurationStep {
            step_number: 2,
            title: "Configurar base de datos".to_string(),
            description: "MongoDB es el backend obligatorio en esta versión. Configure la URI y el nombre de la base en pjvpin.config.json.".to_string(),
            example: None,
        },
        ConfigurationStep {
            step_number: 3,
            title: "Configurar API externos (opcional)".to_string(),
            description: "Agregue credenciales externas según funcionalidades usadas:\nPJVPIN_RENIEC_TOKEN=su_token_aqui\nPJVPIN_PURE_API_KEY=su_api_key_pure".to_string(),
            example: None,
        },
        ConfigurationStep {
            step_number: 4,
            title: "Reiniciar la aplicación".to_string(),
            description: "Los cambios se aplicarán al reiniciar PJVPI.".to_string(),
            example: None,
        },
    ];

    Ok(ConfigurationGuide {
        title: "Guía de Configuración de PJVPI".to_string(),
        steps,
    })
}

#[tauri::command]
pub async fn get_security_recommendations() -> Result<SecurityRecommendations, AppError> {
    let recommendations = vec![
        SecurityRecommendation {
            category: "Configuración".to_string(),
            title: "Proteger archivo de configuración".to_string(),
            description: "El archivo pjvpin.config.json contiene credenciales sensibles. Asegúrese de que solo el usuario actual pueda acceder.\nEn Linux/macOS: chmod 600 ~/.local/share/com.vpin.pjvpin/pjvpin.config.json".to_string(),
            priority: "high".to_string(),
        },
        SecurityRecommendation {
            category: "MongoDB".to_string(),
            title: "Usar conexión segura (SSL/TLS)".to_string(),
            description: "Para MongoDB en producción, use mongodb+srv:// con SSL/TLS habilitado:\nmongodb+srv://usuario:contraseña@cluster.mongodb.net/pjvpin".to_string(),
            priority: "high".to_string(),
        },
        SecurityRecommendation {
            category: "API".to_string(),
            title: "Mantener tokens actualizados".to_string(),
            description: "Los secretos de API (RENIEC y Pure) deben rotarse regularmente según la política de seguridad del proveedor.".to_string(),
            priority: "medium".to_string(),
        },
        SecurityRecommendation {
            category: "Base de datos".to_string(),
            title: "Hacer backup regularmente".to_string(),
            description: "Configure backups automáticos en MongoDB (snapshots y/o dumps) según su RPO/RTO.".to_string(),
            priority: "medium".to_string(),
        },
        SecurityRecommendation {
            category: "Red".to_string(),
            title: "Monitorear disponibilidad de MongoDB".to_string(),
            description: "Implemente alertas de latencia/conectividad para evitar interrupciones de operaciones en tiempo real.".to_string(),
            priority: "low".to_string(),
        },
    ];

    Ok(SecurityRecommendations { recommendations })
}

#[tauri::command]
pub async fn wizard_has_config(state: tauri::State<'_, AppState>) -> Result<bool, AppError> {
    let db = match state.mongo_db() {
        Ok(db) => db,
        Err(_) => return Ok(false),
    };
    let count = db
        .collection::<mongodb::bson::Document>("usuarios")
        .count_documents(mongodb::bson::doc! {})
        .await
        .map_err(AppError::from)?;
    Ok(count > 0)
}

#[tauri::command]
pub async fn wizard_test_mongodb(
    uri: String,
) -> Result<crate::shared::config_wizard::ConnectivityResult, AppError> {
    Ok(crate::shared::config_wizard::test_mongodb_connectivity(&uri).await)
}

#[tauri::command]
pub async fn wizard_test_reniec(
    token: String,
) -> Result<crate::shared::config_wizard::ConnectivityResult, AppError> {
    Ok(crate::shared::config_wizard::test_reniec_connectivity(&token).await)
}

#[tauri::command]
pub async fn wizard_test_renacyt(
    base_url: String,
) -> Result<crate::shared::config_wizard::ConnectivityResult, AppError> {
    Ok(crate::shared::config_wizard::test_renacyt_connectivity(&base_url).await)
}

#[tauri::command]
pub async fn wizard_test_pure(
    base_url: String,
    api_key: String,
) -> Result<crate::shared::config_wizard::ConnectivityResult, AppError> {
    Ok(crate::shared::config_wizard::test_pure_connectivity(&base_url, &api_key).await)
}

#[tauri::command]
pub async fn wizard_save_config(
    request: crate::shared::config_wizard::WizardConfigRequest,
) -> Result<(), AppError> {
    crate::shared::config_wizard::validate_master_password(&request.master_password)?;
    let config_path = crate::shared::config_wizard::get_config_path();
    crate::shared::config_wizard::save_wizard_config(request, &config_path)
}

#[tauri::command]
pub async fn wizard_validate_master_password(password: String) -> Result<(), AppError> {
    crate::shared::config_wizard::validate_master_password(&password)
}

#[tauri::command]
pub async fn wizard_consultar_dni(
    token: String,
    numero: String,
) -> Result<crate::investigadores::dto::ReniecDniLookupResult, AppError> {
    use crate::shared::config::{PureConfig, RenacytConfig, ReniecConfig, RuntimeConfig};
    use crate::shared::defaults;
    use crate::shared::external::reniec_client;
    use crate::shared::tokens::TokenResolver;

    let runtime = RuntimeConfig {
        database: crate::shared::config::DatabaseConfig {
            mongodb_uri: None,
            mongodb_db_name: String::new(),
            mongodb_max_pool_size: 0,
            mongodb_min_pool_size: 0,
        },
        reniec: ReniecConfig {
            api_base_url: defaults::RENIEC_API_BASE_URL.to_string(),
            token: Some(token),
        },
        renacyt: RenacytConfig {
            api_base_url: String::new(),
            acto_version: String::new(),
            ficha_base_url: String::new(),
        },
        pure: PureConfig {
            api_base_url: String::new(),
            api_key: None,
        },
    };
    let tokens = TokenResolver::from_config(&runtime);
    reniec_client::consultar_dni(&tokens, &runtime.reniec.api_base_url, &numero).await
}
