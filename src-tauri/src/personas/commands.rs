use crate::personas::dto::PersonaDeUsuarioDto;
use crate::shared::error::AppError;
use crate::shared::state::AppState;
use tauri::Window;

#[tauri::command]
pub async fn consultar_persona_de_usuario(
    window: Window,
    state: tauri::State<'_, AppState>,
    id_usuario: String,
) -> Result<PersonaDeUsuarioDto, AppError> {
    let window_label = window.label();
    crate::personas::handlers::consultar_persona_de_usuario(&state, window_label, id_usuario).await
}
