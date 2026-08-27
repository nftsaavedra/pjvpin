# Mapa de Endpoints REST — API NestJS (`apps/api`)

> Artefacto maestro de construcción. Traduce los 155 comandos IPC del censo ([01-endpoints-ipc.md](./01-endpoints-ipc.md)) a endpoints REST idiomáticos NestJS. Fuente única de verdad para controllers, guards y el adapter del desktop.
> Los **shapes de request/response NO cambian** en esta fase (respuestas snake_case, requests camelCase — ver README §Contratos). Solo cambia el transporte.

## 1. Convención de diseño

| Regla | Decisión |
|---|---|
| Prefijo global | `app.setGlobalPrefix('api/v1')` → todos los endpoints bajo `/api/v1/...` |
| Naming | Recursos plurales kebab-case: `/usuarios`, `/org-units`, `/sync/reportes` |
| Métodos | GET lectura, POST creación/acción, PATCH actualización parcial, DELETE borrado |
| Acciones de estado | Sub-recurso PATCH: `/usuarios/:id/desactivar`, `/:id/reactivar` |
| Paginación | Query params `?page=1&limit=20` → mismo shape `PaginatedResult<T>` (items/total/page/limit/total_pages) |
| Errores | Exception filter global → mismo shape `AppError` del IPC (claves `DatabaseError`/`UniqueConstraintViolation`/`NotFound`/`ValidationError`/`ConfigurationError`/`ExternalServiceError`/`ReferentialIntegrity`) con HTTP status asociado (400/401/403/404/409/500/502) |
| Auth | `Authorization: Bearer {accessToken}` (JWT); refresh vía `POST /auth/refresh` |
| Binarios | `Content-Disposition: attachment` (PDF constancia, CERIF JSON) |
| Endpoints asíncronos largos | `202 Accepted` + jobId; estado vía `GET /sync/reportes` o endpoint de job |

### Leyenda de estado por comando

- `→` MAPEADO: mismo contrato, nuevo transporte.
- `+` NUEVO: endpoint sin equivalente IPC (introducido por la arquitectura API).
- `≠` TRANSFORMADO: contrato o semántica adaptada (documentado).
- `✗` ELIMINADO: desaparece en el API (sustituido o sin sentido cliente-servidor).

## 2. Health + Seguridad base

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| — | `+ GET /health` | público | `{ ok, bootstrapRequired, version }`. Reemplaza `wizard_has_config` (bootstrapRequired = usuarios vacía) |
| `get_security_status` | `→ GET /security/status` | público | Estado de config del servidor SIN exponer secretos |
| `get_setup_guide` | `✗` — | — | Guía estática legacy del setup embebido; eliminada |
| `get_security_recommendations` | `✗` — | — | Ídem |

## 3. Auth (nuevo — reemplaza login/sesión IPC)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `login_usuario` | `→ POST /auth/login` | público (rate-limit 5/15min) | Body `{ username, password }` → `≠ { user: UsuarioDto, accessToken, refreshToken }` (añade tokens JWT) |
| — | `+ POST /auth/refresh` | público (con refresh token) | Body `{ refreshToken }` → `{ accessToken, refreshToken }` (rotación) |
| `logout_usuario` | `→ POST /auth/logout` | Bearer | Invalida refresh token del cliente (JWT access expira solo) |
| `get_current_session` | `→ GET /auth/session` | Bearer (opcional) | `UsuarioDto \| null`, mismo shape |
| `registrar_primer_usuario` | `≠ POST /auth/bootstrap` | público condicionado | SOLO si colección `usuarios` vacía. Body = `BootstrapUsuarioRequest` SIN `mongodb_uri/mongodb_db` (eso ya no se configura desde el cliente). Invariantes superuser intactas |
| `wizard_consultar_dni` | `≠ POST /auth/bootstrap/reniec-dni` | público condicionado | Solo activo mientras `usuarios` vacía; usa el token RENIEC del servidor. Body `{ numero }` → `ReniecDniLookupResult` |
| `get_auth_status` | `→ GET /auth/status` | público | `{ has_users, requires_setup }` |

**Wizard desktop (nuevo flujo)**: paso 1 `GET /health` → si `bootstrapRequired`, paso 2 `POST /auth/bootstrap` (con ayuda de `POST /auth/bootstrap/reniec-dni`); si no, login normal. Los 8 `wizard_test_*` y `wizard_save_config`/`wizard_validate_master_password` → `✗ ELIMINADOS` (la conectividad de Mongo/RENIEC/Pure/PeruCRIS se valida en el servidor, no desde el cliente).

## 4. Usuarios + Personas (13 IPC → 12 REST)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_usuario` | `→ POST /usuarios` | UsuariosManage | audit `usuario.create`; Persona reutilizada/creada |
| `get_all_usuarios` | `→ GET /usuarios` | UsuariosManage | |
| `get_all_usuarios_paginated` | `→ GET /usuarios?page=&limit=` | UsuariosManage | `PaginatedResult<UsuarioDto>` |
| `actualizar_usuario` | `→ PATCH /usuarios/:id` | UsuariosManage | audit `usuario.update` (+identity); invariantes superuser |
| `desactivar_usuario` | `→ PATCH /usuarios/:id/desactivar` | UsuariosManage | audit; rechaza superuser |
| `reactivar_usuario` | `→ PATCH /usuarios/:id/reactivar` | UsuariosManage | audit |
| `consultar_dni_para_usuario` | `→ POST /usuarios/reniec-dni` | UsuariosManage | Body `{ numero }`; conector RENIEC servidor |
| `consultar_persona_de_usuario` | `→ GET /usuarios/:id/persona` | UsuariosManage | `PersonaDeUsuarioDto` |

## 5. Investigadores (18) + conectores RENIEC/RENACYT

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_investigador` | `→ POST /investigadores` | InvestigadoresManage | audit |
| `get_all_investigadores` | `→ GET /investigadores` | InvestigadoresView | |
| `get_all_investigadores_paginated` | `→ GET /investigadores?page=&limit=` | InvestigadoresView | |
| `buscar_investigador_por_dni` | `→ GET /investigadores/dni/:dni` | InvestigadoresManage | `InvestigadorDto \| null` |
| `get_all_investigadores_con_proyectos` | `→ GET /investigadores/detalle` | InvestigadoresView | `InvestigadorDetalleDto[]` |
| `actualizar_investigador` | `→ PATCH /investigadores/:id` | InvestigadoresManage | audit |
| `eliminar_investigador` | `→ DELETE /investigadores/:id` | InvestigadoresManage | audit; soft delete |
| `reactivar_investigador` | `→ PATCH /investigadores/:id/reactivar` | InvestigadoresManage | audit |
| `consultar_dni_reniec` | `→ GET /external/reniec/dni/:numero` | InvestigadoresManage | Conector; cache TTL 1h en API |
| `consultar_renacyt_investigador` | `→ GET /external/renacyt/investigador/:codigoOId` | InvestigadoresManage | |
| `buscar_investigador_por_dni_con_renacyt` | `→ GET /investigadores/dni/:dni/renacyt` | InvestigadoresView (fallback Manage) | |
| `refrescar_formacion_academica_renacyt_investigador` | `→ POST /investigadores/:id/renacyt/formacion/refrescar` | InvestigadoresManage | audit `renacyt.refresh.*`; kardex |
| `descargar_constancia_renacyt_investigador` | `→ GET /investigadores/:id/renacyt/constancia` | InvestigadoresView | PDF bytes `Content-Disposition`; audit |
| `importar_investigadores` | `→ POST /investigadores/import` | InvestigadoresManage | Body `{ dnis }` máx 200; pipeline RENIEC→PeruCRIS→Pure→RENACYT; audit `investigador.import`. `≠ Async`: `202` + jobId si lote > umbral |
| `get_plantilla_investigadores_default` | `→ GET /investigadores/import/plantilla` | InvestigadoresView | `string[]` (55 DNIs) |
| `get_kardex_investigador` | `→ GET /investigadores/:id/kardex` | InvestigadoresView | `KardexEntry[]` |
| `marcar_cambios_renacyt_revisados` | `→ PATCH /investigadores/:id/renacyt/cambios-revisados` | InvestigadoresView | |
| `refrescar_renacyt_todos` | `→ POST /investigadores/renacyt/refrescar-todos` | InvestigadoresManage | `≠ Async 202` + jobId; audit `renacyt.refresh.batch` |

## 6. Proyectos (15) + pivots

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_proyecto_con_participantes` | `→ POST /proyectos` | ProyectosManage | audit |
| `actualizar_proyecto_con_participantes` | `→ PATCH /proyectos/:id` | ProyectosManage | audit |
| `buscar_proyectos_por_investigador` | `→ GET /investigadores/:id/proyectos` | ProyectosView | |
| `get_all_proyectos_detalle` | `→ GET /proyectos/detalle` | ProyectosView | Filtra por actor si rol=responsable_proyecto |
| `get_all_proyectos_paginated` | `→ GET /proyectos?page=&limit=` | ProyectosView | Ídem filtrado por rol |
| `eliminar_relacion_proyecto_investigador` | `→ DELETE /proyectos/:id/participaciones/:investigadorId` | ProyectosManage | audit |
| `eliminar_relaciones_proyecto` | `→ DELETE /proyectos/:id/participaciones` | ProyectosManage | audit |
| `eliminar_proyecto` | `→ DELETE /proyectos/:id` | ProyectosManage | audit; transaccional + cascada |
| `reactivar_proyecto` | `→ PATCH /proyectos/:id/reactivar` | ProyectosManage | audit |
| `vincular_org_proyecto` | `→ POST /proyectos/:id/organizaciones` | ProyectosManage | Body `{ idOrgUnit, rol }`; FK checks; audit |
| `desvincular_org_proyecto` | `→ DELETE /proyectos/:id/organizaciones/:pivotId` | ProyectosManage | audit |
| `listar_orgs_proyecto` | `→ GET /proyectos/:id/organizaciones` | ProyectosView | |
| `vincular_financiamiento_proyecto` | `→ POST /proyectos/:id/financiamientos` | ProyectosManage | Body `{ idFinanciamiento, montoAsignado?, moneda? }`; audit |
| `desvincular_financiamiento_proyecto` | `→ DELETE /proyectos/:id/financiamientos/:pivotId` | ProyectosManage | audit |
| `listar_financiamientos_proyecto` | `→ GET /proyectos/:id/financiamientos` | ProyectosView | |

## 7. Recursos (21): patentes/equipamientos/financiamientos + pivots

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_patente` | `→ POST /patentes` | RecursosManage o responsable | audit |
| `get_patentes_proyecto` | `→ GET /proyectos/:id/patentes` | ProyectosView | |
| `actualizar_patente` | `→ PATCH /patentes/:id` | RecursosManage o responsable | audit |
| `eliminar_patente` | `→ DELETE /patentes/:id` | RecursosManage | audit; cascade pivots + OCDE |
| `reactivar_patente` | `→ PATCH /patentes/:id/reactivar` | RecursosManage | audit |
| `crear_equipamiento` | `→ POST /equipamientos` | RecursosManage o responsable | audit |
| `get_equipamientos_proyecto` | `→ GET /proyectos/:id/equipamientos` | ProyectosView | |
| `actualizar_equipamiento` | `→ PATCH /equipamientos/:id` | RecursosManage o responsable | audit |
| `eliminar_equipamiento` | `→ DELETE /equipamientos/:id` | RecursosManage | audit |
| `reactivar_equipamiento` | `→ PATCH /equipamientos/:id/reactivar` | RecursosManage | audit |
| `crear_financiamiento` | `→ POST /financiamientos` | RecursosManage o responsable | audit |
| `get_financiamientos_proyecto` | `→ GET /proyectos/:id/financiamientos-recursos` | ProyectosView | NOTA: no colisiona con pivot §6 |
| `actualizar_financiamiento` | `→ PATCH /financiamientos/:id` | RecursosManage o responsable | audit |
| `eliminar_financiamiento` | `→ DELETE /financiamientos/:id` | RecursosManage | audit |
| `reactivar_financiamiento` | `→ PATCH /financiamientos/:id/reactivar` | RecursosManage | audit |
| `vincular_inventor_patente` | `→ POST /patentes/:id/inventores` | RecursosManage | Body `{ idPersona, orden }`; FK; audit |
| `desvincular_inventor_patente` | `→ DELETE /patentes/:id/inventores/:pivotId` | RecursosManage | audit |
| `listar_inventores_patente` | `→ GET /patentes/:id/inventores` | RecursosManage | |
| `vincular_titular_patente` | `→ POST /patentes/:id/titulares` | RecursosManage | Body `{ holderType, idOrgUnit?, idPersona?, orden }`; FK; audit |
| `desvincular_titular_patente` | `→ DELETE /patentes/:id/titulares/:pivotId` | RecursosManage | audit |
| `listar_titulares_patente` | `→ GET /patentes/:id/titulares` | RecursosManage | |

## 8. Publicaciones (12) + pivot autores

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_publicacion` | `→ POST /publicaciones` | PublicacionesManage | Reutilizado por software (recursos) |
| `get_all_publicaciones` | `→ GET /publicaciones` | PublicacionesView | |
| `get_publicacion_by_id` | `→ GET /publicaciones/:id` | PublicacionesView | |
| `get_publicaciones_by_investigador` | `→ GET /investigadores/:id/publicaciones` | PublicacionesView | Por pivot |
| `get_publicaciones_by_anio` | `→ GET /publicaciones?anio=` | PublicacionesView | |
| `get_software_by_proyecto` | `→ GET /proyectos/:id/software` | ProyectosView | `tipo="software"` (D5a) |
| `actualizar_publicacion` | `→ PATCH /publicaciones/:id` | PublicacionesManage | |
| `eliminar_publicacion` | `→ DELETE /publicaciones/:id` | PublicacionesManage | Cascade pivot autores |
| `reactivar_publicacion` | `→ PATCH /publicaciones/:id/reactivar` | PublicacionesManage | |
| `vincular_autor_publicacion` | `→ POST /publicaciones/:id/autores` | PublicacionesManage | Body `{ idPersona, idOrgUnitAfiliacion?, orden, esAutorCorrespondiente }`; FK; audit |
| `desvincular_autor_publicacion` | `→ DELETE /publicaciones/:id/autores/:pivotId` | PublicacionesManage | audit |
| `listar_autores_publicacion` | `→ GET /publicaciones/:id/autores` | PublicacionesView | |

## 9. Eventos (7) + Grupos (5) + Grados (6)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `crear_evento` | `→ POST /eventos` | InvestigadoresManage | |
| `get_all_eventos` | `→ GET /eventos` | InvestigadoresView | |
| `get_evento_by_id` | `→ GET /eventos/:id` | InvestigadoresView | |
| `get_eventos_by_investigador` | `→ GET /investigadores/:id/eventos` | InvestigadoresView | |
| `actualizar_evento` | `→ PATCH /eventos/:id` | InvestigadoresManage | |
| `eliminar_evento` | `→ DELETE /eventos/:id` | InvestigadoresManage | |
| `reactivar_evento` | `→ PATCH /eventos/:id/reactivar` | InvestigadoresManage | |
| `get_all_grupos` | `→ GET /grupos` | GruposView | |
| `get_grupo` | `→ GET /grupos/:id` | GruposView | |
| `create_grupo` | `→ POST /grupos` | GruposManage | audit |
| `update_grupo` | `→ PATCH /grupos/:id` | GruposManage | audit |
| `delete_grupo` | `→ DELETE /grupos/:id` | GruposManage | audit |
| `get_all_grados` | `→ GET /grados` | GradosRead | |
| `get_all_grados_paginated` | `→ GET /grados?page=&limit=` | GradosRead | |
| `crear_grado` | `→ POST /grados` | GradosManage | audit |
| `actualizar_grado` | `→ PATCH /grados/:id` | GradosManage | audit |
| `eliminar_grado` | `→ DELETE /grados/:id` | GradosManage | audit; guard referencias |
| `reactivar_grado` | `→ PATCH /grados/:id/reactivar` | GradosManage | audit |

## 10. Catálogos + Vocabularios (9) + OCDE (3)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `get_catalogos` | `→ GET /catalogos?tipo=` | CatalogosRead | |
| `get_all_catalogos_admin` | `→ GET /catalogos/admin?tipo=` | CatalogosManage | |
| `crear_catalogo` | `→ POST /catalogos` | CatalogosManage | audit |
| `actualizar_catalogo` | `→ PATCH /catalogos/:id` | CatalogosManage | audit; rechaza `editable=0` |
| `eliminar_catalogo` | `→ DELETE /catalogos/:id` | CatalogosManage | audit |
| `reactivar_catalogo` | `→ PATCH /catalogos/:id/reactivar` | CatalogosManage | audit |
| `listar_vocabularios_concytec` | `→ GET /vocabularios` | VocabulariosRead | `string[]` (15 esquemas) |
| `listar_vocab_items` | `→ GET /vocabularios/:esquema/items?padreCodigo=` | VocabulariosRead | |
| `reimportar_vocabulario` | `→ POST /vocabularios/:esquema/reimportar` | VocabulariosManage | audit |
| `asignar_campo_ocde` | `→ POST /ocde/campos` | OcdeAssignManage | Body `{ entityType, entityId, ocdeCodigo }`; FK catálogo; audit |
| `quitar_campo_ocde` | `→ DELETE /ocde/campos` (mismo body como query) | OcdeAssignManage | audit |
| `listar_campos_ocde` | `→ GET /ocde/campos?entityType=&entityId=` | VocabulariosRead | |

## 11. Geo (3) + OrgUnits (5)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `obtener_ubigeos` | `→ GET /geo/ubigeos` | GeoRead | |
| `obtener_ubigeos_por_departamento` | `→ GET /geo/ubigeos?departamento=` | GeoRead | |
| `buscar_ubigeos` | `→ GET /geo/ubigeos?prefix=` | GeoRead | |
| `crear_org_unit` | `→ POST /org-units` | OrgUnitsManage | audit |
| `actualizar_org_unit` | `→ PATCH /org-units/:id` | OrgUnitsManage | audit; jerarquía (ciclos/self) |
| `obtener_org_unit` | `→ GET /org-units/:id` | OrgUnitsView | |
| `listar_org_units` | `→ GET /org-units?parentId=` | OrgUnitsView | |
| `eliminar_org_unit` | `→ DELETE /org-units/:id` | OrgUnitsManage | audit; RESTRICT vs pivots |

## 12. Reportes + Dashboard (18)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `get_kpis_dashboard` | `→ GET /dashboard/kpis` | DashboardView | |
| `get_estadisticas_proyectos_x_investigador` | `→ GET /dashboard/estadisticas-proyectos-investigador` | DashboardView | |
| `get_proyectos_trend` | `→ GET /dashboard/proyectos-trend` | DashboardView | |
| `get_renacyt_distribucion` | `→ GET /dashboard/renacyt-distribucion` | DashboardView | |
| `get_data_exportacion_plana` | `→ GET /reportes/export/plana` | ReportesExport | |
| `get_data_exportacion_agrupada_investigador` | `→ GET /reportes/export/agrupada` | ReportesView | |
| `get_data_exportacion_grupos` | `→ GET /reportes/export/grupos` | ReportesView | |
| `get_data_exportacion_recursos` | `→ GET /reportes/export/recursos` | ReportesView | |
| `get_data_exportacion_investigadores_perfil` | `→ GET /reportes/export/investigadores-perfil` | ReportesView | |
| `get_data_exportacion_proyectos_area` | `→ GET /reportes/export/proyectos-area` | ReportesView | |
| `get_reporte_proyecto_integral` | `→ GET /reportes/integral/proyecto/:id` | ReportesExport | |
| `get_reporte_investigador_integral` | `→ GET /reportes/integral/investigador/:id` | ReportesExport | |
| `get_reportes_investigadores_integral` | `→ GET /reportes/integral/investigadores` | ReportesExport | |
| `get_data_pure_masterlist` | `→ GET /reportes/pure/masterlist?pureRemoteTotal=` | ReportesView | |
| `exportar_cerif` | `≠ GET /reportes/cerif?entidad=` | ReportesExport | `≠` Sin `file_path`: devuelve JSON bytes `Content-Disposition`; audit `reportes.export` |
| `verificar_diferencias_pure` | `→ POST /pure/verificar-diferencias` | InvestigadoresView | Body `{ investigadorId? }`; audit `pure.diff`; persiste sync_reportes |
| `list_sync_reports` | `→ GET /sync/reportes?tipo=&limit=` | InvestigadoresView | |
| `write_export_file` | `✗` — | — | La escritura local del archivo la hace el desktop (dialog + fs); el API solo provee datasets/bytes |

## 13. Pure (3) + PeruCRIS (5)

| Comando IPC | Endpoint REST | Permiso | Notas |
|---|---|---|---|
| `sincronizar_publicaciones_pure` | `→ POST /investigadores/:id/pure/sync` | InvestigadoresManage | Conector Pure; upsert + pivot autores |
| `get_publicaciones_investigador` | `→ GET /investigadores/:id/publicaciones` | InvestigadoresView | (ya en §8) |
| `sincronizar_pure_person_ids` | `→ POST /pure/person-ids/sync` | InvestigadoresManage | Idempotente |
| `enviar_a_perucris` | `→ POST /perucris/push` | ReportesExport | Build CERIF + push; audit `perucris.push` |
| `validar_sincronizacion_perucris` | `→ POST /perucris/validacion` | ReportesView | Body `{ scope? }`; audit `perucris.validate` |
| `validar_org_unit_perucris` | `→ GET /perucris/validacion/org-unit/:id` | ReportesView | |
| `validar_publicacion_perucris` | `→ GET /perucris/validacion/publicacion/:id` | ReportesView | |
| `importar_iniciales_perucris` | `→ POST /perucris/import/iniciales` | ReportesExport | `≠ Async 202` posible; audit `perucris.import` |

## 14. Cobertura

| Grupo IPC | Comandos | Estado |
|---|---|---|
| Mapeados directos | ~131 | `→` mismo contrato |
| Nuevos (arquitectura API) | 5 | `+` health, refresh ×1, bootstrap ×2, auth/status re-shape |
| Transformados documentados | ~8 | `≠` login (+tokens), bootstrap (sin URI), import/refresh-masivo (async), exportar_cerif (bytes) |
| Eliminados | ~11 | `✗` write_export_file, 8 wizard_*, security guides ×2 |

> Regla de no-regresión del Árbitro: ningún comando del censo puede quedar sin fila en este mapa. Si un endpoint cambia durante la construcción, se actualiza ESTE documento primero y el adapter del desktop después.
