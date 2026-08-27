# Censo de la Capa de API del Frontend — `src/shared/tauri/`

> **Nota de estructura (diferencia con AGENTS.md)**: la capa de API **ya no vive en `src/services/tauri/`** sino en **`src/shared/tauri/`**. Tampoco existe `src/hooks/` como barrel; los hooks viven en `src/shared/hooks/` y `src/features/*/hooks/`. Existe además una capa de barriles por feature (`src/features/<feature>/api.ts`).
> Esta capa es la que en una migración a backend HTTP (NestJS) se convertiría en cliente HTTP.

## 1. Inventario de archivos

### Wrappers de comandos (21 archivos, 1 006 líneas)

| Archivo | Líneas | Dominio |
|---|---|---|
| `auth.ts` | 35 | Sesión, login, primer usuario |
| `client.ts` | 19 | `tauriCmd` + `AppError` + re-export `invoke` |
| `configuracion.ts` | 144 | Grados, Usuarios, Persona, Catálogos |
| `dashboard.ts` | 25 | KPIs, trend, distribución RENACYT |
| `error.ts` | 37 | `getTauriErrorMessage` |
| `error.test.ts` | 32 | Tests de mapping de error |
| `eventos.ts` | 53 | Eventos académicos CRUD |
| `files.ts` | 7 | `write_export_file` (bytes a disco) |
| `geo.ts` | 16 | Ubigeos INEI |
| `grupos.ts` | 36 | Grupos de investigación CRUD |
| `investigadores.ts` | 154 | CRUD investigador + RENIEC/RENACYT/Pure + import por DNI + kardex |
| `orgUnits.ts` | 25 | Org units (estructura institucional) |
| `perucris.ts` | 53 | Push/validación/import inicial PeruCRIS |
| `proyectos.ts` | 64 | Proyectos + participantes |
| `publicaciones.ts` | 6 | Listado consolidado |
| `pure.ts` | 35 | Sync publicaciones Pure + sync reports |
| `recursos.ts` | 212 | Patentes, Software, Equipamientos, Financiamientos |
| `reportes.ts` | 34 | Exportación plana/agrupada + reportes integrales + masterlist |
| `vocabularios.ts` | 17 | Vocabularios CONCYTEC (árbol SKOS) |
| `wizard.ts` | 68 | Bootstrap: config, tests de conectividad, RENIEC |
| Barriles feature (`src/features/*/api.ts`, 8 archivos) | 194 | Re-exports por feature |

### Tipos (17 archivos, 1 012 líneas, en `types/`)

| Archivo | Líneas | Contenido |
|---|---|---|
| `types/index.ts` | 104 | Barrel de re-exports |
| `auth.types.ts` | 16 | `Usuario`, `AuthStatus` |
| `catalogo.types.ts` | 42 | `GradoAcademico`, `CatalogoItem`, `Persona` + resultados eliminar |
| `dashboard.types.ts` | 41 | KPIs, trend, distribución, export data |
| `evento.types.ts` | 87 | `PublicacionCientifica`, `GrupoInvestigacion`, `EventoAcademico`, `SyncPublicacionesResult` |
| `geo.types.ts` | 9 | `Ubigeo` |
| `investigador.types.ts` | 180 | `Investigador`, `InvestigadorDetalle`, `CambioKardex`, resultados RENACYT/RENIEC/import |
| `orgUnit.types.ts` | 86 | `OrgUnit`, `CreateOrgUnitRequest`, `UpdateOrgUnitRequest` |
| `pagination.types.ts` | 7 | `PaginatedResult<T>` |
| `perucris.types.ts` | 75 | Push/validación/import PeruCRIS |
| `proyecto.types.ts` | 126 | `Proyecto`, `ProyectoDetalle`, payloads, export shapes |
| `pureMasterList.types.ts` | 71 | Filas del Master List Pure |
| `recursos.types.ts` | 105 | `Patente`, `Equipamiento`, `Financiamiento` + variantes `ConEtiquetas` |
| `reporte.types.ts` | 156 | Reportes integrales (proyecto/investigador) |
| `syncReport.types.ts` | 35 | Reportes de sync Pure/PeruCRIS |

## 2. Mecánica de `client.ts` y `error.ts`

### `client.ts` (19 líneas)
- Exporta `class AppError extends Error` (wrapper uniforme).
- Exporta wrapper IPC: `tauriCmd<T>(cmd, args?)` → `invoke<T>(cmd, args)` de `@tauri-apps/api/core`; en `catch` lanza `new AppError(getTauriErrorMessage(error))`.
- **No hay header de sesión/token por IPC**: la sesión se resuelve en backend (SessionStore en `AppState` vinculada a window_label).

### `error.ts` (37 líneas)
`getTauriErrorMessage(error: unknown): string` — orden: `!error` → "Error desconocido"; string → el string; `.message` no vacío → message; claves de variantes Rust (`DatabaseError`, `UniqueConstraintViolation`, `NotFound`, `InternalError`, `ConfigurationError`, `ExternalServiceError`) → valor de la primera encontrada; fallback `JSON.stringify` / `String()`. Cubierto por `error.test.ts` (vitest).

## 3. Tabla maestra función → comando → request → response

### auth.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `getAuthStatus` | `get_auth_status` | — | `AuthStatus` |
| `getCurrentSession` | `get_current_session` | — | `Usuario \| null` |
| `registrarPrimerUsuario` | `registrar_primer_usuario` | `{ request: RegistrarPrimerUsuarioArgs }` | `Usuario` |
| `loginUsuario` | `login_usuario` | `{ request: { username, password } }` | `Usuario` |
| `logoutUsuario` | `logout_usuario` | — | `void` |

### investigadores.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `crearInvestigador` | `crear_investigador` | `{ request: CrearInvestigadorArgs }` | `Investigador` |
| `getAllInvestigadores` | `get_all_investigadores` | — | `Investigador[]` |
| `buscarInvestigadorPorDni` | `buscar_investigador_por_dni` | `{ dni }` | `Investigador \| null` |
| `buscarInvestigadorPorDniConRenacyt` | `buscar_investigador_por_dni_con_renacyt` | `{ dni }` | `RenacytLookupResult \| null` |
| `consultarDniReniec` | `consultar_dni_reniec` | `{ numero }` | `ReniecDniLookupResult` |
| `consultarRenacytInvestigador` | `consultar_renacyt_investigador` | `{ codigoOId }` | `RenacytLookupResult` |
| `getAllInvestigadoresConProyectos` | `get_all_investigadores_con_proyectos` | — | `InvestigadorDetalle[]` |
| `eliminarInvestigador` | `eliminar_investigador` | `{ idInvestigador }` | `EliminarInvestigadorResultado` |
| `reactivarInvestigador` | `reactivar_investigador` | `{ idInvestigador }` | `Investigador` |
| `refrescarFormacionAcademicaRenacytInvestigador` | `refrescar_formacion_academica_renacyt_investigador` | `{ idInvestigador }` | `RefreshInvestigadorRenacytFormacionResultado` |
| `actualizarInvestigador` | `actualizar_investigador` | `{ idInvestigador, request }` | `Investigador` |
| `descargarConstanciaRenacytInvestigador` | `descargar_constancia_renacyt_investigador` | `{ idInvestigador }` | `Uint8Array` (convierte `number[]`) |
| `sincronizarPurePersonIds` | `sincronizar_pure_person_ids` | — | `SyncPurePersonIdsResult` |
| `importarInvestigadores` | `importar_investigadores` | `{ request: { dnis } }` | `ImportInvestigadoresResult` |
| `getPlantillaInvestigadoresDefault` | `get_plantilla_investigadores_default` | — | `string[]` |
| `getKardexInvestigador` | `get_kardex_investigador` | `{ idInvestigador }` | `KardexEntry[]` |
| `marcarCambiosRenacytRevisados` | `marcar_cambios_renacyt_revisados` | `{ idInvestigador }` | `Investigador` |
| `refrescarRenacytTodos` | `refrescar_renacyt_todos` | — | `RefreshMasivoRenacytResultado` |

### proyectos.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `crearProyectoConParticipantes` | `crear_proyecto_con_participantes` | `{ request }` | `Proyecto` |
| `actualizarProyectoConParticipantes` | `actualizar_proyecto_con_participantes` | `{ idProyecto, request }` | `Proyecto` |
| `buscarProyectosPorInvestigador` | `buscar_proyectos_por_investigador` | `{ idInvestigador }` | `Proyecto[]` |
| `getAllProyectosDetalle` | `get_all_proyectos_detalle` | — | `ProyectoDetalle[]` |
| `eliminarRelacionProyectoInvestigador` | `eliminar_relacion_proyecto_investigador` | `{ idProyecto, idInvestigador }` | `void` |
| `eliminarRelacionesProyecto` | `eliminar_relaciones_proyecto` | `{ idProyecto }` | `void` |
| `eliminarProyecto` | `eliminar_proyecto` | `{ idProyecto }` | `EliminarProyectoResultado` |
| `reactivarProyecto` | `reactivar_proyecto` | `{ idProyecto }` | `Proyecto` |

### recursos.ts (patentes / software / equipamientos / financiamientos)

| función | comando Tauri | request | response |
|---|---|---|---|
| `crearPatente` | `crear_patente` | `{ request }` | `Patente` |
| `getPatentesProyecto` | `get_patentes_proyecto` | `{ proyectoId }` | `Patente[]` |
| `actualizarPatente` | `actualizar_patente` | `{ idPatente, request }` | `Patente` |
| `eliminarPatente` | `eliminar_patente` | `{ idPatente }` | `void` |
| `crearSoftware` | `crear_publicacion` | `{ request }` | `PublicacionCientifica` |
| `getSoftwareProyecto` | `get_software_by_proyecto` | `{ idProyecto }` | `PublicacionCientifica[]` |
| `actualizarSoftware` | `actualizar_publicacion` | `{ idPublicacion, request }` | `PublicacionCientifica` |
| `eliminarSoftware` | `eliminar_publicacion` | `{ idPublicacion }` | `void` |
| `crearEquipamiento` | `crear_equipamiento` | `{ request }` | `Equipamiento` |
| `getEquipamientosProyecto` | `get_equipamientos_proyecto` | `{ proyectoId }` | `Equipamiento[]` |
| `actualizarEquipamiento` | `actualizar_equipamiento` | `{ idEquipamiento, request }` | `Equipamiento` |
| `eliminarEquipamiento` | `eliminar_equipamiento` | `{ idEquipamiento }` | `void` |
| `crearFinanciamiento` | `crear_financiamiento` | `{ request }` | `Financiamiento` |
| `getFinanciamientosProyecto` | `get_financiamientos_proyecto` | `{ proyectoId }` | `Financiamiento[]` |
| `actualizarFinanciamiento` | `actualizar_financiamiento` | `{ idFinanciamiento, request }` | `Financiamiento` |
| `eliminarFinanciamiento` | `eliminar_financiamiento` | `{ idFinanciamiento }` | `void` |

### reportes.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `getDataExportacionPlana` | `get_data_exportacion_plana` | — | `ExportData[]` |
| `getDataExportacionAgrupada` | `get_data_exportacion_agrupada_investigador` | — | `DatosExportInvestigadorAgrupado[]` |
| `getReporteProyectoIntegral` | `get_reporte_proyecto_integral` | `{ idProyecto }` | `ReporteProyectoIntegral` |
| `getReporteInvestigadorIntegral` | `get_reporte_investigador_integral` | `{ id_investigador }` | `ReporteInvestigadorIntegral` |
| `getReportesInvestigadoresIntegral` | `get_reportes_investigadores_integral` | — | `ReporteInvestigadorIntegral[]` |
| `getDataPureMasterlist` | `get_data_pure_masterlist` | `{ pureRemoteTotal }` | `PureMasterlistData` |

### configuracion.ts (grados / usuarios / catálogos)

| función | comando Tauri | request | response |
|---|---|---|---|
| `getAllGrados` | `get_all_grados` | — | `GradoAcademico[]` |
| `crearGrado` | `crear_grado` | `{ request }` | `GradoAcademico` |
| `actualizarGrado` | `actualizar_grado` | `{ idGrado, request }` | `GradoAcademico` |
| `eliminarGrado` | `eliminar_grado` | `{ idGrado }` | `EliminarGradoResultado` |
| `reactivarGrado` | `reactivar_grado` | `{ idGrado }` | `GradoAcademico` |
| `crearUsuario` | `crear_usuario` | `{ request }` | `Usuario` |
| `consultarDniParaUsuario` | `consultar_dni_para_usuario` | `{ numero }` | `ReniecDniLookupResult` |
| `getAllUsuarios` | `get_all_usuarios` | — | `Usuario[]` |
| `consultarPersonaDeUsuario` | `consultar_persona_de_usuario` | `{ idUsuario }` | `Persona` |
| `actualizarUsuario` | `actualizar_usuario` | `{ idUsuario, request }` | `Usuario` |
| `desactivarUsuario` | `desactivar_usuario` | `{ idUsuario }` | `Usuario` |
| `reactivarUsuario` | `reactivar_usuario` | `{ idUsuario }` | `Usuario` |
| `getCatalogos` | `get_catalogos` | `{ tipo }` | `CatalogoItem[]` |
| `getAllCatalogosAdmin` | `get_all_catalogos_admin` | `{ tipo }` | `CatalogoItem[]` |
| `crearCatalogo` | `crear_catalogo` | `{ request }` | `CatalogoItem` |
| `actualizarCatalogo` | `actualizar_catalogo` | `{ id, request }` | `CatalogoItem` |
| `eliminarCatalogo` | `eliminar_catalogo` | `{ id }` | `EliminarCatalogoResultado` |
| `reactivarCatalogo` | `reactivar_catalogo` | `{ id }` | `CatalogoItem` |

### dashboard.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `getEstadisticasProyectosXInvestigador` | `get_estadisticas_proyectos_x_investigador` | — | `InvestigadorProyectosCount[]` |
| `getKpisDashboard` | `get_kpis_dashboard` | — | `KpisDashboard` |
| `getProyectosTrend` | `get_proyectos_trend` | — | `ProyectosTrendItem[]` |
| `getRenacytDistribucion` | `get_renacyt_distribucion` | — | `RenacytDistribucionItem[]` |

### grupos.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `getAllGrupos` | `get_all_grupos` | — | `GrupoInvestigacion[]` |
| `getGrupo` | `get_grupo` | `{ idGrupo }` | `GrupoInvestigacion` |
| `createGrupo` | `create_grupo` | `{ request }` | `GrupoInvestigacion` |
| `updateGrupo` | `update_grupo` | `{ idGrupo, request }` | `GrupoInvestigacion` |
| `deleteGrupo` | `delete_grupo` | `{ idGrupo }` | `void` |

### geo.ts / orgUnits.ts / vocabularios.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `obtenerUbigeos` | `obtener_ubigeos` | — | `Ubigeo[]` |
| `obtenerUbigeosPorDepartamento` | `obtener_ubigeos_por_departamento` | `{ departamento }` | `Ubigeo[]` |
| `buscarUbigeos` | `buscar_ubigeos` | `{ prefix }` | `Ubigeo[]` |
| `crearOrgUnit` | `crear_org_unit` | `{ request }` | `OrgUnit` |
| `actualizarOrgUnit` | `actualizar_org_unit` | `{ id, request }` | `OrgUnit` |
| `obtenerOrgUnit` | `obtener_org_unit` | `{ id }` | `OrgUnit` |
| `listarOrgUnits` | `listar_org_units` | `{ parentId }` | `OrgUnit[]` |
| `eliminarOrgUnit` | `eliminar_org_unit` | `{ id }` | `void` |
| `listarVocabulariosConcytec` | `listar_vocabularios_concytec` | — | `string[]` |
| `listarVocabItems` | `listar_vocab_items` | `{ esquema, padreCodigo? }` | `CatalogoItem[]` |
| `reimportarVocabulario` | `reimportar_vocabulario` | `{ esquema }` | `void` |

### publicaciones.ts / pure.ts / perucris.ts / eventos.ts / files.ts / wizard.ts

| función | comando Tauri | request | response |
|---|---|---|---|
| `getAllPublicaciones` | `get_all_publicaciones` | — | `PublicacionCientifica[]` |
| `sincronizarPublicacionesPure` | `sincronizar_publicaciones_pure` | `{ investigadorId }` | `SyncPublicacionesResult` |
| `getPublicacionesInvestigador` | `get_publicaciones_investigador` | `{ investigadorId }` | `PublicacionCientifica[]` |
| `verificarDiferenciasPure` | `verificar_diferencias_pure` | `{ investigadorId? }` | `SyncReport` |
| `listSyncReports` | `list_sync_reports` | `{ tipo?, limit? }` | `SyncReport[]` |
| `enviarAPeruCris` | `enviar_a_perucris` | — | `PeruCrisPushResult` |
| `validarAPeruCris` | `validar_sincronizacion_perucris` | `{ scope }` | `PeruCrisValidationReport` |
| `validarOrgUnitPeruCris` | `validar_org_unit_perucris` | `{ idOrgUnit }` | `PeruCrisValidationItem` |
| `validarPublicacionPeruCris` | `validar_publicacion_perucris` | `{ idPublicacion }` | `PeruCrisValidationItem` |
| `importarInicialesPeruCris` | `importar_iniciales_perucris` | — | `PeruCrisImportResult` |
| `crearEvento` | `crear_evento` | `{ request }` | `EventoAcademico` |
| `getAllEventos` | `get_all_eventos` | — | `EventoAcademico[]` |
| `getEventoById` | `get_evento_by_id` | `{ id }` | `EventoAcademico` |
| `getEventosByInvestigador` | `get_eventos_by_investigador` | `{ idInvestigador }` | `EventoAcademico[]` |
| `actualizarEvento` | `actualizar_evento` | `{ id, request }` | `EventoAcademico` |
| `eliminarEvento` | `eliminar_evento` | `{ id }` | `void` |
| `reactivarEvento` | `reactivar_evento` | `{ id }` | `EventoAcademico` |
| `writeExportFile` | `write_export_file` | `{ filePath, bytes: number[] }` | `void` |
| `wizardHasConfig` | `wizard_has_config` | — | `boolean` |
| `wizardTestMongo` | `wizard_test_mongodb` | `{ uri }` | `ConnectivityResult` |
| `wizardTestReniec` | `wizard_test_reniec` | `{ token }` | `ConnectivityResult` |
| `wizardTestRenacyt` | `wizard_test_renacyt` | `{ baseUrl }` | `ConnectivityResult` |
| `wizardTestPure` | `wizard_test_pure` | `{ baseUrl, apiKey }` | `ConnectivityResult` |
| `wizardTestPerucris` | `wizard_test_perucris` | `{ baseUrl, apiKey?, ruc? }` | `ConnectivityResult` |
| `wizardSaveConfig` | `wizard_save_config` | `{ request }` | `void` |
| `wizardValidateMasterPassword` | `wizard_validate_master_password` | `{ password }` | `void` |
| `wizardConsultarDni` | `wizard_consultar_dni` | `{ token, numero }` | `ReniecDniLookupResult` |

**Total: ~94 funciones wrapper → comandos IPC** (varios comandos compartidos entre features, p. ej. `crear_publicacion` usado por software y publicaciones).

## 4. Resumen de `types/` por dominio

| Dominio | Interfaces clave | Sirve a |
|---|---|---|
| **Auth** | `Usuario` (id_usuario, username, nombre_completo, rol, activo, persona_id, dni), `AuthStatus` (has_users, requires_setup) | auth.ts, wizard |
| **Persona/Investigador** | `Investigador` (idInvestigador, dni, idGrado, nombresApellidos, renacyt_*, purePersonId, perucrisUuid), `InvestigadorDetalle`, `CambioKardex`, `RenacytLookupResult`, `ReniecDniLookupResult` (camelCase), `ImportInvestigadoresResult` (camelCase) | investigadores.ts |
| **Proyecto** | `Proyecto`, `ProyectoDetalle`, `ProyectoParticipanteResumen`, `EliminarProyectoResultado`, `Create/UpdateProyectoConParticipantesArgs` | proyectos.ts |
| **Recurso** | `Patente`, `Producto` (alias `PublicacionCientifica`), `Equipamiento`, `Financiamiento`, `*ConEtiquetas` | recursos.ts, reportes |
| **Reporte** | `ReporteProyectoIntegral`, `ReporteInvestigadorIntegral`, `ResumenFinanciero`, `MiembroProyectoReporte`, `PerfilInvestigadorReporte` | reportes.ts |
| **Catálogo/Grado** | `GradoAcademico`, `CatalogoItem`, `Persona`, `Eliminar*Resultado` | configuracion.ts, vocabularios.ts |
| **Dashboard** | `KpisDashboard`, `InvestigadorProyectosCount`, `ProyectosTrendItem`, `RenacytDistribucionItem`, `ExportData` | dashboard.ts |
| **Geo** | `Ubigeo` (snake case deliberado) | geo.ts |
| **OrgUnit** | `OrgUnit` (id_org_unit, ubigeo_codigo, ruc, ror_id, perucris_uuid/handle, sunedu_*, parent_id), requests camelCase | orgUnits.ts |
| **Publicación** | `PublicacionCientifica` (id_publicacion, titulo, doi, tipo, dominio_origen, pure_uuid, perucris_uuid, id_proyecto) | publicaciones.ts, pure.ts |
| **Pure** | `PureMasterlistPersonRow/StaffRow`, `PureMasterlistSummary/Data`, `SyncPurePersonIdsResult`, `SyncPublicacionesResult` | pure.ts, reportes |
| **PeruCRIS** | `PeruCrisPushResult`, `PeruCrisValidationReport/Item/Scope`, `PeruCrisImportResult` | perucris.ts |
| **Sync report** | `SyncReport` (pure_diff \| perucris_validacion), `SyncReportItem` (solo_local \| solo_pure \| diferente, adoptable) | pure.ts |
| **Evento** | `EventoAcademico`, `ParticipanteEvento` | eventos.ts |
| **Genérico** | `PaginatedResult<T>` — definido pero **sin uso** en wrappers actuales | — |

**Convención**: respuestas snake_case (mirror DTO Rust), requests camelCase. Excepciones camelCase en ambos sentidos: `ImportInvestigadoresResult`, `SyncPurePersonIdsResult`, `ReniecDniLookupResult`.

## 5. Matriz RBAC del frontend (`src/shared/auth/permissions.ts`, 211 líneas)

**Roles** (`AppRole`): `superuser` | `admin` | `operador` | `consulta` | `responsable_proyecto`
**Permisos** (`AppPermission`, 21): `dashboard.view`, `investigadores.view/manage`, `proyectos.view/manage`, `publicaciones.view/manage`, `grupos.view/manage`, `reportes.view/export`, `configuracion.view`, `grados.manage`, `catalogos.view/manage`, `geo.view`, `usuarios.manage`, `vocabularios.view/manage`, `org_units.view/manage`

| Permiso | superuser | admin | operador | consulta | resp. proyecto |
|---|---|---|---|---|---|
| `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `investigadores.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `investigadores.manage` | ✓ | ✓ | ✓ | — | — |
| `proyectos.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `proyectos.manage` | ✓ | ✓ | ✓ | — | **✓** ⚠️ |
| `publicaciones.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `publicaciones.manage` | ✓ | ✓ | ✓ | — | — |
| `grupos.view` | ✓ | ✓ | ✓ | **—** ⚠️ | — |
| `grupos.manage` | ✓ | ✓ | ✓ | — | — |
| `reportes.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `reportes.export` | ✓ | ✓ | ✓ | — | **✓** ⚠️ |
| `configuracion.view` | ✓ | ✓ | — | — | — |
| `grados.manage` | ✓ | ✓ | — | — | — |
| `catalogos.view` | ✓ | ✓ | ✓ | — | — |
| `catalogos.manage` | ✓ | ✓ | — | — | — |
| `geo.view` | ✓ | ✓ | ✓ | ✓ | — |
| `usuarios.manage` | ✓ | ✓ | — | — | — |
| `vocabularios.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `vocabularios.manage` | ✓ | ✓ | — | — | — |
| `org_units.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `org_units.manage` | ✓ | ✓ | ✓ | — | — |

> ⚠️ **Desync vs backend Rust** (3 celdas marcadas): `proyectos.manage` y `reportes.export` otorgados a `responsable_proyecto` solo en frontend (backend compensa con ownership-check `require_recursos_manage_or_responsable` y filtrado por rol); `grupos.view` denegado a `consulta` solo en frontend (`GruposView` concedido en backend). El frontend tampoco tiene equivalente de `OcdeAssignManage`, `GradosRead`, `CatalogosRead`, `VocabulariosRead`, `OrgUnitsView` como permisos separados de vista.

**Helpers exportados**: `normalizeAppRole(value)` (desconocido → `"consulta"`), `getRoleLabel(value)`, `hasPermission(role, permission)`, `getRoleOptions()`, `ROLE_DEFINITIONS` (con `summary` + `modules` para chips UI).

## 6. Gating de UI

1. **Tabs visibles** — `src/App.tsx` filtra `TAB_DEFINITIONS` (`src/app/tabDefinitions.ts`, 7 tabs: dashboard, proyectos, investigadores, publicaciones, grupos, reportes, configuracion) con `hasPermission(currentRole, def.permission)`.
2. **Render de tab** — `src/app/TabRenderers.tsx`: gates por tab y flags a features (`canManage`, `isAdmin`, `canExport`, `canVerificarPure`, `canAdoptarPure`). Guard extra: sin `configuracion.view` → `null`.
3. **Gating fino** — `ConfiguracionTab.tsx` (catalogos.manage, org_units.*), `InvestigadorEventosSection.tsx` (investigadores.manage).
4. **Fallback**: tab activo no permitido → primer tab permitido.

## 7. Hooks (patrón de fetch)

### `shared/hooks/useStableFetch.ts` (67 líneas) — patrón canónico
`useStableFetch<T>(fetcher, refreshTrigger, errorLabel, initialData)` → `{ data, loading, refreshing, error, recargar }`. En error: **resetea `data` a `initialData`** y setea `error` con `getTauriErrorMessage`.

### Otros hooks compartidos
| Hook | Qué hace |
|---|---|
| `useToastError` | Callback `toast.error(prefix + ": " + getTauriErrorMessage(error))` |
| `useRefreshToast` | Toast informativo con cooldown (90 s) en refresh |
| `useRecursoCrud` | CRUD genérico de recursos por proyecto (filas `temp-`, create/delete, refresh) |
| `useDataCache` | Caché en memoria con TTL: `get/set/invalidate` |
| `usePagination` | Estado `{ page, limit }` |
| `usePeruCrisValidation/` (5 archivos) | Provider + store de validación PeruCRIS |
| `useAutoRefresh` (`src/app/hooks/`) | Auto-refresh 15 s + focus/visibilitychange |

### Barriles por feature (`src/features/<feature>/api.ts`)
Re-exportan desde `shared/tauri/*` + `getTauriErrorMessage`: auth, investigadores (incluye eventos + pure), proyectos, grupos, dashboard, reportes (incluye perucris), publicaciones (incluye pure), configuracion.

## 8. Hallazgos (solo constatación)

- **Contratos IPC**: comandos snake_case; mutaciones con `{ request: ... }`, lecturas planas; IDs camelCase (`idProyecto`, `idGrado`).
- **Duplicación de comandos**: `crear_publicacion`/`actualizar_publicacion`/`eliminar_publicacion`/`get_publicaciones_investigador` invocados desde 2+ módulos (`recursos.ts`, `publicaciones.ts`, `pure.ts`).
- **`PaginatedResult<T>`** definido y re-exportado pero sin consumer actual.
- **Binarios por IPC**: `descargarConstanciaRenacytInvestigador` y `writeExportFile` serializan `Uint8Array ↔ number[]`.
- **Tests de la capa**: solo `error.test.ts` + `permissions.test.ts` (en `src/shared/auth/`). Sin tests de wrappers.
