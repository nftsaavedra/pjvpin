#[cfg(test)]
mod tests {
    use crate::usuarios::models::UsuarioConPassword;
    use crate::usuarios::validations;

    fn fixture_usuario(rol: &str, activo: i64) -> UsuarioConPassword {
        UsuarioConPassword {
            id_usuario: "u-test".to_string(),
            username: "usuario".to_string(),
            nombre_completo: "Usuario de prueba".to_string(),
            rol: rol.to_string(),
            password_hash: "hash".to_string(),
            activo,
            docente_id: None,
            persona_id: None,
            dni: None,
            updated_at: None,
        }
    }

    #[test]
    fn validar_usuario_dni_acepta_roles_canonicos() {
        for rol in ["superuser", "admin", "operador", "consulta"] {
            assert!(
                validations::validar_usuario_dni_pure("juan", "45678912", rol).is_ok(),
                "rol valido rechazado: {}",
                rol
            );
        }
    }

    #[test]
    fn validar_usuario_dni_acepta_rol_con_espacios() {
        assert!(validations::validar_usuario_dni_pure("juan", "45678912", "  admin  ").is_ok());
    }

    #[test]
    fn validar_usuario_dni_rechaza_roles_invalidos() {
        for rol in ["invitado", "responsable_proyecto", "root", "ADMIN"] {
            let result = validations::validar_usuario_dni_pure("juan", "45678912", rol);
            assert!(result.is_err(), "rol invalido aceptado: {}", rol);
        }
    }

    #[test]
    fn validar_usuario_dni_rechaza_campos_vacios() {
        assert!(validations::validar_usuario_dni_pure("", "45678912", "admin").is_err());
        assert!(validations::validar_usuario_dni_pure("juan", "", "admin").is_err());
        assert!(validations::validar_usuario_dni_pure("juan", "   ", "admin").is_err());
        assert!(validations::validar_usuario_dni_pure("juan", "45678912", "").is_err());
    }

    #[test]
    fn validar_dni_pure_acepta_8_digitos() {
        assert!(validations::validar_dni_pure("45678912").is_ok());
        assert!(validations::validar_dni_pure("  45678912  ").is_ok());
    }

    #[test]
    fn validar_dni_pure_rechaza_formato_invalido() {
        for dni in ["", "   ", "1234567", "123456789", "45678abc", "abc45678"] {
            assert!(
                validations::validar_dni_pure(dni).is_err(),
                "DNI invalido aceptado: {:?}",
                dni
            );
        }
    }

    #[test]
    fn validar_identidad_manual_pure_acepta_campos_completos() {
        assert!(validations::validar_identidad_manual_pure(Some("Juan"), Some("Perez")).is_ok());
    }

    #[test]
    fn validar_identidad_manual_pure_rechaza_faltantes() {
        assert!(validations::validar_identidad_manual_pure(None, Some("Perez")).is_err());
        assert!(validations::validar_identidad_manual_pure(Some("Juan"), None).is_err());
        assert!(validations::validar_identidad_manual_pure(Some(""), Some("Perez")).is_err());
        assert!(validations::validar_identidad_manual_pure(Some("Juan"), Some("")).is_err());
    }

    #[test]
    fn assert_actor_can_admin_acepta_superuser_y_admin() {
        assert!(validations::assert_actor_can_admin(&fixture_usuario("superuser", 1)).is_ok());
        assert!(validations::assert_actor_can_admin(&fixture_usuario("admin", 1)).is_ok());
    }

    #[test]
    fn assert_actor_can_admin_rechaza_otros_roles() {
        for rol in ["operador", "consulta", "responsable_proyecto", "invitado"] {
            assert!(
                validations::assert_actor_can_admin(&fixture_usuario(rol, 1)).is_err(),
                "rol no admin/superuser aceptado: {}",
                rol
            );
        }
    }

    #[test]
    fn assert_actor_can_admin_rechaza_inactivos() {
        let actor = fixture_usuario("admin", 0);
        assert!(validations::assert_actor_can_admin(&actor).is_err());
    }

    #[test]
    fn assert_create_role_not_superuser_bloquea_superuser() {
        for rol in ["superuser", "  superuser  "] {
            assert!(
                validations::assert_create_role_not_superuser(rol).is_err(),
                "rol superuser aceptado en crear: {}",
                rol
            );
        }
        assert!(validations::assert_create_role_not_superuser("admin").is_ok());
        assert!(validations::assert_create_role_not_superuser("operador").is_ok());
    }

    #[test]
    fn assert_no_promote_to_superuser_bloquea_promocion() {
        assert!(validations::assert_no_promote_to_superuser("operador", "superuser").is_err());
        assert!(validations::assert_no_promote_to_superuser("consulta", "superuser").is_err());
        assert!(validations::assert_no_promote_to_superuser("admin", "superuser").is_err());
    }

    #[test]
    fn assert_no_promote_to_superuser_permite_actualizar_superuser_existente() {
        assert!(validations::assert_no_promote_to_superuser("superuser", "superuser").is_ok());
        assert!(validations::assert_no_promote_to_superuser("admin", "admin").is_ok());
        assert!(validations::assert_no_promote_to_superuser("operador", "operador").is_ok());
    }

    #[test]
    fn assert_target_not_superuser_bloquea_superuser() {
        assert!(validations::assert_target_not_superuser("superuser").is_err());
        assert!(validations::assert_target_not_superuser("  superuser  ").is_err());
    }

    #[test]
    fn assert_target_not_superuser_permite_otros_roles() {
        for rol in ["admin", "operador", "consulta", "responsable_proyecto"] {
            assert!(
                validations::assert_target_not_superuser(rol).is_ok(),
                "rol no superuser bloqueado: {}",
                rol
            );
        }
    }
}
