#[cfg(test)]
mod tests {
    use crate::shared::rbac::{role_has_permission, AppPermission};

    #[test]
    fn test_superuser_has_all_permissions() {
        let all_perms = [
            AppPermission::DashboardView,
            AppPermission::DocentesView,
            AppPermission::DocentesManage,
            AppPermission::ProyectosView,
            AppPermission::ProyectosManage,
            AppPermission::ReportesView,
            AppPermission::ReportesExport,
            AppPermission::GradosRead,
            AppPermission::GradosManage,
            AppPermission::GruposView,
            AppPermission::GruposManage,
            AppPermission::RecursosManage,
            AppPermission::CatalogosManage,
            AppPermission::ConfiguracionServicios,
            AppPermission::UsuariosManage,
        ];

        for perm in &all_perms {
            assert!(
                role_has_permission("superuser", perm),
                "superuser should have {:?}",
                perm
            );
        }
    }

    #[test]
    fn test_admin_has_operational_permissions() {
        assert!(role_has_permission("admin", &AppPermission::DashboardView));
        assert!(role_has_permission("admin", &AppPermission::DocentesManage));
        assert!(role_has_permission(
            "admin",
            &AppPermission::ProyectosManage
        ));
        assert!(role_has_permission("admin", &AppPermission::ReportesExport));
        assert!(role_has_permission("admin", &AppPermission::UsuariosManage));
        assert!(role_has_permission(
            "admin",
            &AppPermission::CatalogosManage
        ));
    }

    #[test]
    fn test_admin_cannot_access_configuracion_servicios() {
        assert!(!role_has_permission(
            "admin",
            &AppPermission::ConfiguracionServicios
        ));
    }

    #[test]
    fn test_responsable_proyecto_can_manage_proyectos() {
        assert!(role_has_permission(
            "responsable_proyecto",
            &AppPermission::ProyectosManage
        ));
        assert!(role_has_permission(
            "responsable_proyecto",
            &AppPermission::ProyectosView
        ));
        assert!(role_has_permission(
            "responsable_proyecto",
            &AppPermission::DashboardView
        ));
    }

    #[test]
    fn test_responsable_proyecto_cannot_manage_usuarios() {
        assert!(!role_has_permission(
            "responsable_proyecto",
            &AppPermission::UsuariosManage
        ));
        assert!(!role_has_permission(
            "responsable_proyecto",
            &AppPermission::CatalogosManage
        ));
        assert!(!role_has_permission(
            "responsable_proyecto",
            &AppPermission::DocentesManage
        ));
    }

    #[test]
    fn test_responsable_proyecto_can_view_docentes() {
        assert!(role_has_permission(
            "responsable_proyecto",
            &AppPermission::DocentesView
        ));
    }

    #[test]
    fn test_unknown_role_has_no_permissions() {
        assert!(!role_has_permission(
            "unknown_role",
            &AppPermission::DashboardView
        ));
        assert!(!role_has_permission(
            "unknown_role",
            &AppPermission::ProyectosView
        ));
    }

    #[test]
    fn test_white_space_trimmed() {
        assert!(role_has_permission(
            " superuser ",
            &AppPermission::DashboardView
        ));
        assert!(role_has_permission(
            " admin ",
            &AppPermission::ProyectosManage
        ));
    }
}
