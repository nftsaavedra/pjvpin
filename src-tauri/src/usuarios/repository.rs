use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::bson::Document;
use mongodb::Database;
use rand_core::OsRng;

use crate::shared::error::AppError;
use crate::usuarios::models::{
    AuthStatus, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, Usuario, UsuarioConPassword,
};

async fn load_usuarios(db: &Database) -> Result<Vec<UsuarioConPassword>, AppError> {
    db.collection::<UsuarioConPassword>("usuarios")
        .find(doc! {})
        .await?
        .try_collect::<Vec<_>>()
        .await
        .map_err(Into::into)
}

async fn count_usuarios(db: &Database) -> Result<u64, AppError> {
    db.collection::<Document>("usuarios")
        .count_documents(doc! {})
        .await
        .map_err(Into::into)
}

async fn get_usuario_by_username(
    db: &Database,
    username: &str,
) -> Result<UsuarioConPassword, AppError> {
    db.collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "username": username.trim().to_lowercase() })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))
}

fn validar_usuario(username: &str, nombre_completo: &str, rol: &str) -> Result<(), AppError> {
    if username.trim().is_empty() || nombre_completo.trim().is_empty() || rol.trim().is_empty() {
        return Err(AppError::InternalError(
            "Complete todos los campos del usuario.".to_string(),
        ));
    }
    if !matches!(rol.trim(), "admin" | "operador" | "consulta") {
        return Err(AppError::InternalError(
            "El rol del usuario no es válido.".to_string(),
        ));
    }
    Ok(())
}

async fn validar_actor_admin(
    db: &Database,
    actor_user_id: &str,
) -> Result<UsuarioConPassword, AppError> {
    let actor = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": actor_user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;

    if actor.activo == 0 {
        return Err(AppError::InternalError(
            "El usuario actual está inactivo y no puede administrar accesos.".to_string(),
        ));
    }

    if actor.rol.trim() != "admin" {
        return Err(AppError::InternalError(
            "No tiene permisos para administrar usuarios.".to_string(),
        ));
    }

    Ok(actor)
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

fn hash_password(password: &str) -> Result<String, AppError> {
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

pub async fn get_auth_status(db: &Database) -> Result<AuthStatus, AppError> {
    let total = count_usuarios(db).await?;
    Ok(AuthStatus {
        has_users: total > 0,
        requires_setup: total == 0,
    })
}

pub async fn create_usuario(
    db: &Database,
    actor_user_id: &str,
    request: CreateUsuarioRequest,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    validar_usuario(&request.username, &request.nombre_completo, &request.rol)?;
    let password_hash = hash_password(&request.password)?;
    let usuario = UsuarioConPassword::new(request, password_hash);
    db.collection::<UsuarioConPassword>("usuarios")
        .insert_one(&usuario)
        .await?;
    Ok(usuario.public_view())
}

pub async fn bootstrap_admin(
    db: &Database,
    request: BootstrapUsuarioRequest,
) -> Result<Usuario, AppError> {
    if count_usuarios(db).await? > 0 {
        return Err(AppError::InternalError(
            "La configuracion inicial ya fue completada.".to_string(),
        ));
    }

    let rol = request.rol.unwrap_or_else(|| "superuser".to_string());
    if rol != "superuser" {
        return Err(AppError::InternalError(
            "El primer usuario debe ser superuser.".to_string(),
        ));
    }

    validar_usuario(&request.username, &request.nombre_completo, &rol)?;
    let password_hash = hash_password(&request.password)?;
    let usuario = UsuarioConPassword::new(
        CreateUsuarioRequest {
            username: request.username,
            nombre_completo: request.nombre_completo,
            rol,
            password: request.password,
            docente_id: None,
        },
        password_hash,
    );

    db.collection::<UsuarioConPassword>("usuarios")
        .insert_one(&usuario)
        .await?;
    Ok(usuario.public_view())
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

    Ok(usuario.public_view())
}

pub async fn get_all_usuarios(
    db: &Database,
    actor_user_id: &str,
) -> Result<Vec<Usuario>, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    let mut usuarios: Vec<Usuario> = load_usuarios(db)
        .await?
        .into_iter()
        .map(|usuario| usuario.public_view())
        .collect();
    usuarios.sort_by(|a, b| a.username.cmp(&b.username));
    Ok(usuarios)
}

pub async fn get_all_usuarios_paginated(
    db: &Database,
    actor_user_id: &str,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<Usuario>, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    let filter = doc! {};
    let total = db
        .collection::<UsuarioConPassword>("usuarios")
        .count_documents(filter.clone())
        .await?;
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;

    let mut cursor = db
        .collection::<UsuarioConPassword>("usuarios")
        .find(filter)
        .sort(doc! { "username": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut usuarios: Vec<Usuario> = Vec::new();
    while let Some(u) = cursor.try_next().await? {
        usuarios.push(u.public_view());
    }

    let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
    Ok(crate::shared::pagination::PaginatedResult {
        items: usuarios,
        total,
        page,
        limit,
        total_pages,
    })
}

pub async fn get_usuario_by_id(
    db: &Database,
    id_usuario: &str,
) -> Result<UsuarioConPassword, AppError> {
    db.collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))
}

pub async fn update_usuario(
    db: &Database,
    actor_user_id: &str,
    id_usuario: &str,
    request: UpdateUsuarioRequest,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    validar_usuario(&request.username, &request.nombre_completo, &request.rol)?;

    if actor_user_id == id_usuario {
        let usuario_actual = db
            .collection::<UsuarioConPassword>("usuarios")
            .find_one(doc! { "id_usuario": id_usuario })
            .await?
            .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;

        if usuario_actual.rol.trim() != request.rol.trim() {
            return Err(AppError::InternalError(
                "No puede cambiar su propio rol. Solicite a otro administrador que lo haga."
                    .to_string(),
            ));
        }
    }

    let mut updates = doc! {
        "username": request.username.trim().to_lowercase(),
        "nombre_completo": request.nombre_completo.trim(),
        "rol": request.rol.trim(),
    };

    if let Some(password) = request
        .password
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        updates.insert("password_hash", hash_password(password)?);
    }

    if let Some(ref docente) = request.docente_id {
        updates.insert("docente_id", docente.trim());
    }

    db.collection::<Document>("usuarios")
        .update_one(doc! { "id_usuario": id_usuario }, doc! { "$set": updates })
        .await?;

    let usuario = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    Ok(usuario.public_view())
}

pub async fn desactivar_usuario(
    db: &Database,
    actor_user_id: &str,
    id_usuario: &str,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;

    if actor_user_id == id_usuario {
        return Err(AppError::InternalError(
            "No puede cambiar el estado de su propio usuario.".to_string(),
        ));
    }

    db.collection::<Document>("usuarios")
        .update_one(
            doc! { "id_usuario": id_usuario },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;

    let usuario = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    Ok(usuario.public_view())
}

pub async fn reactivar_usuario(
    db: &Database,
    actor_user_id: &str,
    id_usuario: &str,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;

    if actor_user_id == id_usuario {
        return Err(AppError::InternalError(
            "No puede cambiar el estado de su propio usuario.".to_string(),
        ));
    }

    db.collection::<Document>("usuarios")
        .update_one(
            doc! { "id_usuario": id_usuario },
            doc! { "$set": { "activo": 1i64 } },
        )
        .await?;

    let usuario = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    Ok(usuario.public_view())
}
