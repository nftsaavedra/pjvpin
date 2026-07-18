use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::Database;
use rand_core::OsRng;

use crate::personas::dto::CreatePersonaRequest;
use crate::personas::repository as personas_repo;
use crate::shared::error::AppError;
use crate::usuarios::dto::{
    AuthStatusDto, BootstrapUsuarioRequest, CreateUsuarioRequest, LoginUsuarioRequest,
    UpdateUsuarioRequest, UsuarioConPasswordDoc, UsuarioDoc,
};
use crate::usuarios::models::{self, Usuario, UsuarioConPassword};
use crate::usuarios::validations;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModoCreacion {
    Bootstrap,
    Gestion,
}

// ============================================================================
// Mappers BSON Document <-> Doc <-> Model
// ============================================================================

fn doc_to_model(doc: UsuarioConPasswordDoc) -> Result<UsuarioConPassword, AppError> {
    UsuarioConPassword::new(
        doc.id_usuario,
        doc.username,
        doc.nombre_completo,
        doc.rol,
        doc.password_hash,
        doc.activo,
        doc.investigador_id,
        doc.persona_id,
        doc.dni,
        doc.updated_at,
    )
}

fn model_to_doc(m: UsuarioConPassword) -> UsuarioConPasswordDoc {
    UsuarioConPasswordDoc {
        id_usuario: m.id_usuario,
        username: m.username,
        nombre_completo: m.nombre_completo,
        rol: m.rol,
        password_hash: m.password_hash,
        activo: m.activo,
        investigador_id: m.investigador_id,
        persona_id: m.persona_id,
        dni: m.dni,
        updated_at: m.updated_at,
    }
}

fn user_doc_to_model(doc: UsuarioDoc) -> Result<Usuario, AppError> {
    Usuario::new(
        doc.id_usuario,
        doc.username,
        doc.nombre_completo,
        doc.rol,
        doc.activo,
        doc.investigador_id,
        doc.persona_id,
        doc.dni,
        doc.updated_at,
    )
}

fn document_to_user_doc(doc: Document) -> Result<UsuarioDoc, AppError> {
    mongodb::bson::from_document::<UsuarioDoc>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar usuario desde BSON: {e}"))
    })
}

fn document_to_user_with_password_doc(doc: Document) -> Result<UsuarioConPasswordDoc, AppError> {
    mongodb::bson::from_document::<UsuarioConPasswordDoc>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar usuario (con password) desde BSON: {e}"
        ))
    })
}

// ============================================================================
// CRUD de dominio
// ============================================================================

async fn load_usuarios(db: &Database) -> Result<Vec<UsuarioConPassword>, AppError> {
    let cursor = db.collection::<Document>("usuarios").find(doc! {}).await?;
    let mut result = Vec::new();
    let docs: Vec<Document> = cursor.try_collect().await?;
    for d in docs {
        let user_doc = document_to_user_with_password_doc(d)?;
        result.push(doc_to_model(user_doc)?);
    }
    Ok(result)
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
    let doc_opt = db
        .collection::<Document>("usuarios")
        .find_one(doc! { "username": username.trim().to_lowercase() })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    let user_doc = document_to_user_with_password_doc(doc)?;
    doc_to_model(user_doc)
}

async fn validar_actor_admin(
    db: &Database,
    actor_user_id: &str,
) -> Result<UsuarioConPassword, AppError> {
    let doc_opt = db
        .collection::<Document>("usuarios")
        .find_one(doc! { "id_usuario": actor_user_id })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    let user_doc = document_to_user_with_password_doc(doc)?;
    let actor = doc_to_model(user_doc)?;

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

pub async fn get_auth_status(db: &Database) -> Result<AuthStatusDto, AppError> {
    let total = count_usuarios(db).await?;
    Ok(AuthStatusDto {
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
    let dni_limpio = crate::shared::dni::Dni::new(dni)?.into_string();
    if let Some(persona) = personas_repo::find_by_dni(db, &dni_limpio).await? {
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

fn gen_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
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
    let mut usuario = models::build_usuario_with_password(request, password_hash, gen_uuid())?;
    usuario.persona_id = Some(persona.id_persona.clone());
    usuario.nombre_completo = persona.nombre_completo.clone();
    usuario.dni = Some(persona.dni.clone());

    let user_doc = model_to_doc(usuario);
    let doc = mongodb::bson::to_document(&user_doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar usuario a BSON: {e}"))
    })?;
    db.collection::<Document>("usuarios")
        .insert_one(doc)
        .await?;

    let public = doc_to_model_public(user_doc)?;
    Ok(public)
}

fn doc_to_model_public(user_doc: UsuarioConPasswordDoc) -> Result<Usuario, AppError> {
    let m = doc_to_model(user_doc)?;
    Ok(m.public_view())
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
    let mut usuario = models::build_usuario_with_password(
        CreateUsuarioRequest {
            username: request.username,
            dni: request.dni,
            nombres: request.nombres,
            apellido_paterno: request.apellido_paterno,
            apellido_materno: request.apellido_materno,
            rol,
            password: request.password,
            investigador_id: None,
        },
        password_hash,
        gen_uuid(),
    )?;
    usuario.persona_id = Some(persona.id_persona.clone());
    usuario.nombre_completo = persona.nombre_completo.clone();
    usuario.dni = Some(persona.dni.clone());

    let user_doc = model_to_doc(usuario);
    let doc = mongodb::bson::to_document(&user_doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar usuario a BSON: {e}"))
    })?;
    db.collection::<Document>("usuarios")
        .insert_one(doc)
        .await?;

    let public = doc_to_model_public(user_doc)?;
    Ok(public)
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

    let lookup = personas_repo::find_by_ids(db, &persona_ids).await?;

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
    _actor_user_id: &str,
) -> Result<Vec<Usuario>, AppError> {
    let mut usuarios: Vec<Usuario> = load_usuarios(db)
        .await?
        .into_iter()
        .map(|u| u.public_view())
        .collect();
    enrich_usuarios_with_persona(db, &mut usuarios).await?;
    usuarios.sort_by(|a, b| a.username.cmp(&b.username));
    Ok(usuarios)
}

pub async fn get_all_usuarios_paginated(
    db: &Database,
    _actor_user_id: &str,
    page: u32,
    limit: u32,
) -> Result<crate::shared::pagination::PaginatedResult<Usuario>, AppError> {
    let filter = doc! {};
    let total = db
        .collection::<Document>("usuarios")
        .count_documents(filter.clone())
        .await?;
    let skip = (page.saturating_sub(1) * limit) as u64;
    let limit_i64 = limit as i64;

    let mut cursor = db
        .collection::<Document>("usuarios")
        .find(filter)
        .sort(doc! { "username": 1 })
        .skip(skip)
        .limit(limit_i64)
        .await?;

    let mut usuarios: Vec<Usuario> = Vec::new();
    while let Some(d) = cursor.try_next().await? {
        let user_doc = document_to_user_doc(d)?;
        usuarios.push(user_doc_to_model(user_doc)?);
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
    let doc_opt = db
        .collection::<Document>("usuarios")
        .find_one(doc! { "id_usuario": id_usuario })
        .await?;
    let doc = doc_opt.ok_or_else(|| AppError::NotFound("Usuario no encontrado.".to_string()))?;
    let user_doc = document_to_user_with_password_doc(doc)?;
    doc_to_model(user_doc)
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

    let usuario_actual = get_usuario_by_id(db, id_usuario).await?;

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

    if let Some(ref investigador) = request.investigador_id {
        updates.insert("investigador_id", investigador.trim());
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

    let target = get_usuario_by_id(db, id_usuario).await?;

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

pub async fn reactivate_usuario(
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
