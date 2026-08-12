use mongodb::bson::doc;
use mongodb::bson::Document;
use mongodb::Database;

use crate::shared::error::AppError;
use crate::usuarios::dto::UpdateUsuarioRequest;
use crate::usuarios::models::{Usuario, UsuarioConPassword};
use crate::usuarios::validations;

use super::repository_auth::hash_password;
use super::repository_mappers::{
    doc_to_model, document_to_user_doc, document_to_user_with_password_doc,
    enrich_usuario_with_persona, enrich_usuarios_with_persona, load_usuarios, user_doc_to_model,
    validar_actor_admin,
};

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
    use futures_util::TryStreamExt;
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

    let has_identity_update = request.nombres.is_some()
        || request.apellido_paterno.is_some()
        || request.apellido_materno.is_some();
    if has_identity_update {
        if let Some(ref persona_id) = usuario_actual.persona_id {
            let update_request = crate::personas::dto::UpdatePersonaRequest {
                nombres: request.nombres.clone(),
                apellido_paterno: request.apellido_paterno.clone(),
                apellido_materno: request.apellido_materno.clone(),
                correo: None,
                telefono: None,
                direccion: None,
                sexo: None,
                fecha_nacimiento: None,
            };
            let _ = crate::personas::repository::update(db, persona_id, update_request).await?;
        } else {
            tracing::warn!(
                usuario_id = %id_usuario,
                "actualizar_usuario: identidad solicitada pero usuario sin persona_id vinculada"
            );
        }
    }

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
