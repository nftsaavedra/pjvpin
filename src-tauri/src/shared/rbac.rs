use crate::shared::error::AppError;
use crate::shared::state::AppState;
use crate::usuarios::models::Usuario;
use crate::usuarios::service as usuario_service;

#[derive(Debug)]
pub enum AppPermission {
    DashboardView,
    DocentesView,
    DocentesManage,
    ProyectosView,
    ProyectosManage,
    ReportesView,
    ReportesExport,
    GradosRead,
    GradosManage,
    GruposView,
    GruposManage,
    RecursosManage,
    CatalogosManage,
    ConfiguracionServicios,
    UsuariosManage,
}

pub fn role_has_permission(role: &str, permission: &AppPermission) -> bool {
    match role.trim() {
        "superuser" => true,
        "admin" => matches!(
            permission,
            AppPermission::DashboardView
                | AppPermission::DocentesView
                | AppPermission::DocentesManage
                | AppPermission::ProyectosView
                | AppPermission::ProyectosManage
                | AppPermission::ReportesView
                | AppPermission::ReportesExport
                | AppPermission::GradosRead
                | AppPermission::GradosManage
                | AppPermission::GruposView
                | AppPermission::GruposManage
                | AppPermission::RecursosManage
                | AppPermission::CatalogosManage
                | AppPermission::UsuariosManage
        ),
        "operador" => matches!(
            permission,
            AppPermission::DashboardView
                | AppPermission::DocentesView
                | AppPermission::DocentesManage
                | AppPermission::ProyectosView
                | AppPermission::ProyectosManage
                | AppPermission::ReportesView
                | AppPermission::ReportesExport
                | AppPermission::GradosRead
                | AppPermission::GruposView
                | AppPermission::GruposManage
                | AppPermission::RecursosManage
                | AppPermission::CatalogosManage
        ),
        "consulta" => matches!(
            permission,
            AppPermission::DashboardView
                | AppPermission::DocentesView
                | AppPermission::ProyectosView
                | AppPermission::ReportesView
                | AppPermission::GruposView
        ),
        "responsable_proyecto" => matches!(
            permission,
            AppPermission::DashboardView
                | AppPermission::DocentesView
                | AppPermission::ProyectosView
                | AppPermission::ProyectosManage
                | AppPermission::ReportesView
                | AppPermission::ReportesExport
                | AppPermission::RecursosManage
        ),
        _ => false,
    }
}

pub fn is_admin_or_higher(role: &str) -> bool {
    matches!(role.trim(), "superuser" | "admin")
}

pub async fn require_permission(
    state: &AppState,
    window_label: &str,
    permission: AppPermission,
) -> Result<Usuario, AppError> {
    let actor = get_session_actor_user(state, window_label).await?;

    if !role_has_permission(&actor.rol, &permission) {
        return Err(AppError::InternalError(
            "No tiene permisos para ejecutar esta operacion.".to_string(),
        ));
    }

    Ok(actor)
}

pub async fn require_permission_proyecto(
    state: &AppState,
    window_label: &str,
    permission: AppPermission,
    id_proyecto: &str,
) -> Result<Usuario, AppError> {
    let actor = get_session_actor_user(state, window_label).await?;

    if actor.rol.trim() == "responsable_proyecto" {
        let tiene_acceso = crate::shared::access_control::verificar_acceso_proyecto_responsable(
            state,
            &actor,
            id_proyecto,
        )
        .await?;
        if !tiene_acceso {
            return Err(AppError::InternalError(
                "No tiene acceso a este proyecto.".to_string(),
            ));
        }
    }

    if !role_has_permission(&actor.rol, &permission) {
        return Err(AppError::InternalError(
            "No tiene permisos para ejecutar esta operacion.".to_string(),
        ));
    }

    Ok(actor)
}

pub async fn require_docentes_manage_permission(
    state: &AppState,
    window_label: &str,
) -> Result<Usuario, AppError> {
    require_permission(state, window_label, AppPermission::DocentesManage).await
}

pub async fn require_docentes_view_permission(
    state: &AppState,
    window_label: &str,
) -> Result<Usuario, AppError> {
    require_permission(state, window_label, AppPermission::DocentesView).await
}

pub async fn get_session_actor_user(
    state: &AppState,
    window_label: &str,
) -> Result<Usuario, AppError> {
    let actor_user_id = state
        .validate_session(window_label)
        .await
        .map_err(|msg| AppError::InternalError(msg.to_string()))?;

    let actor = match get_user_by_id(state, &actor_user_id).await {
        Ok(actor) => actor,
        Err(AppError::NotFound(_)) => {
            state.clear_current_session(window_label).await;
            return Err(AppError::InternalError(
                "La sesion actual ya no es valida. Inicie sesion nuevamente.".to_string(),
            ));
        }
        Err(error) => return Err(error),
    };

    if actor.activo == 0 {
        state.clear_current_session(window_label).await;
        return Err(AppError::InternalError(
            "La sesion actual pertenece a un usuario inactivo. Inicie sesion nuevamente."
                .to_string(),
        ));
    }

    state.touch_current_session(window_label).await;
    Ok(actor)
}

pub(crate) async fn get_user_by_id(state: &AppState, user_id: &str) -> Result<Usuario, AppError> {
    usuario_service::get_by_id_public(state, user_id).await
}
