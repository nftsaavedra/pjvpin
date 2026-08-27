use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::personas::dto::CreatePersonaRequest;
use crate::personas::repository as personas_repo;
use crate::shared::error::AppError;
use crate::usuarios::dto::{BootstrapUsuarioRequest, CreateUsuarioRequest, UsuarioConPasswordDoc};
use crate::usuarios::models::{self, Usuario};
use crate::usuarios::validations;

use super::repository_mappers::{doc_to_model_public, model_to_doc, validar_actor_admin};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModoCreacion {
    Bootstrap,
    Gestion,
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

    let password_hash = super::repository_auth::hash_password(&request.password)?;
    let mut usuario = models::build_usuario_with_password(request, password_hash, gen_uuid())?;
    usuario.persona_id = Some(persona.id_persona.clone());
    usuario.nombre_completo = persona.nombre_completo.clone();
    usuario.dni = Some(persona.dni.clone());

    let user_doc: UsuarioConPasswordDoc = model_to_doc(usuario);
    let doc = mongodb::bson::to_document(&user_doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar usuario a BSON: {e}"))
    })?;
    db.collection::<Document>("usuarios")
        .insert_one(doc)
        .await?;

    let public = doc_to_model_public(user_doc)?;
    Ok(public)
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

    if super::repository_mappers::count_usuarios(db).await? > 0 {
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

    let password_hash = super::repository_auth::hash_password(&request.password)?;
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
