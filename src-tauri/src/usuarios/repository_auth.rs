use mongodb::bson::{doc, Document};
use mongodb::Database;
use rand_core::OsRng;

use crate::shared::error::AppError;
use crate::usuarios::dto::{AuthStatusDto, LoginUsuarioRequest};
use crate::usuarios::models::Usuario;

use super::repository_mappers::{
    count_usuarios, document_to_user_with_password_doc, enrich_usuario_with_persona,
};

pub(super) async fn get_usuario_by_username(
    db: &Database,
    username: &str,
) -> Result<crate::usuarios::models::UsuarioConPassword, AppError> {
    let doc_opt = db
        .collection::<Document>("usuarios")
        .find_one(doc! { "username": username.trim().to_lowercase() })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    let user_doc = document_to_user_with_password_doc(doc)?;
    crate::usuarios::repository_mappers::doc_to_model(user_doc)
}

fn validate_password_strength(password: &str) -> Result<(), AppError> {
    let trimmed = password.trim();
    if trimmed.len() < 8 {
        return Err(AppError::InternalError(
            "La contraseña debe tener al menos 8 caracteres.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_uppercase()) {
        return Err(AppError::InternalError(
            "La contraseña debe contener al menos una letra mayuscula.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_lowercase()) {
        return Err(AppError::InternalError(
            "La contraseña debe contener al menos una letra minuscula.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::InternalError(
            "La contraseña debe contener al menos un digito.".to_string(),
        ));
    }
    if !trimmed.chars().any(|c| !c.is_alphanumeric()) {
        return Err(AppError::InternalError(
            "La contraseña debe contener al menos un caracter especial.".to_string(),
        ));
    }
    Ok(())
}

pub(super) fn hash_password(password: &str) -> Result<String, AppError> {
    use argon2::{
        password_hash::{PasswordHasher, SaltString},
        Argon2,
    };

    validate_password_strength(password)?;

    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| AppError::InternalError("No se pudo proteger la contraseña.".to_string()))
}

fn verify_password(password: &str, password_hash: &str) -> Result<bool, AppError> {
    use argon2::{password_hash::PasswordHash, password_hash::PasswordVerifier, Argon2};

    let parsed_hash = PasswordHash::new(password_hash).map_err(|_| {
        AppError::InternalError("No se pudo leer la contraseña protegida.".to_string())
    })?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

pub async fn get_auth_status(db: &Database) -> Result<AuthStatusDto, AppError> {
    let total = count_usuarios(db).await?;
    Ok(AuthStatusDto {
        has_users: total > 0,
        requires_setup: total == 0,
    })
}

pub async fn login_usuario(
    db: &Database,
    request: LoginUsuarioRequest,
) -> Result<Usuario, AppError> {
    let usuario = get_usuario_by_username(db, &request.username).await?;

    if usuario.activo == 0 {
        return Err(AppError::InternalError(
            "El usuario está inactivo.".to_string(),
        ));
    }

    if !verify_password(&request.password, &usuario.password_hash)? {
        return Err(AppError::InternalError(
            "Usuario o contraseña incorrectos.".to_string(),
        ));
    }

    let mut public = usuario.public_view();
    enrich_usuario_with_persona(db, &mut public).await?;
    Ok(public)
}
