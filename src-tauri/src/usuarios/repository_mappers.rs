use mongodb::bson::{doc, Document};
use mongodb::Database;

use crate::personas::repository as personas_repo;
use crate::shared::error::AppError;
use crate::usuarios::dto::{UsuarioConPasswordDoc, UsuarioDoc};
use crate::usuarios::models::{Usuario, UsuarioConPassword};
use crate::usuarios::validations;

pub(super) fn doc_to_model(doc: UsuarioConPasswordDoc) -> Result<UsuarioConPassword, AppError> {
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

pub(super) fn model_to_doc(m: UsuarioConPassword) -> UsuarioConPasswordDoc {
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

pub(super) fn user_doc_to_model(doc: UsuarioDoc) -> Result<Usuario, AppError> {
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

pub(super) fn document_to_user_doc(doc: Document) -> Result<UsuarioDoc, AppError> {
    mongodb::bson::from_document::<UsuarioDoc>(doc).map_err(|e| {
        AppError::InternalError(format!("No se pudo deserializar usuario desde BSON: {e}"))
    })
}

pub(super) fn document_to_user_with_password_doc(
    doc: Document,
) -> Result<UsuarioConPasswordDoc, AppError> {
    mongodb::bson::from_document::<UsuarioConPasswordDoc>(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar usuario (con password) desde BSON: {e}"
        ))
    })
}

pub(super) async fn load_usuarios(db: &Database) -> Result<Vec<UsuarioConPassword>, AppError> {
    use futures_util::TryStreamExt;
    let cursor = db.collection::<Document>("usuarios").find(doc! {}).await?;
    let mut result = Vec::new();
    let docs: Vec<Document> = cursor.try_collect().await?;
    for d in docs {
        let user_doc = document_to_user_with_password_doc(d)?;
        result.push(doc_to_model(user_doc)?);
    }
    Ok(result)
}

pub(super) async fn count_usuarios(db: &Database) -> Result<u64, AppError> {
    db.collection::<Document>("usuarios")
        .count_documents(doc! {})
        .await
        .map_err(Into::into)
}

pub(super) async fn validar_actor_admin(
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

pub(super) fn doc_to_model_public(user_doc: UsuarioConPasswordDoc) -> Result<Usuario, AppError> {
    let m = doc_to_model(user_doc)?;
    Ok(m.public_view())
}

pub(super) async fn enrich_usuario_with_persona(
    db: &Database,
    usuario: &mut Usuario,
) -> Result<(), AppError> {
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

pub(super) async fn enrich_usuarios_with_persona(
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
