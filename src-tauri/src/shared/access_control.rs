use crate::shared::error::AppError;
use crate::shared::state::AppState;
use crate::usuarios::models::Usuario;

pub use crate::shared::rbac::{
    require_docentes_manage_permission, require_docentes_view_permission,
};

pub async fn verificar_acceso_proyecto_responsable(
    state: &AppState,
    actor: &Usuario,
    id_proyecto: &str,
) -> Result<bool, AppError> {
    if actor.rol.trim() != "responsable_proyecto" {
        return Ok(true);
    }
    let docente_id = actor.docente_id.as_ref().ok_or_else(|| {
        AppError::InternalError(
            "Usuario responsable_proyecto no tiene un docente asociado.".to_string(),
        )
    })?;

    let db = state.mongo_db()?;
    use crate::proyectos::models::ParticipacionRecord;
    use futures_util::TryStreamExt;
    use mongodb::bson::doc;

    let participaciones: Vec<ParticipacionRecord> = db
        .collection::<ParticipacionRecord>("participaciones")
        .find(doc! {
            "id_proyecto": id_proyecto,
            "id_docente": docente_id,
            "es_responsable": true,
        })
        .await?
        .try_collect()
        .await?;

    Ok(!participaciones.is_empty())
}
