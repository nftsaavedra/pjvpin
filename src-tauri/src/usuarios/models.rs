//! Modelos de dominio de la feature `usuarios`.
//!
//! Esta capa contiene structs de dominio **puros**: sin `serde`, sin `uuid`.
//! Las invariantes se validan en `new()`. La conversion a/desde DTOs y a/desde
//! BSON `Document` se hace explicitamente en las capas de borde
//! (commands/handlers/repository). Ver `crate::usuarios::dto`.

use crate::shared::dni::Dni;
use crate::shared::error::AppError;
use crate::usuarios::dto::{CreateUsuarioRequest, UsuarioConPasswordDto, UsuarioDto};

/// Dominio: usuario sin password (vista publica).
#[derive(Debug, Clone)]
pub struct Usuario {
    pub id_usuario: String,
    pub username: String,
    pub nombre_completo: String,
    pub rol: String,
    pub activo: i64,
    pub investigador_id: Option<String>,
    pub persona_id: Option<String>,
    pub dni: Option<String>,
    pub updated_at: Option<i64>,
}

impl Usuario {
    /// Validacion de invariantes de dominio al construir.
    pub fn new(
        id_usuario: String,
        username: String,
        nombre_completo: String,
        rol: String,
        activo: i64,
        investigador_id: Option<String>,
        persona_id: Option<String>,
        dni: Option<String>,
        updated_at: Option<i64>,
    ) -> Result<Self, AppError> {
        if id_usuario.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de usuario no puede estar vacio.".to_string(),
            ));
        }
        if username.trim().is_empty() {
            return Err(AppError::InternalError(
                "El username no puede estar vacio.".to_string(),
            ));
        }
        if rol.trim().is_empty() {
            return Err(AppError::InternalError(
                "El rol del usuario no puede estar vacio.".to_string(),
            ));
        }
        if activo != 0 && activo != 1 {
            return Err(AppError::InternalError(
                "El campo activo debe ser 0 o 1.".to_string(),
            ));
        }
        Ok(Self {
            id_usuario,
            username,
            nombre_completo,
            rol,
            activo,
            investigador_id,
            persona_id,
            dni,
            updated_at,
        })
    }
}

/// Dominio: usuario con password hash (uso interno, nunca expuesto al frontend).
#[derive(Debug, Clone)]
pub struct UsuarioConPassword {
    pub id_usuario: String,
    pub username: String,
    pub nombre_completo: String,
    pub rol: String,
    pub password_hash: String,
    pub activo: i64,
    pub investigador_id: Option<String>,
    pub persona_id: Option<String>,
    pub dni: Option<String>,
    pub updated_at: Option<i64>,
}

impl UsuarioConPassword {
    pub fn new(
        id_usuario: String,
        username: String,
        nombre_completo: String,
        rol: String,
        password_hash: String,
        activo: i64,
        investigador_id: Option<String>,
        persona_id: Option<String>,
        dni: Option<String>,
        updated_at: Option<i64>,
    ) -> Result<Self, AppError> {
        if id_usuario.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de usuario no puede estar vacio.".to_string(),
            ));
        }
        if username.trim().is_empty() {
            return Err(AppError::InternalError(
                "El username no puede estar vacio.".to_string(),
            ));
        }
        if rol.trim().is_empty() {
            return Err(AppError::InternalError(
                "El rol del usuario no puede estar vacio.".to_string(),
            ));
        }
        if password_hash.is_empty() {
            return Err(AppError::InternalError(
                "El password hash no puede estar vacio.".to_string(),
            ));
        }
        if activo != 0 && activo != 1 {
            return Err(AppError::InternalError(
                "El campo activo debe ser 0 o 1.".to_string(),
            ));
        }
        Ok(Self {
            id_usuario,
            username,
            nombre_completo,
            rol,
            password_hash,
            activo,
            investigador_id,
            persona_id,
            dni,
            updated_at,
        })
    }

    pub fn public_view(&self) -> Usuario {
        Usuario {
            id_usuario: self.id_usuario.clone(),
            username: self.username.clone(),
            nombre_completo: self.nombre_completo.clone(),
            rol: self.rol.clone(),
            activo: self.activo,
            investigador_id: self.investigador_id.clone(),
            persona_id: self.persona_id.clone(),
            dni: self.dni.clone(),
            updated_at: self.updated_at,
        }
    }
}

/// Construye un `UsuarioConPassword` desde un request IPC y un password hash.
pub fn build_usuario_with_password(
    request: CreateUsuarioRequest,
    password_hash: String,
    id_usuario: String,
) -> Result<UsuarioConPassword, AppError> {
    let now = crate::shared::time::now_ms();
    let nombre_completo = compose_nombre_completo(
        request.nombres.as_deref(),
        request.apellido_paterno.as_deref(),
        request.apellido_materno.as_deref(),
    );
    let dni = Dni::new(&request.dni)?.into_string();

    UsuarioConPassword::new(
        id_usuario,
        request.username.trim().to_lowercase(),
        nombre_completo,
        request.rol.trim().to_string(),
        password_hash,
        1,
        request.investigador_id,
        None,
        Some(dni),
        Some(now),
    )
}

pub fn compose_nombre_completo(
    nombres: Option<&str>,
    apellido_paterno: Option<&str>,
    apellido_materno: Option<&str>,
) -> String {
    [nombres, apellido_paterno, apellido_materno]
        .iter()
        .filter_map(|s| s.map(|v| v.trim()))
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

// ============================================================================
// Mappers: DTO <-> Model
// ============================================================================

impl From<UsuarioDto> for Usuario {
    fn from(dto: UsuarioDto) -> Self {
        Self {
            id_usuario: dto.id_usuario,
            username: dto.username,
            nombre_completo: dto.nombre_completo,
            rol: dto.rol,
            activo: dto.activo,
            investigador_id: dto.investigador_id,
            persona_id: dto.persona_id,
            dni: dto.dni,
            updated_at: dto.updated_at,
        }
    }
}

impl From<Usuario> for UsuarioDto {
    fn from(m: Usuario) -> Self {
        Self {
            id_usuario: m.id_usuario,
            username: m.username,
            nombre_completo: m.nombre_completo,
            rol: m.rol,
            activo: m.activo,
            investigador_id: m.investigador_id,
            persona_id: m.persona_id,
            dni: m.dni,
            updated_at: m.updated_at,
        }
    }
}

impl From<UsuarioConPasswordDto> for UsuarioConPassword {
    fn from(dto: UsuarioConPasswordDto) -> Self {
        Self {
            id_usuario: dto.id_usuario,
            username: dto.username,
            nombre_completo: dto.nombre_completo,
            rol: dto.rol,
            password_hash: dto.password_hash,
            activo: dto.activo,
            investigador_id: dto.investigador_id,
            persona_id: dto.persona_id,
            dni: dto.dni,
            updated_at: dto.updated_at,
        }
    }
}

impl From<UsuarioConPassword> for UsuarioConPasswordDto {
    fn from(m: UsuarioConPassword) -> Self {
        Self {
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_rejects_empty_id() {
        let r = Usuario::new(
            String::new(),
            "u".into(),
            "n".into(),
            "admin".into(),
            1,
            None,
            None,
            None,
            None,
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_rejects_empty_username() {
        let r = Usuario::new(
            "id".into(),
            String::new(),
            "n".into(),
            "admin".into(),
            1,
            None,
            None,
            None,
            None,
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_rejects_invalid_activo() {
        let r = Usuario::new(
            "id".into(),
            "u".into(),
            "n".into(),
            "admin".into(),
            5,
            None,
            None,
            None,
            None,
        );
        assert!(r.is_err());
    }

    #[test]
    fn new_accepts_valid() {
        let r = Usuario::new(
            "id".into(),
            "u".into(),
            "n".into(),
            "admin".into(),
            1,
            None,
            None,
            None,
            None,
        );
        assert!(r.is_ok());
    }

    #[test]
    fn public_view_drops_password_hash() {
        let u = UsuarioConPassword::new(
            "id".into(),
            "u".into(),
            "n".into(),
            "admin".into(),
            "hash".into(),
            1,
            None,
            None,
            None,
            None,
        )
        .unwrap();
        let v = u.public_view();
        assert_eq!(v.id_usuario, "id");
        assert_eq!(v.activo, 1);
    }

    #[test]
    fn compose_nombre_full() {
        let s = compose_nombre_completo(Some("Juan"), Some("Perez"), Some("Lopez"));
        assert_eq!(s, "Juan Perez Lopez");
    }

    #[test]
    fn compose_nombre_omits_empty() {
        let s = compose_nombre_completo(Some("Juan"), Some(""), Some("Lopez"));
        assert_eq!(s, "Juan Lopez");
    }

    #[test]
    fn dto_model_roundtrip() {
        let dto = UsuarioDto {
            id_usuario: "i".into(),
            username: "u".into(),
            nombre_completo: "n".into(),
            rol: "admin".into(),
            activo: 1,
            investigador_id: None,
            persona_id: None,
            dni: Some("12345678".into()),
            updated_at: Some(1000),
        };
        let m: Usuario = dto.clone().into();
        let back: UsuarioDto = m.into();
        assert_eq!(back.id_usuario, dto.id_usuario);
        assert_eq!(back.dni, dto.dni);
    }
}
