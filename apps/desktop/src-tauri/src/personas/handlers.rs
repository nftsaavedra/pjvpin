use crate::personas::dto::PersonaDeUsuarioDto;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;
use crate::usuarios::repository as usuarios_repo;

pub async fn consultar_persona_de_usuario(
    state: &AppState,
    window_label: &str,
    id_usuario: String,
) -> Result<PersonaDeUsuarioDto, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::UsuariosManage).await?;

    let db = state.mongo_db()?;
    let usuario = usuarios_repo::get_usuario_by_id_public(db, &id_usuario).await?;
    let persona_id = usuario.persona_id.ok_or_else(|| {
        AppError::NotFound("El usuario no tiene una persona vinculada.".to_string())
    })?;
    let persona = crate::personas::repository::find_by_id(db, &persona_id).await?;

    Ok(PersonaDeUsuarioDto {
        id_persona: persona.id_persona,
        dni: persona.dni,
        nombres: persona.nombres.unwrap_or_default(),
        apellido_paterno: persona.apellido_paterno.unwrap_or_default(),
        apellido_materno: persona.apellido_materno,
        nombre_completo: persona.nombre_completo,
    })
}
