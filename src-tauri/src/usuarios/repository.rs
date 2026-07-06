use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::bson::Document;
use mongodb::Database;
use rand_core::OsRng;

use crate::personas::models::CreatePersonaRequest;
use crate::personas::repository as personas_repo;
use crate::shared::error::AppError;
use crate::usuarios::models::{
    AuthStatus, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, Usuario, UsuarioConPassword,
};
use crate::usuarios::validations;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModoCreacion {
    Bootstrap,
    Gestion,
}

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

async fn validar_actor_admin(
    db: &Database,
    actor_user_id: &str,
) -> Result<UsuarioConPassword, AppError> {
    let actor = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": actor_user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;

    validations::assert_actor_can_admin(&actor)?;

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

async fn obtener_o_crear_persona(
    db: &Database,
    dni: &str,
    nombres: Option<&str>,
    apellido_paterno: Option<&str>,
    apellido_materno: Option<&str>,
    modo: ModoCreacion,
) -> Result<crate::personas::models::Persona, AppError> {
    let dni_limpio = dni.trim();
    if let Some(persona) = personas_repo::find_by_dni(db, dni_limpio).await? {
        match modo {
            ModoCreacion::Bootstrap => {
                return Err(AppError::InternalError(
                    "Ya existe una persona con ese DNI en la base de datos.".to_string(),
                ));
            }
            ModoCreacion::Gestion => return Ok(persona),
        }
    }

    let nombres_trim = nombres
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let apellido_paterno_trim = apellido_paterno
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| {
            AppError::InternalError(
                "Ingrese el apellido paterno para registrar al usuario.".to_string(),
            )
        })?;
    let apellido_materno_trim = apellido_materno
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let nombres_req = nombres_trim.ok_or_else(|| {
        AppError::InternalError("Ingrese los nombres para registrar al usuario.".to_string())
    })?;

    let request = CreatePersonaRequest {
        dni: dni_limpio.to_string(),
        nombres: nombres_req,
        apellido_paterno: apellido_paterno_trim,
        apellido_materno: apellido_materno_trim,
        correo: None,
        telefono: None,
        direccion: None,
        sexo: None,
        fecha_nacimiento: None,
    };
    personas_repo::create(db, request).await
}

pub async fn create_usuario(
    db: &Database,
    actor_user_id: &str,
    request: CreateUsuarioRequest,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    validations::assert_create_role_not_superuser(&request.rol)?;
    validations::validar_usuario_dni_pure(&request.username, &request.dni, &request.rol)?;
    validations::validar_identidad_manual_pure(
        request.nombres.as_deref(),
        request.apellido_paterno.as_deref(),
    )?;

    let persona = obtener_o_crear_persona(
        db,
        &request.dni,
        request.nombres.as_deref(),
        request.apellido_paterno.as_deref(),
        request.apellido_materno.as_deref(),
        ModoCreacion::Gestion,
    )
    .await?;

    let password_hash = hash_password(&request.password)?;
    let mut usuario = UsuarioConPassword::new(request, password_hash);
    usuario.persona_id = Some(persona.id_persona.clone());
    usuario.nombre_completo = persona.nombre_completo.clone();
    usuario.dni = Some(persona.dni.clone());

    db.collection::<UsuarioConPassword>("usuarios")
        .insert_one(&usuario)
        .await?;
    Ok(usuario.public_view())
}

pub async fn bootstrap_admin(
    db: &Database,
    request: BootstrapUsuarioRequest,
) -> Result<Usuario, AppError> {
    let existing_superusers = db
        .collection::<Document>("usuarios")
        .count_documents(doc! { "rol": "superuser" })
        .await?;
    if existing_superusers > 0 {
        return Err(AppError::InternalError(
            "Ya existe un usuario superuser en el sistema.".to_string(),
        ));
    }

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

    validations::validar_usuario_dni_pure(&request.username, &request.dni, &rol)?;
    validations::validar_identidad_manual_pure(
        request.nombres.as_deref(),
        request.apellido_paterno.as_deref(),
    )?;

    let persona = obtener_o_crear_persona(
        db,
        &request.dni,
        request.nombres.as_deref(),
        request.apellido_paterno.as_deref(),
        request.apellido_materno.as_deref(),
        ModoCreacion::Bootstrap,
    )
    .await?;

    let password_hash = hash_password(&request.password)?;
    let mut usuario = UsuarioConPassword::new(
        CreateUsuarioRequest {
            username: request.username,
            dni: request.dni,
            nombres: request.nombres,
            apellido_paterno: request.apellido_paterno,
            apellido_materno: request.apellido_materno,
            rol,
            password: request.password,
            docente_id: None,
        },
        password_hash,
    );
    usuario.persona_id = Some(persona.id_persona.clone());
    usuario.nombre_completo = persona.nombre_completo.clone();
    usuario.dni = Some(persona.dni.clone());

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

    let mut public = usuario.public_view();
    enrich_usuario_with_persona(db, &mut public).await?;
    Ok(public)
}

async fn enrich_usuario_with_persona(db: &Database, usuario: &mut Usuario) -> Result<(), AppError> {
    if usuario.dni.is_none() || usuario.nombre_completo.is_empty() {
        if let Some(ref persona_id) = usuario.persona_id {
            if let Ok(persona) = personas_repo::find_by_id(db, persona_id).await {
                usuario.dni = Some(persona.dni.clone());
                usuario.nombre_completo = persona.nombre_completo.clone();
            }
        }
    }
    Ok(())
}

async fn enrich_usuarios_with_persona(
    db: &Database,
    usuarios: &mut [Usuario],
) -> Result<(), AppError> {
    let mut persona_ids: Vec<String> = usuarios
        .iter()
        .filter(|u| u.dni.is_none() || u.nombre_completo.is_empty())
        .filter_map(|u| u.persona_id.clone())
        .collect();
    persona_ids.sort();
    persona_ids.dedup();

    if persona_ids.is_empty() {
        return Ok(());
    }

    let cursor = db
        .collection::<crate::personas::models::Persona>("personas")
        .find(doc! { "id_persona": { "$in": &persona_ids } })
        .await?;

    use futures_util::TryStreamExt;
    let personas: Vec<crate::personas::models::Persona> = cursor
        .try_collect::<Vec<_>>()
        .await
        .map_err(AppError::from)?;
    let lookup: std::collections::HashMap<String, crate::personas::models::Persona> = personas
        .into_iter()
        .map(|p| (p.id_persona.clone(), p))
        .collect();

    for usuario in usuarios.iter_mut() {
        if let Some(ref persona_id) = usuario.persona_id {
            if let Some(persona) = lookup.get(persona_id) {
                usuario.dni = Some(persona.dni.clone());
                usuario.nombre_completo = persona.nombre_completo.clone();
            }
        }
    }
    Ok(())
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
    enrich_usuarios_with_persona(db, &mut usuarios).await?;
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
    enrich_usuarios_with_persona(db, &mut usuarios).await?;

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

pub async fn get_usuario_by_id_public(
    db: &Database,
    id_usuario: &str,
) -> Result<Usuario, AppError> {
    let mut usuario = get_usuario_by_id(db, id_usuario).await?.public_view();
    enrich_usuario_with_persona(db, &mut usuario).await?;
    Ok(usuario)
}

pub async fn update_usuario(
    db: &Database,
    actor_user_id: &str,
    id_usuario: &str,
    request: UpdateUsuarioRequest,
) -> Result<Usuario, AppError> {
    validar_actor_admin(db, actor_user_id).await?;
    if request.username.trim().is_empty() {
        return Err(AppError::InternalError(
            "Ingrese el nombre de usuario.".to_string(),
        ));
    }
    if !matches!(
        request.rol.trim(),
        validations::ROL_SUPERUSER
            | validations::ROL_ADMIN
            | validations::ROL_OPERADOR
            | validations::ROL_CONSULTA
    ) {
        return Err(AppError::InternalError(
            "El rol del usuario no es v\u{00e1}lido.".to_string(),
        ));
    }

    let usuario_actual = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;

    validations::assert_no_promote_to_superuser(&usuario_actual.rol, &request.rol)?;

    if actor_user_id == id_usuario && usuario_actual.rol.trim() != request.rol.trim() {
        return Err(AppError::InternalError(
            "No puede cambiar su propio rol. Solicite a otro administrador que lo haga."
                .to_string(),
        ));
    }

    let mut updates = doc! {
        "username": request.username.trim().to_lowercase(),
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

    let mut usuario = get_usuario_by_id(db, id_usuario).await?.public_view();
    enrich_usuario_with_persona(db, &mut usuario).await?;
    Ok(usuario)
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

    let target = db
        .collection::<UsuarioConPassword>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;

    validations::assert_target_not_superuser(&target.rol)?;

    db.collection::<Document>("usuarios")
        .update_one(
            doc! { "id_usuario": id_usuario },
            doc! { "$set": { "activo": 0i64 } },
        )
        .await?;

    let mut usuario = get_usuario_by_id(db, id_usuario).await?.public_view();
    enrich_usuario_with_persona(db, &mut usuario).await?;
    Ok(usuario)
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

    let mut usuario = get_usuario_by_id(db, id_usuario).await?.public_view();
    enrich_usuario_with_persona(db, &mut usuario).await?;
    Ok(usuario)
}
