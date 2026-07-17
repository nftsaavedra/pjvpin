use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::usuarios::models::UsuarioConPassword;

pub const ROL_SUPERUSER: &str = "superuser";
pub const ROL_ADMIN: &str = "admin";
pub const ROL_OPERADOR: &str = "operador";
pub const ROL_CONSULTA: &str = "consulta";

pub fn validar_identidad_manual_pure(
    nombres: Option<&str>,
    apellido_paterno: Option<&str>,
) -> Result<(), AppError> {
    let nombres_ok = nombres.map(|v| !v.trim().is_empty()).unwrap_or(false);
    let apellido_ok = apellido_paterno
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false);
    if !nombres_ok || !apellido_ok {
        return Err(AppError::InternalError(
            "Ingrese nombres y apellido paterno para registrar al usuario sin RENIEC.".to_string(),
        ));
    }
    Ok(())
}

pub fn validar_usuario_dni_pure(username: &str, dni: &str, rol: &str) -> Result<(), AppError> {
    if username.trim().is_empty() || rol.trim().is_empty() {
        return Err(AppError::InternalError(
            "Complete todos los campos del usuario.".to_string(),
        ));
    }
    Dni::validate(dni)?;
    if !matches!(
        rol.trim(),
        ROL_SUPERUSER | ROL_ADMIN | ROL_OPERADOR | ROL_CONSULTA
    ) {
        return Err(AppError::InternalError(
            "El rol del usuario no es v\u{00e1}lido.".to_string(),
        ));
    }
    Ok(())
}

pub fn assert_actor_can_admin(actor: &UsuarioConPassword) -> Result<(), AppError> {
    if actor.activo == 0 {
        return Err(AppError::InternalError(
            "El usuario actual está inactivo y no puede administrar accesos.".to_string(),
        ));
    }
    if !matches!(actor.rol.trim(), ROL_SUPERUSER | ROL_ADMIN) {
        return Err(AppError::InternalError(
            "No tiene permisos para administrar usuarios.".to_string(),
        ));
    }
    Ok(())
}

pub fn assert_create_role_not_superuser(rol: &str) -> Result<(), AppError> {
    if rol.trim() == ROL_SUPERUSER {
        return Err(AppError::InternalError(
            "Solo el asistente de configuración puede crear el usuario superuser.".to_string(),
        ));
    }
    Ok(())
}

pub fn assert_no_promote_to_superuser(
    current_rol: &str,
    requested_rol: &str,
) -> Result<(), AppError> {
    if requested_rol.trim() == ROL_SUPERUSER && current_rol.trim() != ROL_SUPERUSER {
        return Err(AppError::InternalError(
            "No se puede promover a un usuario al rol superuser.".to_string(),
        ));
    }
    Ok(())
}

pub fn assert_target_not_superuser(target_rol: &str) -> Result<(), AppError> {
    if target_rol.trim() == ROL_SUPERUSER {
        return Err(AppError::InternalError(
            "El usuario superuser no puede ser desactivado ni eliminado.".to_string(),
        ));
    }
    Ok(())
}
