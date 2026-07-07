use tauri::Manager;

mod catalogos;
mod eventos;
mod grados;
mod grupos;
mod investigadores;
mod personas;
mod proyectos;
mod publicaciones;
mod recursos;
mod reportes;
mod seguridad;
mod shared;
mod usuarios;

use catalogos::commands as catalogo_cmds;
use eventos::commands as evento_cmds;
use grados::commands as grado_cmds;
use grupos::commands as grupo_cmds;
use investigadores::commands as investigador_cmds;
use proyectos::commands as proyecto_cmds;
use publicaciones::commands as publicacion_cmds;
use recursos::commands as recurso_cmds;
use reportes::commands as reporte_cmds;
use seguridad::commands as security_cmds;
use usuarios::commands as usuario_cmds;

use shared::config::load_runtime_config;
use shared::config_validator::validate_database_config;
use shared::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    shared::logging::init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let user_config_path = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| {
                    app.path()
                        .app_data_dir()
                        .unwrap_or_else(|_| std::env::temp_dir())
                })
                .join("pjvpin.config.json");

            let project_env_path = std::env::current_dir()
                .ok()
                .and_then(|dir| {
                    let candidates = [
                        dir.join(".env"),
                        dir.parent().map(|p| p.join(".env")).unwrap_or_default(),
                    ];
                    candidates.into_iter().find(|path| path.exists())
                });

            let runtime_config = load_runtime_config(
                &user_config_path,
                project_env_path.as_deref(),
            )?;

            let mongo_db = if runtime_config.database.mongodb_uri.is_some() {
                if let Err(error) = validate_database_config(&runtime_config.database) {
                    let error_msg = format!(
                        "Error de configuracion: {}\n\nArchivo de configuracion: {:?}\n\nPara re-configurar la aplicacion, elimine el archivo de configuracion y reinicie.",
                        error,
                        user_config_path
                    );
                    tracing::error!("{}", error_msg);
                    return Err(std::io::Error::other(error_msg).into());
                }

                let database = tauri::async_runtime::block_on(async {
                    shared::db::init_mongo(&runtime_config.database).await
                })
                .map_err(|error| {
                    std::io::Error::other(format!(
                        "No se pudo conectar a MongoDB.\n\n\
                        Error: {}\n\n\
                        Verifique:\n\
                        1. La URI de MongoDB es correcta (configurada en {:?})\n\
                        2. El servidor MongoDB esta ejecutandose\n\
                        3. Las credenciales son correctas\n\
                        4. La base de datos es accesible desde esta maquina",
                        error,
                        user_config_path
                    ))
                })?;

                tauri::async_runtime::block_on(async {
                    catalogos::repository::seed_catalogos(&database).await
                })
                .map_err(|e| {
                    std::io::Error::other(format!("Error sembrando catalogos: {}", e))
                })?;

                Some(database)
            } else {
                tracing::info!(
                    "Sin configuracion MongoDB. Iniciando en modo wizard (sin conexion a BD)."
                );
                None
            };

            app.manage(AppState::new(
                mongo_db,
                runtime_config.reniec,
                runtime_config.renacyt,
                runtime_config.pure,
            ));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Investigadores
            investigador_cmds::crear_investigador,
            investigador_cmds::get_all_investigadores,
            investigador_cmds::get_all_investigadores_paginated,
            investigador_cmds::buscar_investigador_por_dni,
            investigador_cmds::get_all_investigadores_con_proyectos,
            investigador_cmds::eliminar_investigador,
            investigador_cmds::reactivar_investigador,
            investigador_cmds::actualizar_investigador,
            investigador_cmds::consultar_dni_reniec,
            investigador_cmds::consultar_renacyt_investigador,
            investigador_cmds::buscar_investigador_por_dni_con_renacyt,
            investigador_cmds::refrescar_formacion_academica_renacyt_investigador,
            // Proyectos
            proyecto_cmds::crear_proyecto_con_participantes,
            proyecto_cmds::actualizar_proyecto_con_participantes,
            proyecto_cmds::buscar_proyectos_por_docente,
            proyecto_cmds::get_all_proyectos_detalle,
            proyecto_cmds::get_all_proyectos_paginated,
            proyecto_cmds::eliminar_relacion_proyecto_docente,
            proyecto_cmds::eliminar_relaciones_proyecto,
            proyecto_cmds::eliminar_proyecto,
            proyecto_cmds::reactivar_proyecto,
            // Reportes
            reporte_cmds::get_estadisticas_proyectos_x_docente,
            reporte_cmds::get_kpis_dashboard,
            reporte_cmds::get_data_exportacion_plana,
            reporte_cmds::get_data_exportacion_agrupada_docente,
            reporte_cmds::write_export_file,
            reporte_cmds::get_reporte_proyecto_integral,
            reporte_cmds::get_reporte_docente_integral,
            reporte_cmds::get_reportes_docentes_integral,
            reporte_cmds::get_data_exportacion_grupos,
            reporte_cmds::get_data_exportacion_recursos,
            reporte_cmds::get_data_exportacion_docentes_perfil,
            reporte_cmds::get_data_exportacion_proyectos_area,
            reporte_cmds::get_proyectos_trend,
            reporte_cmds::get_renacyt_distribucion,
            // Grados
            grado_cmds::get_all_grados,
            grado_cmds::get_all_grados_paginated,
            grado_cmds::crear_grado,
            grado_cmds::actualizar_grado,
            grado_cmds::eliminar_grado,
            grado_cmds::reactivar_grado,
            // Catalogos
            catalogo_cmds::get_catalogos,
            catalogo_cmds::get_all_catalogos_admin,
            catalogo_cmds::crear_catalogo,
            catalogo_cmds::actualizar_catalogo,
            catalogo_cmds::eliminar_catalogo,
            catalogo_cmds::reactivar_catalogo,
            // Usuarios
            usuario_cmds::crear_usuario,
            usuario_cmds::get_auth_status,
            usuario_cmds::registrar_primer_usuario,
            usuario_cmds::login_usuario,
            usuario_cmds::get_current_session,
            usuario_cmds::logout_usuario,
            usuario_cmds::get_all_usuarios,
            usuario_cmds::get_all_usuarios_paginated,
            usuario_cmds::actualizar_usuario,
            usuario_cmds::desactivar_usuario,
            usuario_cmds::reactivar_usuario,
            usuario_cmds::consultar_dni_para_usuario,
            // Seguridad
            security_cmds::get_security_status,
            security_cmds::get_setup_guide,
            security_cmds::get_security_recommendations,
            // Wizard de configuracion
            security_cmds::wizard_has_config,
            security_cmds::wizard_test_mongodb,
            security_cmds::wizard_test_reniec,
            security_cmds::wizard_test_renacyt,
            security_cmds::wizard_test_pure,
            security_cmds::wizard_save_config,
            security_cmds::wizard_validate_master_password,
            security_cmds::wizard_consultar_dni,
            // Pure (moved to shared/external)
            crate::shared::external::pure_cmd::sincronizar_publicaciones_pure,
            crate::shared::external::pure_cmd::get_publicaciones_investigador,
            // Grupos
            grupo_cmds::get_all_grupos,
            grupo_cmds::create_grupo,
            grupo_cmds::get_grupo,
            grupo_cmds::update_grupo,
            grupo_cmds::delete_grupo,
            // Recursos
            recurso_cmds::crear_patente,
            recurso_cmds::get_patentes_proyecto,
            recurso_cmds::actualizar_patente,
            recurso_cmds::eliminar_patente,
            recurso_cmds::reactivar_patente,
            recurso_cmds::crear_producto,
            recurso_cmds::get_productos_proyecto,
            recurso_cmds::actualizar_producto,
            recurso_cmds::eliminar_producto,
            recurso_cmds::reactivar_producto,
            recurso_cmds::crear_equipamiento,
            recurso_cmds::get_equipamientos_proyecto,
            recurso_cmds::actualizar_equipamiento,
            recurso_cmds::eliminar_equipamiento,
            recurso_cmds::reactivar_equipamiento,
            recurso_cmds::crear_financiamiento,
            recurso_cmds::get_financiamientos_proyecto,
            recurso_cmds::actualizar_financiamiento,
            recurso_cmds::eliminar_financiamiento,
            recurso_cmds::reactivar_financiamiento,
            // Publicaciones Cientificas
            publicacion_cmds::crear_publicacion,
            publicacion_cmds::get_all_publicaciones,
            publicacion_cmds::get_publicacion_by_id,
            publicacion_cmds::get_publicaciones_by_docente,
            publicacion_cmds::get_publicaciones_by_anio,
            publicacion_cmds::actualizar_publicacion,
            publicacion_cmds::eliminar_publicacion,
            publicacion_cmds::reactivar_publicacion,
            // Eventos Academicos
            evento_cmds::crear_evento,
            evento_cmds::get_all_eventos,
            evento_cmds::get_evento_by_id,
            evento_cmds::get_eventos_by_docente,
            evento_cmds::actualizar_evento,
            evento_cmds::eliminar_evento,
            evento_cmds::reactivar_evento,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
