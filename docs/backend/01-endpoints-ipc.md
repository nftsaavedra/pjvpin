# Censo de Endpoints IPC — Comandos Tauri (155)

> Fuente: `src-tauri/src/lib.rs:201-378` (invoke_handler) + definiciones `#[tauri::command]`.
> Verificación: 155 registrados = 155 definidos (`rg -c "#[tauri::command]"` suma exacta). Sin desync.

## 1. Resumen

| Métrica | Valor |
|---|---|
| Comandos registrados en `invoke_handler` | **155** |
| Desync definidos vs registrados | Ninguno (1:1) |
| Archivos `commands.rs` / `*cmd.rs` | 17 |

Desglose por feature: investigadores (18), proyectos (15), reportes (18), grados (6), catálogos+vocabularios (9), geo (3), org_units (5), OCDE (3), usuarios (12), personas (1), seguridad (3), wizard (9), Pure (3), PeruCRIS (5), grupos (5), recursos (21), publicaciones (12), eventos (7).

## 2. Censo por feature

### 2.1 Investigadores (18) — `investigadores/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_investigador` | commands.rs:23-31 | `request: CreateInvestigadorRequest` (camelCase) | `Result<InvestigadorDto, AppError>` | `InvestigadoresManage` | `investigador.create` | Mongo | Sí |
| `get_all_investigadores` | commands.rs:33-40 | — | `Result<Vec<InvestigadorDto>, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `get_all_investigadores_paginated` | commands.rs:42-58 | `page: u32, limit: u32` | `Result<PaginatedResult<InvestigadorDto>, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `buscar_investigador_por_dni` | commands.rs:60-68 | `dni: String` | `Result<Option<InvestigadorDto>, AppError>` | `InvestigadoresManage` | — | Mongo | Sí |
| `get_all_investigadores_con_proyectos` | commands.rs:70-76 | — | `Result<Vec<InvestigadorDetalleDto>, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `eliminar_investigador` | commands.rs:78-85 | `id_investigador: String` | `Result<EliminarInvestigadorResultadoDto, AppError>` | `InvestigadoresManage` | `investigador.delete` | Mongo | Sí |
| `reactivar_investigador` | commands.rs:87-95 | `id_investigador: String` | `Result<InvestigadorDto, AppError>` | `InvestigadoresManage` | `investigador.reactivate` | Mongo | Sí |
| `actualizar_investigador` | commands.rs:97-107 | `id_investigador: String, request: UpdateInvestigadorRequest` (camelCase) | `Result<InvestigadorDto, AppError>` | `InvestigadoresManage` | `investigador.update` | Mongo | Sí |
| `consultar_dni_reniec` | commands.rs:109-126 | `numero: String` | `Result<ReniecDniLookupResult, AppError>` | `InvestigadoresManage` (en command) | — | **RENIEC** + cache `reniec_cache` (TTL 1h) | Sí |
| `consultar_renacyt_investigador` | commands.rs:128-136 | `codigo_o_id: String` | `Result<RenacytLookupResult, AppError>` | `InvestigadoresManage` (en command) | — | **RENACYT** | Sí |
| `buscar_investigador_por_dni_con_renacyt` | commands.rs:138-171 | `dni: String` | `Result<Option<RenacytLookupResult>, AppError>` | `InvestigadoresView` con fallback `InvestigadoresManage` | — | **RENACYT** | Sí |
| `refrescar_formacion_academica_renacyt_investigador` | commands.rs:173-185 | `id_investigador: String` | `Result<RefreshInvestigadorRenacytFormacionResultadoDto, AppError>` | `InvestigadoresManage` | `renacyt.refresh.updated` / `renacyt.refresh.no_change` | **RENACYT** + kardex | Sí |
| `descargar_constancia_renacyt_investigador` | commands.rs:187-195 | `id_investigador: String` | `Result<Vec<u8>, AppError>` (PDF) | `InvestigadoresView` | `investigador.constancia_renacyt` | **RENACYT** | Sí |
| `importar_investigadores` | commands.rs:202-233 | `request: ImportInvestigadoresRequest` = `{ dnis: Vec<String> }` (camelCase, máx 200/lote) | `Result<ImportInvestigadoresResult, AppError>` (14 contadores + `errores`) | `InvestigadoresManage` (en command) | `investigador.import` (en command) | **RENIEC → PeruCRIS → Pure → RENACYT** (conc. 5, circuit breaker RENIEC 3 fallos) | Sí |
| `get_plantilla_investigadores_default` | commands.rs:241-253 | — | `Result<Vec<String>, AppError>` (55 DNIs UNF embebidos) | `InvestigadoresView` (en command) | — | Ninguno (JSON embebido) | Sí |
| `get_kardex_investigador` | commands.rs:258-265 | `id_investigador: String` | `Result<Vec<KardexEntry>, AppError>` | `InvestigadoresView` | — | Mongo (colección `renacyt_kardex`) | Sí |
| `marcar_cambios_renacyt_revisados` | commands.rs:269-276 | `id_investigador: String` | `Result<InvestigadorDto, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `refrescar_renacyt_todos` | commands.rs:281-287 | — | `Result<RefreshMasivoRenacytResultadoDto, AppError>` | `InvestigadoresManage` | `renacyt.refresh.batch` | **RENACYT** (lote, conc. 5) | Sí |

### 2.2 Proyectos (15) — `proyectos/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_proyecto_con_participantes` | commands.rs:10-17 | `request: CreateProyectoConParticipantesRequest` (camelCase) | `Result<ProyectoDto, AppError>` | `ProyectosManage` | `proyecto.create` | Mongo | Sí |
| `actualizar_proyecto_con_participantes` | commands.rs:28-36 | `id_proyecto: String, request: UpdateProyectoConParticipantesRequest` (camelCase) | `Result<ProyectoDto, AppError>` | `ProyectosManage` | `proyecto.update` | Mongo | Sí |
| `buscar_proyectos_por_investigador` | commands.rs:19-26 | `id_investigador: String` | `Result<Vec<ProyectoDto>, AppError>` | `ProyectosView` | — | Mongo | Sí |
| `get_all_proyectos_detalle` | commands.rs:38-44 | — | `Result<Vec<ProyectoDetalleDto>, AppError>` | `ProyectosView` (filtra por `investigador_id` si rol=`responsable_proyecto`) | — | Mongo | Sí |
| `get_all_proyectos_paginated` | commands.rs:46-54 | `page: u32, limit: u32` | `Result<PaginatedResult<ProyectoDto>, AppError>` | `ProyectosView` (filtro `responsable_proyecto` igual) | — | Mongo | Sí |
| `eliminar_relacion_proyecto_investigador` | commands.rs:56-70 | `id_proyecto: String, id_investigador: String` | `Result<(), AppError>` | `ProyectosManage` | `proyecto.delete_relation` | Mongo | Sí |
| `eliminar_relaciones_proyecto` | commands.rs:72-79 | `id_proyecto: String` | `Result<(), AppError>` | `ProyectosManage` | `proyecto.delete_relations` | Mongo | Sí |
| `eliminar_proyecto` | commands.rs:81-88 | `id_proyecto: String` | `Result<EliminarProyectoResultadoDto, AppError>` | `ProyectosManage` | `proyecto.delete` | Mongo | Sí |
| `reactivar_proyecto` | commands.rs:90-97 | `id_proyecto: String` | `Result<ProyectoDto, AppError>` | `ProyectosManage` | `proyecto.reactivate` | Mongo | Sí |
| `vincular_org_proyecto` | commands.rs:118-132 | `request: VincularOrgProyectoRequest` = `{ id_proyecto, id_org_unit, rol }` (camelCase) | `Result<(), AppError>` | `ProyectosManage` | `proyecto.vincular_org` | Mongo (pivot `proyecto_organizaciones`, FK checks) | Sí |
| `desvincular_org_proyecto` | commands.rs:134-141 | `id_pivot: String` | `Result<(), AppError>` | `ProyectosManage` | `proyecto.desvincular_org` | Mongo | Sí |
| `listar_orgs_proyecto` | commands.rs:143-156 | `id_proyecto: String` | `Result<Vec<ProyectoOrganizacionDoc>, AppError>` | `ProyectosView` | — | Mongo | Sí |
| `vincular_financiamiento_proyecto` | commands.rs:158-173 | `request: VincularFinProyectoRequest` = `{ id_proyecto, id_financiamiento, monto_asignado?, moneda? }` (camelCase) | `Result<(), AppError>` | `ProyectosManage` | `proyecto.vincular_fin` | Mongo (pivot `proyecto_financiamientos`) | Sí |
| `desvincular_financiamiento_proyecto` | commands.rs:175-182 | `id_pivot: String` | `Result<(), AppError>` | `ProyectosManage` | `proyecto.desvincular_fin` | Mongo | Sí |
| `listar_financiamientos_proyecto` | commands.rs:184-197 | `id_proyecto: String` | `Result<Vec<ProyectoFinanciamientoDoc>, AppError>` | `ProyectosView` | — | Mongo | Sí |

### 2.3 Reportes (18) — `reportes/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `get_estadisticas_proyectos_x_investigador` | commands.rs:29-35 | — | `Result<Vec<InvestigadorProyectosCountDto>, AppError>` | `DashboardView` | — | Mongo | Sí |
| `get_kpis_dashboard` | commands.rs:37-43 | — | `Result<KpisDashboardDto, AppError>` | `DashboardView` | — | Mongo | Sí |
| `get_data_exportacion_plana` | commands.rs:45-51 | — | `Result<Vec<ExportDataDto>, AppError>` | `ReportesExport` | — | Mongo | Sí |
| `get_data_exportacion_agrupada_investigador` | commands.rs:54-60 | — | `Result<Vec<ExportDataConProjectosDto>, AppError>` | `ReportesView` | — | Mongo | Sí |
| `write_export_file` | commands.rs:62-70 | `file_path: String, bytes: Vec<u8>` | `Result<(), AppError>` | `ReportesExport` | `reportes.export` | Disco (path sanitizado, restringido al CWD) | Sí |
| `get_reporte_proyecto_integral` | commands.rs:74-81 | `id_proyecto: String` | `Result<ReporteProyectoIntegral, AppError>` | `ReportesExport` | — | Mongo | Sí |
| `get_reporte_investigador_integral` | commands.rs:83-90 | `id_investigador: String` | `Result<ReporteInvestigadorIntegral, AppError>` | `ReportesExport` | — | Mongo | Sí |
| `get_reportes_investigadores_integral` | commands.rs:92-98 | — | `Result<Vec<ReporteInvestigadorIntegral>, AppError>` | `ReportesExport` | — | Mongo | Sí |
| `get_data_exportacion_grupos` | commands.rs:100-106 | — | `Result<Vec<ExportDataGrupoDto>, AppError>` | `ReportesView` | — | Mongo | Sí |
| `get_data_exportacion_recursos` | commands.rs:108-114 | — | `Result<Vec<ExportDataRecursoDto>, AppError>` | `ReportesView` | — | Mongo | Sí |
| `get_data_exportacion_investigadores_perfil` | commands.rs:116-122 | — | `Result<Vec<ExportDataInvestigadorPerfilDto>, AppError>` | `ReportesView` | — | Mongo | Sí |
| `get_data_exportacion_proyectos_area` | commands.rs:124-130 | — | `Result<Vec<ExportDataProyectoAreaDto>, AppError>` | `ReportesView` | — | Mongo | Sí |
| `get_proyectos_trend` | commands.rs:132-138 | — | `Result<Vec<ProyectosTrendItemDto>, AppError>` | `DashboardView` | — | Mongo | Sí |
| `get_renacyt_distribucion` | commands.rs:140-146 | — | `Result<Vec<RenacytDistribucionItemDto>, AppError>` | `DashboardView` | — | Mongo | Sí |
| `exportar_cerif` | commands.rs:19-27 | `file_path: String, entidad: Option<String>` | `Result<CerifExportResult, AppError>` | `ReportesExport` (delega a `write_export_file`) | `reportes.export` (vía write_export_file) | Mongo → JSON → disco | Sí |
| `get_data_pure_masterlist` | commands.rs:152-159 | `pure_remote_total: Option<usize>` | `Result<PureMasterlistData, AppError>` | `ReportesView` | — | Mongo | Sí |
| `verificar_diferencias_pure` | commands.rs:164-171 | `investigador_id: Option<String>` | `Result<SyncReport, AppError>` | `InvestigadoresView` | `pure.diff` | **Pure** (diff doble vía, read-only) + persiste `sync_reportes` | Sí |
| `list_sync_reports` | commands.rs:175-183 | `tipo: Option<String>, limit: Option<i64>` | `Result<Vec<SyncReport>, AppError>` | `InvestigadoresView` | — | Mongo (`sync_reportes`) | Sí |

### 2.4 Grados (6) — `grados/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `get_all_grados` | commands.rs:7-14 | — | `Result<Vec<GradoAcademicoDto>, AppError>` | `GradosRead` | — | Mongo | Sí |
| `get_all_grados_paginated` | commands.rs:16-31 | `page: u32, limit: u32` | `Result<PaginatedResult<GradoAcademicoDto>, AppError>` | `GradosRead` | — | Mongo | Sí |
| `crear_grado` | commands.rs:33-41 | `request: CreateGradoRequest` | `Result<GradoAcademicoDto, AppError>` | `GradosManage` | `grado.create` | Mongo | Sí |
| `actualizar_grado` | commands.rs:43-52 | `id_grado: String, request: CreateGradoRequest` | `Result<GradoAcademicoDto, AppError>` | `GradosManage` | `grado.update` | Mongo | Sí |
| `eliminar_grado` | commands.rs:54-61 | `id_grado: String` | `Result<EliminarGradoResultadoDto, AppError>` | `GradosManage` | `grado.delete` | Mongo | Sí |
| `reactivar_grado` | commands.rs:63-71 | `id_grado: String` | `Result<GradoAcademicoDto, AppError>` | `GradosManage` | `grado.reactivate` | Mongo | Sí |

### 2.5 Catálogos + Vocabularios CONCYTEC (9) — `catalogos/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `get_catalogos` | commands.rs:8-16 | `tipo: String` | `Result<Vec<CatalogoItemDto>, AppError>` | `CatalogosRead` | — | Mongo | Sí |
| `get_all_catalogos_admin` | commands.rs:18-26 | `tipo: String` | `Result<Vec<CatalogoItemDto>, AppError>` | `CatalogosManage` | — | Mongo | Sí |
| `crear_catalogo` | commands.rs:28-36 | `request: CreateCatalogoRequest` (camelCase) | `Result<CatalogoItemDto, AppError>` | `CatalogosManage` | `catalogo.create` | Mongo | Sí |
| `actualizar_catalogo` | commands.rs:38-47 | `id: String, request: CreateCatalogoRequest` | `Result<CatalogoItemDto, AppError>` | `CatalogosManage` | `catalogo.update` | Mongo (rechaza items `editable=0`) | Sí |
| `eliminar_catalogo` | commands.rs:49-56 | `id: String` | `Result<EliminarCatalogoResultadoDto, AppError>` | `CatalogosManage` | `catalogo.delete` | Mongo | Sí |
| `reactivar_catalogo` | commands.rs:58-66 | `id: String` | `Result<CatalogoItemDto, AppError>` | `CatalogosManage` | `catalogo.reactivate` | Mongo | Sí |
| `listar_vocabularios_concytec` | commands.rs:72-78 | — | `Result<Vec<String>, AppError>` | `VocabulariosRead` | — | Mongo (15 esquemas SKOS) | Sí |
| `listar_vocab_items` | commands.rs:80-88 | `esquema: String, padre_codigo: Option<String>` | `Result<Vec<CatalogoItemDto>, AppError>` | `VocabulariosRead` | — | Mongo | Sí |
| `reimportar_vocabulario` | commands.rs:90-97 | `esquema: String` | `Result<(), AppError>` | `VocabulariosManage` | `vocabulario.reimport` | Mongo (re-seed embebido) | Sí |

### 2.6 Geo / Ubigeo INEI (3) — `geo/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `obtener_ubigeos` | commands.rs:13-19 | — | `Result<Vec<UbigeoDto>, AppError>` | `GeoRead` | — | Mongo (dataset INEI embebido) | Sí |
| `obtener_ubigeos_por_departamento` | commands.rs:21-28 | `departamento: String` | `Result<Vec<UbigeoDto>, AppError>` | `GeoRead` | — | Mongo | Sí |
| `buscar_ubigeos` | commands.rs:30-37 | `prefix: String` | `Result<Vec<UbigeoDto>, AppError>` | `GeoRead` | — | Mongo | Sí |

### 2.7 OrgUnits (5) — `org_units/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_org_unit` | commands.rs:10-17 | `request: CreateOrgUnitRequest` (camelCase) | `Result<OrgUnitDto, AppError>` | `OrgUnitsManage` | `org_unit.create` | Mongo | Sí |
| `actualizar_org_unit` | commands.rs:19-27 | `id: String, request: UpdateOrgUnitRequest` (camelCase) | `Result<OrgUnitDto, AppError>` | `OrgUnitsManage` | `org_unit.update` | Mongo | Sí |
| `obtener_org_unit` | commands.rs:29-36 | `id: String` | `Result<OrgUnitDto, AppError>` | `OrgUnitsView` | — | Mongo | Sí |
| `listar_org_units` | commands.rs:38-45 | `parent_id: Option<String>` | `Result<Vec<OrgUnitDto>, AppError>` | `OrgUnitsView` | — | Mongo (árbol por `parent_id`) | Sí |
| `eliminar_org_unit` | commands.rs:47-54 | `id: String` | `Result<(), AppError>` | `OrgUnitsManage` | `org_unit.delete` | Mongo (RESTRICT vs pivots) | Sí |

### 2.8 OCDE (3) — `ocde/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `asignar_campo_ocde` | commands.rs:19-33 | `request: AsignarOcdeRequest` = `{ entity_type, entity_id, ocde_codigo }` (camelCase) | `Result<EntityOcdeFieldDoc, AppError>` | `OcdeAssignManage` | `ocde.assign` | Mongo (pivot `entity_ocde_fields`, FK catálogo OCDE) | Sí |
| `quitar_campo_ocde` | commands.rs:35-49 | `request: AsignarOcdeRequest` (camelCase) | `Result<bool, AppError>` | `OcdeAssignManage` | `ocde.unassign` (si removió) | Mongo | Sí |
| `listar_campos_ocde` | commands.rs:51-59 | `entity_type: String, entity_id: String` | `Result<Vec<EntityOcdeFieldDoc>, AppError>` | `VocabulariosRead` | — | Mongo | Sí |

### 2.9 Usuarios + Auth (12) — `usuarios/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_usuario` | commands.rs:13-21 | `request: CreateUsuarioRequest` (camelCase) | `Result<UsuarioDto, AppError>` | `UsuariosManage` | `usuario.create` (write_user_audit) | Mongo (Persona reutilizada/creada) | Sí |
| `get_auth_status` | commands.rs:38-41 | — | `Result<AuthStatusDto, AppError>` | — (público) | — | Mongo | No |
| `registrar_primer_usuario` | commands.rs:43-51 | `request: BootstrapUsuarioRequest` (camelCase, incluye `mongodb_uri`/`mongodb_db` opcionales) | `Result<UsuarioDto, AppError>` | — (bootstrap, solo BD vacía) | — | Mongo (conexión temporal si `AppState.mongo` es `None`) | **Crea** sesión |
| `login_usuario` | commands.rs:53-61 | `request: LoginUsuarioRequest` (camelCase) | `Result<UsuarioDto, AppError>` | — | — | Mongo + rate limiter (5 intentos/15 min) | **Crea** sesión |
| `get_current_session` | commands.rs:63-70 | — | `Result<Option<UsuarioDto>, AppError>` | — | — | Mongo + sesión (no exige) | Lee sesión |
| `logout_usuario` | commands.rs:72-75 | — | `Result<(), AppError>` | — | — | — | **Destruye** sesión |
| `get_all_usuarios` | commands.rs:77-84 | — | `Result<Vec<UsuarioDto>, AppError>` | `UsuariosManage` | — | Mongo | Sí |
| `get_all_usuarios_paginated` | commands.rs:86-101 | `page: u32, limit: u32` | `Result<PaginatedResult<UsuarioDto>, AppError>` | `UsuariosManage` | — | Mongo | Sí |
| `actualizar_usuario` | commands.rs:103-113 | `id_usuario: String, request: UpdateUsuarioRequest` (camelCase) | `Result<UsuarioDto, AppError>` | `UsuariosManage` | `usuario.update` + `usuario.identity.update` si cambia identidad | Mongo (invariantes superuser en validations.rs) | Sí |
| `desactivar_usuario` | commands.rs:115-123 | `id_usuario: String` | `Result<UsuarioDto, AppError>` | `UsuariosManage` | `usuario.deactivate` | Mongo (rechaza superuser) | Sí |
| `reactivar_usuario` | commands.rs:125-133 | `id_usuario: String` | `Result<UsuarioDto, AppError>` | `UsuariosManage` | `usuario.reactivate` | Mongo | Sí |
| `consultar_dni_para_usuario` | commands.rs:23-36 | `numero: String` | `Result<ReniecDniLookupResult, AppError>` | `UsuariosManage` (en command) | — | **RENIEC** | Sí |

### 2.10 Personas (1) — `personas/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `consultar_persona_de_usuario` | commands.rs:6-14 | `id_usuario: String` | `Result<PersonaDeUsuarioDto, AppError>` | `UsuariosManage` | — | Mongo | Sí |

### 2.11 Seguridad (3) — `seguridad/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `get_security_status` | commands.rs:8-48 | — | `Result<SecurityStatus, AppError>` | — (público) | — | Solo estado de `AppState` (sin IO) | No |
| `get_setup_guide` | commands.rs:50-83 | — | `Result<ConfigurationGuide, AppError>` | — (público) | — | Ninguno (estático) | No |
| `get_security_recommendations` | commands.rs:85-121 | — | `Result<SecurityRecommendations, AppError>` | — (público) | — | Ninguno (estático) | No |

### 2.12 Wizard de configuración (9) — `seguridad/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `wizard_has_config` | commands.rs:123-135 | — | `Result<bool, AppError>` (cuenta `usuarios` > 0) | — (público) | — | Mongo | No |
| `wizard_test_mongodb` | commands.rs:137-142 | `uri: String` | `Result<ConnectivityResult, AppError>` | — | — | **Mongo** (`ping:1`) | No |
| `wizard_test_reniec` | commands.rs:144-149 | `token: String` | `Result<ConnectivityResult, AppError>` | — | — | **RENIEC** (DNI de test `00000000`) | No |
| `wizard_test_renacyt` | commands.rs:151-156 | `base_url: String` | `Result<ConnectivityResult, AppError>` | — | — | **RENACYT** (CTI Vitae público) | No |
| `wizard_test_pure` | commands.rs:158-164 | `base_url: String, api_key: String` | `Result<ConnectivityResult, AppError>` | — | — | **Pure** (`GET /persons?size=1`) | No |
| `wizard_test_perucris` | commands.rs:166-194 | `base_url: String, api_key: Option<String>, ruc: Option<String>` | `Result<ConnectivityResult, AppError>` | — | — | **PeruCRIS** (`GET {base}/cerif/status`) | No |
| `wizard_save_config` | commands.rs:196-203 | `request: WizardConfigRequest` (camelCase) | `Result<(), AppError>` | — | — | Escribe `pjvpin.config.json` (plaintext) + valida master password | No |
| `wizard_validate_master_password` | commands.rs:205-208 | `password: String` | `Result<(), AppError>` | — | — | Validación local (Argon2) | No |
| `wizard_consultar_dni` | commands.rs:210-250 | `token: String, numero: String` | `Result<ReniecDniLookupResult, AppError>` | — (token del paso 2 del wizard) | — | **RENIEC** (TokenResolver efímero desde `token`) | No |

### 2.13 Pure / Sincronización (3) — `shared/external/pure_cmd.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `sincronizar_publicaciones_pure` | pure_cmd.rs:11-19 | `investigador_id: String` | `Result<SyncPublicacionesResult, AppError>` | `InvestigadoresManage` (vía `access_control`) | — | **Pure** → escribe `publicaciones_cientificas` + pivot `publicacion_autores` | Sí |
| `get_publicaciones_investigador` | pure_cmd.rs:21-32 | `investigador_id: String` | `Result<Vec<PublicacionCientificaDto>, AppError>` | `InvestigadoresView` (vía `access_control`) | — | Mongo (lee por pivot) | Sí |
| `sincronizar_pure_person_ids` | pure_cmd.rs:47-60 | — | `Result<SyncPurePersonIdsResultDto, AppError>` (`total_pure/matched/assigned/unmatched_dnis`, camelCase) | `InvestigadoresManage` (vía `access_control`) | — | **Pure** (`GET /persons` paginado, idempotente) | Sí |

### 2.14 PeruCRIS / Conector CERIF (5) — `shared/external/perucris_cmd.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `enviar_a_perucris` | perucris_cmd.rs:15-39 | — | `Result<PeruCrisPushResult, AppError>` | `ReportesExport` | `perucris.push` | **PeruCRIS** (POST `{base}/cerif/ingest`) + Mongo (build CERIF) | Sí |
| `validar_sincronizacion_perucris` | perucris_cmd.rs:46-69 | `scope: Option<String>` | `Result<PeruCrisValidationReport, AppError>` | `ReportesView` | `perucris.validate` | **PeruCRIS** (API pública, HAL root) | Sí |
| `validar_org_unit_perucris` | perucris_cmd.rs:72-81 | `id_org_unit: String` | `Result<PeruCrisValidationItem, AppError>` | `ReportesView` | — | **PeruCRIS** | Sí |
| `validar_publicacion_perucris` | perucris_cmd.rs:84-93 | `id_publicacion: String` | `Result<PeruCrisValidationItem, AppError>` | `ReportesView` | — | **PeruCRIS** | Sí |
| `importar_iniciales_perucris` | perucris_cmd.rs:103-132 | — | `Result<PeruCrisImportResult, AppError>` | `ReportesExport` | `perucris.import` | **PeruCRIS** (API pública) → importa proyectos + publicaciones UNF | Sí |

### 2.15 Grupos de investigación (5) — `grupos/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `get_all_grupos` | commands.rs:9-16 | — | `Result<Vec<GrupoInvestigacionDto>, AppError>` | `GruposView` | — | Mongo | Sí |
| `create_grupo` | commands.rs:18-26 | `request: CreateGrupoInvestigacionRequest` (camelCase) | `Result<GrupoInvestigacionDto, AppError>` | `GruposManage` | `grupo.create` | Mongo | Sí |
| `get_grupo` | commands.rs:28-36 | `id_grupo: String` | `Result<GrupoInvestigacionDto, AppError>` | `GruposView` | — | Mongo | Sí |
| `update_grupo` | commands.rs:38-47 | `id_grupo: String, request: UpdateGrupoInvestigacionRequest` (camelCase) | `Result<GrupoInvestigacionDto, AppError>` | `GruposManage` | `grupo.update` | Mongo | Sí |
| `delete_grupo` | commands.rs:49-56 | `id_grupo: String` | `Result<(), AppError>` | `GruposManage` | `grupo.delete` | Mongo | Sí |

### 2.16 Recursos (21) — `recursos/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_patente` | commands.rs:12-20 | `request: CreatePatenteRequest` (camelCase) | `Result<PatenteDto, AppError>` | `RecursosManage` o `responsable_proyecto` del proyecto | `patente.create` | Mongo | Sí |
| `get_patentes_proyecto` | commands.rs:21-29 | `proyecto_id: String` | `Result<Vec<PatenteDto>, AppError>` | `ProyectosView` | — | Mongo | Sí |
| `actualizar_patente` | commands.rs:30-39 | `id_patente: String, request: UpdatePatenteRequest` (camelCase) | `Result<PatenteDto, AppError>` | `RecursosManage` o responsable | `patente.update` | Mongo | Sí |
| `eliminar_patente` | commands.rs:40-47 | `id_patente: String` | `Result<(), AppError>` | `RecursosManage` | `patente.delete` | Mongo (cascade pivots inventores/titulares + OCDE) | Sí |
| `reactivar_patente` | commands.rs:48-56 | `id_patente: String` | `Result<PatenteDto, AppError>` | `RecursosManage` | `patente.reactivate` | Mongo | Sí |
| `crear_equipamiento` | commands.rs:58-66 | `request: CreateEquipamientoRequest` (camelCase) | `Result<EquipamientoDto, AppError>` | `RecursosManage` o responsable (sin proyecto, check delegado a pivot) | `equipamiento.create` | Mongo | Sí |
| `get_equipamientos_proyecto` | commands.rs:67-75 | `proyecto_id: String` | `Result<Vec<EquipamientoDto>, AppError>` | `ProyectosView` | — | Mongo | Sí |
| `actualizar_equipamiento` | commands.rs:76-86 | `id_equipamiento: String, request: UpdateEquipamientoRequest` (camelCase) | `Result<EquipamientoDto, AppError>` | `RecursosManage` o responsable | `equipamiento.update` | Mongo | Sí |
| `eliminar_equipamiento` | commands.rs:87-94 | `id_equipamiento: String` | `Result<(), AppError>` | `RecursosManage` | `equipamiento.delete` | Mongo | Sí |
| `reactivar_equipamiento` | commands.rs:95-103 | `id_equipamiento: String` | `Result<EquipamientoDto, AppError>` | `RecursosManage` | `equipamiento.reactivate` | Mongo | Sí |
| `crear_financiamiento` | commands.rs:105-113 | `request: CreateFinanciamientoRequest` (camelCase) | `Result<FinanciamientoDto, AppError>` | `RecursosManage` o responsable | `financiamiento.create` | Mongo | Sí |
| `get_financiamientos_proyecto` | commands.rs:114-123 | `proyecto_id: String` | `Result<Vec<FinanciamientoDto>, AppError>` | `ProyectosView` | — | Mongo | Sí |
| `actualizar_financiamiento` | commands.rs:124-135 | `id_financiamiento: String, request: UpdateFinanciamientoRequest` (camelCase) | `Result<FinanciamientoDto, AppError>` | `RecursosManage` o responsable | `financiamiento.update` | Mongo | Sí |
| `eliminar_financiamiento` | commands.rs:136-143 | `id_financiamiento: String` | `Result<(), AppError>` | `RecursosManage` | `financiamiento.delete` | Mongo | Sí |
| `reactivar_financiamiento` | commands.rs:144-153 | `id_financiamiento: String` | `Result<FinanciamientoDto, AppError>` | `RecursosManage` | `financiamiento.reactivate` | Mongo | Sí |
| `vincular_inventor_patente` | commands.rs:175-189 | `request: VincularInventorPatenteRequest` = `{ id_patente, id_persona, orden }` (camelCase) | `Result<(), AppError>` | `RecursosManage` | `patente.vincular_inventor` | Mongo (pivot `patente_inventores`, FK checks) | Sí |
| `desvincular_inventor_patente` | commands.rs:191-198 | `id_pivot: String` | `Result<(), AppError>` | `RecursosManage` | `patente.desvincular_inventor` | Mongo | Sí |
| `listar_inventores_patente` | commands.rs:200-213 | `id_patente: String` | `Result<Vec<PatenteInventorDoc>, AppError>` | `RecursosManage` | — | Mongo | Sí |
| `vincular_titular_patente` | commands.rs:215-231 | `request: VincularTitularPatenteRequest` = `{ id_patente, holder_type, id_org_unit?, id_persona?, orden }` (camelCase) | `Result<(), AppError>` | `RecursosManage` | `patente.vincular_titular` | Mongo (pivot `patente_titulares`, FK checks) | Sí |
| `desvincular_titular_patente` | commands.rs:233-240 | `id_pivot: String` | `Result<(), AppError>` | `RecursosManage` | `patente.desvincular_titular` | Mongo | Sí |
| `listar_titulares_patente` | commands.rs:242-255 | `id_patente: String` | `Result<Vec<PatenteTitularDoc>, AppError>` | `RecursosManage` | — | Mongo | Sí |

### 2.17 Publicaciones Científicas (12) — `publicaciones/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_publicacion` | commands.rs:10-18 | `request: CreatePublicacionRequest` (camelCase) | `Result<PublicacionCientificaDto, AppError>` | `PublicacionesManage` | — | Mongo | Sí |
| `get_all_publicaciones` | commands.rs:20-27 | — | `Result<Vec<PublicacionCientificaDto>, AppError>` | `PublicacionesView` | — | Mongo | Sí |
| `get_publicacion_by_id` | commands.rs:29-37 | `id: String` | `Result<PublicacionCientificaDto, AppError>` | `PublicacionesView` | — | Mongo | Sí |
| `get_publicaciones_by_investigador` | commands.rs:39-49 | `id_investigador: String` | `Result<Vec<PublicacionCientificaDto>, AppError>` | `PublicacionesView` | — | Mongo (por pivot) | Sí |
| `get_publicaciones_by_anio` | commands.rs:51-59 | `anio: i32` | `Result<Vec<PublicacionCientificaDto>, AppError>` | `PublicacionesView` | — | Mongo | Sí |
| `get_software_by_proyecto` | commands.rs:61-69 | `id_proyecto: String` | `Result<Vec<PublicacionCientificaDto>, AppError>` | `ProyectosView` | — | Mongo (`tipo="software"`, D5a) | Sí |
| `actualizar_publicacion` | commands.rs:71-80 | `id: String, request: UpdatePublicacionRequest` (camelCase) | `Result<PublicacionCientificaDto, AppError>` | `PublicacionesManage` | — | Mongo | Sí |
| `eliminar_publicacion` | commands.rs:82-89 | `id: String` | `Result<(), AppError>` | `PublicacionesManage` | — | Mongo (cascade pivot autores) | Sí |
| `reactivar_publicacion` | commands.rs:91-99 | `id: String` | `Result<PublicacionCientificaDto, AppError>` | `PublicacionesManage` | — | Mongo | Sí |
| `vincular_autor_publicacion` | commands.rs:113-129 | `request: VincularAutorPublicacionRequest` = `{ id_publicacion, id_persona, id_org_unit_afiliacion?, orden, es_autor_correspondiente }` (camelCase) | `Result<(), AppError>` | `PublicacionesManage` | `publicacion.vincular_autor` | Mongo (pivot `publicacion_autores`, FK checks) | Sí |
| `desvincular_autor_publicacion` | commands.rs:131-138 | `id_pivot: String` | `Result<(), AppError>` | `PublicacionesManage` | `publicacion.desvincular_autor` | Mongo | Sí |
| `listar_autores_publicacion` | commands.rs:140-153 | `id_publicacion: String` | `Result<Vec<PublicacionAutorDoc>, AppError>` | `PublicacionesView` | — | Mongo | Sí |

### 2.18 Eventos Académicos (7) — `eventos/commands.rs`

| Comando | Archivo:líneas | Params clave | Retorno | RBAC | Audit | Externos | Sesión |
|---|---|---|---|---|---|---|---|
| `crear_evento` | commands.rs:8-16 | `request: CreateEventoRequest` (camelCase) | `Result<EventoAcademicoDto, AppError>` | `InvestigadoresManage` | — | Mongo | Sí |
| `get_all_eventos` | commands.rs:18-25 | — | `Result<Vec<EventoAcademicoDto>, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `get_evento_by_id` | commands.rs:27-35 | `id: String` | `Result<EventoAcademicoDto, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `get_eventos_by_investigador` | commands.rs:37-46 | `id_investigador: String` | `Result<Vec<EventoAcademicoDto>, AppError>` | `InvestigadoresView` | — | Mongo | Sí |
| `actualizar_evento` | commands.rs:48-57 | `id: String, request: UpdateEventoRequest` (camelCase) | `Result<EventoAcademicoDto, AppError>` | `InvestigadoresManage` | — | Mongo | Sí |
| `eliminar_evento` | commands.rs:59-66 | `id: String` | `Result<(), AppError>` | `InvestigadoresManage` | — | Mongo | Sí |
| `reactivar_evento` | commands.rs:68-76 | `id: String` | `Result<EventoAcademicoDto, AppError>` | `InvestigadoresManage` | — | Mongo | Sí |

## 3. Patrones transversales

### 3.1 Sesión (`shared/state.rs` + `shared/rbac.rs`)
- **Sesión por ventana**: `SessionStore` guarda `window_label → token` y `token → SessionEntry { user_id, last_activity_at, created_at }` en memoria (`RwLock<HashMap>`). Timeout de inactividad 30 min; expiración absoluta 8×30 min (4 h); cleanup de expiradas en cada `validate_and_get_user_id` y en `login_usuario`.
- **Validación de sesión**: `rbac::get_session_actor_user` → `state.validate_session(window_label)` → carga `Usuario` por id → verifica `activo==1` (si no, limpia sesión) → `touch_current_session`. Si el usuario ya no existe, limpia sesión y devuelve error "La sesion actual ya no es valida".
- **Comandos sin sesión** (15): los 9 `wizard_*` (pre-auth), `get_auth_status`, `get_security_status`, `get_setup_guide`, `get_security_recommendations`. `login_usuario`/`registrar_primer_usuario` **crean** sesión; `logout_usuario` la destruye; `get_current_session` la lee sin exigirla.
- **Rate limiting**: `LoginRateLimiter` en `AppState` — 5 intentos fallidos por username en ventana de 15 min; se limpia en login exitoso.

### 3.2 RBAC (`shared/rbac.rs`)
- **23 permisos** en `AppPermission`: DashboardView, InvestigadoresView/Manage, ProyectosView/Manage, PublicacionesView/Manage, ReportesView/Export, GradosRead/Manage, GruposView/Manage, RecursosManage, CatalogosRead/Manage, UsuariosManage, GeoRead, OrgUnitsView/Manage, VocabulariosRead/Manage, OcdeAssignManage.
- **Matriz de roles**: `role_has_permission` — `superuser` (todo), `admin` (23), `operador` (19, sin UsuariosManage ni CatalogosManage), `consulta` y `responsable_proyecto` (9 permisos de solo lectura).
- **Aplicación**: `require_permission(state, window_label, permiso)` devuelve el `Usuario` actor (usado para audit). Solo 8 comandos hacen el check inline; el resto delega al handler homónimo.
- **Excepción de dominio**: `recursos` usa `require_recursos_manage_or_responsable` — permite a `responsable_proyecto` operar recursos (RecursosManage NO está en su matriz) validando que sea responsable del proyecto. Único permiso con lógica de ownership.
- **Filtrado por rol**: `get_all_proyectos_detalle`/`get_all_proyectos_paginated` reducen el resultado a `investigador_id` del actor si el rol es `responsable_proyecto`.
- **Convención naming**: `View`/`Read` para lectura, `Manage`/`Export`/`Assign` para escritura. `GradosRead`/`CatalogosRead` rompen la convención View (legacy).

### 3.3 AppState (`shared/state.rs`)
- Contiene: `mongo: Option<Database>`, `reniec`, `renacyt`, `pure_config`, `perucris_config`, `tokens: TokenResolver`, `sessions: SessionStore`, `rate_limiter`, `reniec_cache` (TTL 1 h). Construido en `lib.rs` desde `RuntimeConfig`.
- `mongo_db()` es infalible en runtime salvo configuración ausente → `AppError::ConfigurationError`.
- `TokenResolver` construido una sola vez desde `RuntimeConfig`; el wizard lo reconstruye efímeramente para `wizard_consultar_dni`.

### 3.4 Errores (`shared/error.rs`)
- Todo retorno es `Result<T, AppError>`; variantes: `ValidationError`, `NotFound`, `DatabaseError`, `UniqueConstraintViolation`, `InternalError`, `ConfigurationError`, `ExternalServiceError`, `DataInconsistency`, `ReferentialIntegrity`.
- `From<mongodb::error::Error>` detecta `E11000` → `UniqueConstraintViolation` con mensaje user-friendly según campo.
- Mensajes canónicos para credenciales externas en `TokenResolver`.

### 3.5 Auditoría (`shared/audit.rs`)
- `write_generic_audit(actor, accion, entidad, entidad_id, detalle)` y `write_user_audit` (usuarios, con snapshot). ~65 call-sites.
- **Cobertura por feature**: completa en grados, catálogos, grupos, org_units, OCDE, recursos, proyectos, reportes (export/pure.diff), usuarios; **ausente** en publicaciones CRUD (solo pivote autores audita), eventos (ninguna), geo (solo lectura) y lecturas en general.

### 3.6 Servicios externos por dominio
- **RENIEC**: `consultar_dni_reniec`, `consultar_dni_para_usuario`, `wizard_consultar_dni`, `wizard_test_reniec`, `importar_investigadores` (paso 1, obligatorio con circuit breaker).
- **RENACYT**: `consultar_renacyt_investigador`, `buscar_investigador_por_dni_con_renacyt`, `refrescar_formacion_academica_renacyt_investigador`, `descargar_constancia_renacyt_investigador`, `refrescar_renacyt_todos`, `wizard_test_renacyt`, `importar_investigadores` (paso 4).
- **Pure**: `sincronizar_publicaciones_pure`, `sincronizar_pure_person_ids`, `verificar_diferencias_pure`, `wizard_test_pure`, `importar_investigadores` (paso 3).
- **PeruCRIS**: `enviar_a_perucris`, `validar_sincronizacion_perucris`, `validar_org_unit_perucris`, `validar_publicacion_perucris`, `importar_iniciales_perucris`, `wizard_test_perucris`, `importar_investigadores` (paso 2, `perucris_uuid`).
- **Solo Mongo**: ~130 comandos restantes.

### 3.7 Convención serde / DTOs
- Requests multi-palabra con `#[serde(rename_all = "camelCase")]` (31 structs identificados).
- Salidas IPC mayormente snake_case (mirror DTO), con excepciones camelCase (`ImportInvestigadoresResult`, `SyncPurePersonIdsResultDto`).
