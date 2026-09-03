# Censo de la Capa de API del Frontend — `src/shared/http/` + `src/shared/api/`

> **Estructura actual (post-migración HTTP)**: la capa de datos del desktop se divide en dos capas:
> - **`src/shared/http/`** — transporte puro (fetch, errores, tokens, URL).
> - **`src/shared/api/`** — cliente de dominio (wrappers de endpoints + tipos).
>
> Los hooks viven en `src/shared/hooks/` y `src/features/*/hooks/`. Existen barriles por feature (`src/features/<feature>/api.ts`).

## 1. Estructura de directorios

### `src/shared/http/` — Transporte (5 archivos + 4 tests)

| Archivo | Líneas | Propósito |
|---|---|---|
| `client.ts` | ~100 | `apiFetch<T>()` + `refreshSession()` — fetch con Bearer, refresh transparente en 401 |
| `error.ts` | ~80 | `AppError` (clase), `getApiErrorMessage(status, body)`, `getErrorMessage(error)` |
| `config.ts` | ~20 | `getApiUrl()` / `setApiUrl()` / `getApiBaseUrl()` — resolución localStorage → env → default |
| `tokenStore.ts` | ~20 | `getAccessToken` / `getRefreshToken` / `setTokens` / `clearTokens` — localStorage |
| `index.ts` | ~10 | Barrel: `apiFetch`, `refreshSession`, `getApiErrorMessage`, `getErrorMessage`, `AppError`, config, tokens |
| `client.test.ts` | ~180 | Tests: 200, 204, query, auth, 401 refresh, error (16 tests) |
| `error.test.ts` | ~90 | Tests: `getApiErrorMessage` + `getErrorMessage` (13 tests) |
| `config.test.ts` | ~40 | Tests: resolución URL (6 tests) |
| `tokenStore.test.ts` | ~35 | Tests: localStorage CRUD (5 tests) |

### `src/shared/api/` — Cliente de dominio (15 wrappers + auth + types)

| Archivo | Líneas | Dominio |
|---|---|---|
| `auth.ts` | ~77 | `checkHealth`, `getAuthStatus`, `loginUsuario`, `getCurrentSession`, `logoutUsuario`, `bootstrap`, `bootstrapReniecDni` |
| `auth.test.ts` | ~74 | Tests de endpoints auth (7 tests) |
| `configuracion.ts` | ~144 | Grados, Usuarios, Persona, Catálogos |
| `dashboard.ts` | ~25 | KPIs, trend, distribución RENACYT |
| `eventos.ts` | ~53 | Eventos académicos CRUD |
| `geo.ts` | ~16 | Ubigeos INEI |
| `grupos.ts` | ~36 | Grupos de investigación CRUD |
| `investigadores.ts` | ~167 | CRUD investigador + RENIEC/RENACYT/Pure + import por DNI + kardex |
| `orgUnits.ts` | ~25 | Org units (estructura institucional) |
| `perucris.ts` | ~34 | Push/validación/import inicial PeruCRIS |
| `proyectos.ts` | ~64 | Proyectos + participantes |
| `publicaciones.ts` | ~6 | Listado consolidado |
| `pure.ts` | ~40 | Sync publicaciones Pure + sync reports |
| `recursos.ts` | ~212 | Patentes, Software, Equipamientos, Financiamientos |
| `reportes.ts` | ~37 | Exportación plana/agrupada + reportes integrales + masterlist |
| `vocabularios.ts` | ~17 | Vocabularios CONCYTEC (árbol SKOS) |
| `types/` | ~1012 | 17 archivos de tipos (ver §4) |

### Barriles por feature (`src/features/<feature>/api.ts`, 8 archivos)

Re-exportan desde `shared/api/*` + `shared/http/error`: auth, investigadores, proyectos, grupos, dashboard, reportes, publicaciones, configuracion.

## 2. Mecánica del transporte (`http/`)

### `client.ts` — `apiFetch<T>(path, options)`

- Base URL desde `config.ts` (`getApiBaseUrl()` → `{apiUrl}/api/v1`).
- Inyección automática de `Authorization: Bearer {accessToken}` (salvo `noAuth: true`).
- Query params serializados como `URLSearchParams`.
- **Refresh transparente**: en 401 (no en `/auth/*`), intenta `refreshSession()` una vez y reintenta. Si falla, limpia tokens y lanza `AppError`.
- `refreshSession()` exportado: `POST /auth/refresh` con rotación de tokens. Usado por `apiFetch` (401) y `useAuth` (arranque).

### `error.ts` — Tres exportaciones

1. **`AppError`** (clase): `extends Error` con `name = "AppError"`. Lanzada por `apiFetch` y por wrappers que hacen fetch directo (ej: `descargarConstanciaRenacytInvestigador`).

2. **`getApiErrorMessage(status, body)`**: formatea desde respuesta HTTP. Orden: variantes del `AppErrorFilter` (`ValidationError`, `NotFound`, `UniqueConstraintViolation`, `ConfigurationError`, `ExternalServiceError`, `ReferentialIntegrity`, `DatabaseError`, `InternalError`, `DataInconsistency`) → string body → `STATUS_MESSAGES[status]` → `"Error HTTP {status}"`.

3. **`getErrorMessage(error)`**: extrae mensaje de un error ya lanzado (para call-sites). Orden: `!error` → `"Error desconocido"`; string → string; `.message` → message; variantes → valor; fallback `JSON.stringify` / `String()`.

### `config.ts` — Resolución de URL

Orden: `localStorage['pjvpin.apiUrl']` → `import.meta.env.PJVPIN_API_URL` → `http://localhost:18080`. `getApiBaseUrl()` = `{apiUrl}/api/v1`.

### `tokenStore.ts` — localStorage

Claves: `pjvpin.auth.access`, `pjvpin.auth.refresh`. Funciones: `getAccessToken`, `getRefreshToken`, `setTokens`, `clearTokens`.

### Serialización camelCase ↔ snake_case (`apps/api/src/infra/serialization/`)

**Estado actual**: el `CamelToSnakePipe` está ACTIVO (convierte requests camelCase → snake_case antes de `ValidationPipe`). El `SnakeToCamelInterceptor` existe pero está DESACTIVADO (el frontend espera snake_case en responses). **Todos los DTOs de request están unificados a snake_case** (2026-09-03): el pipe permite al frontend seguir enviando camelCase mientras los DTOs validan snake_case.

| Componente | Estado | Propósito |
|---|---|---|
| `CamelToSnakePipe` | ✅ Activo | Transforma body/query camelCase → snake_case antes de validación |
| `SnakeToCamelInterceptor` | ⏸️ Desactivado | Transforma response snake_case → camelCase (listo para activar) |
| `@SkipSerialization()` | ✅ Disponible | Opt-out para endpoints con schema de dominio (CERIF) |
| `camelToSnakeKeys` / `snakeToCamelKeys` | ✅ Disponibles | Utilidades puras, recursivas, testables |

**Convención de contrato actual**: requests camelCase (frontend) → API las convierte a snake_case (pipe) → DTOs snake_case validan. Responses snake_case (API) → frontend las lee directo (tipos snake_case). Todos los DTOs de request (auth, catalogos, proyectos, recursos, publicaciones, eventos) usan snake_case. El e2e incluye `CamelToSnakePipe` para paridad con producción.

## 3. Tabla maestra función → endpoint HTTP

### auth.ts

| función | método | endpoint | noAuth |
|---|---|---|---|
| `checkHealth` | GET | `/health` | ✓ |
| `getAuthStatus` | GET | `/auth/status` | ✓ |
| `loginUsuario` | POST | `/auth/login` | ✓ |
| `getCurrentSession` | GET | `/auth/session` | — |
| `logoutUsuario` | POST | `/auth/logout` | — |
| `bootstrap` | POST | `/auth/bootstrap` | ✓ |
| `bootstrapReniecDni` | POST | `/auth/bootstrap/reniec-dni` | ✓ |

### investigadores.ts

| función | método | endpoint |
|---|---|---|
| `crearInvestigador` | POST | `/investigadores` |
| `getAllInvestigadores` | GET | `/investigadores` |
| `buscarInvestigadorPorDni` | GET | `/investigadores/dni/{dni}` |
| `buscarInvestigadorPorDniConRenacyt` | GET | `/investigadores/dni/{dni}/renacyt` |
| `consultarDniReniec` | GET | `/external/reniec/dni/{numero}` |
| `consultarRenacytInvestigador` | GET | `/external/renacyt/investigador/{codigoOId}` |
| `getAllInvestigadoresConProyectos` | GET | `/investigadores/detalle` |
| `eliminarInvestigador` | DELETE | `/investigadores/{id}` |
| `reactivarInvestigador` | PATCH | `/investigadores/{id}/reactivar` |
| `refrescarFormacionAcademicaRenacytInvestigador` | POST | `/investigadores/{id}/renacyt/formacion/refrescar` |
| `actualizarInvestigador` | PATCH | `/investigadores/{id}` |
| `descargarConstanciaRenacytInvestigador` | GET | `/investigadores/{id}/renacyt/constancia` (fetch directo, binario) |
| `sincronizarPurePersonIds` | POST | `/pure/person-ids/sync` |
| `importarInvestigadores` | POST | `/investigadores/import` |
| `getPlantillaInvestigadoresDefault` | GET | `/investigadores/import/plantilla` |
| `getKardexInvestigador` | GET | `/investigadores/{id}/kardex` |
| `marcarCambiosRenacytRevisados` | PATCH | `/investigadores/{id}/renacyt/cambios-revisados` |
| `refrescarRenacytTodos` | POST | `/investigadores/renacyt/refrescar-todos` |

### proyectos.ts

| función | método | endpoint |
|---|---|---|
| `crearProyectoConParticipantes` | POST | `/proyectos` |
| `actualizarProyectoConParticipantes` | PATCH | `/proyectos/{id}` |
| `buscarProyectosPorInvestigador` | GET | `/proyectos/investigador/{id}` |
| `getAllProyectosDetalle` | GET | `/proyectos/detalle` |
| `eliminarRelacionProyectoInvestigador` | DELETE | `/proyectos/{id}/investigadores/{idInv}` |
| `eliminarRelacionesProyecto` | DELETE | `/proyectos/{id}/investigadores` |
| `eliminarProyecto` | DELETE | `/proyectos/{id}` |
| `reactivarProyecto` | PATCH | `/proyectos/{id}/reactivar` |

### recursos.ts (patentes / software / equipamientos / financiamientos)

| función | método | endpoint |
|---|---|---|
| `crearPatente` | POST | `/recursos/patentes` |
| `getPatentesProyecto` | GET | `/recursos/patentes/proyecto/{id}` |
| `actualizarPatente` | PATCH | `/recursos/patentes/{id}` |
| `eliminarPatente` | DELETE | `/recursos/patentes/{id}` |
| `crearSoftware` | POST | `/recursos/software` |
| `getSoftwareProyecto` | GET | `/recursos/software/proyecto/{id}` |
| `actualizarSoftware` | PATCH | `/recursos/software/{id}` |
| `eliminarSoftware` | DELETE | `/recursos/software/{id}` |
| `crearEquipamiento` | POST | `/recursos/equipamientos` |
| `getEquipamientosProyecto` | GET | `/recursos/equipamientos/proyecto/{id}` |
| `actualizarEquipamiento` | PATCH | `/recursos/equipamientos/{id}` |
| `eliminarEquipamiento` | DELETE | `/recursos/equipamientos/{id}` |
| `crearFinanciamiento` | POST | `/recursos/financiamientos` |
| `getFinanciamientosProyecto` | GET | `/recursos/financiamientos/proyecto/{id}` |
| `actualizarFinanciamiento` | PATCH | `/recursos/financiamientos/{id}` |
| `eliminarFinanciamiento` | DELETE | `/recursos/financiamientos/{id}` |

### reportes.ts

| función | método | endpoint |
|---|---|---|
| `getDataExportacionPlana` | GET | `/reportes/export/plana` |
| `getDataExportacionAgrupada` | GET | `/reportes/export/agrupada` |
| `getReporteProyectoIntegral` | GET | `/reportes/integral/proyecto/{id}` |
| `getReporteInvestigadorIntegral` | GET | `/reportes/integral/investigador/{id}` |
| `getReportesInvestigadoresIntegral` | GET | `/reportes/integral/investigadores` |
| `getDataPureMasterlist` | GET | `/reportes/pure/masterlist` |

### configuracion.ts (grados / usuarios / catálogos)

| función | método | endpoint |
|---|---|---|
| `getAllGrados` | GET | `/grados` |
| `crearGrado` | POST | `/grados` |
| `actualizarGrado` | PATCH | `/grados/{id}` |
| `eliminarGrado` | DELETE | `/grados/{id}` |
| `reactivarGrado` | PATCH | `/grados/{id}/reactivar` |
| `crearUsuario` | POST | `/usuarios` |
| `consultarDniParaUsuario` | GET | `/external/reniec/dni/{numero}` |
| `getAllUsuarios` | GET | `/usuarios` |
| `consultarPersonaDeUsuario` | GET | `/usuarios/{id}/persona` |
| `actualizarUsuario` | PATCH | `/usuarios/{id}` |
| `desactivarUsuario` | PATCH | `/usuarios/{id}/desactivar` |
| `reactivarUsuario` | PATCH | `/usuarios/{id}/reactivar` |
| `getCatalogos` | GET | `/catalogos/{tipo}` |
| `getAllCatalogosAdmin` | GET | `/catalogos/admin/{tipo}` |
| `crearCatalogo` | POST | `/catalogos` |
| `actualizarCatalogo` | PATCH | `/catalogos/{id}` |
| `eliminarCatalogo` | DELETE | `/catalogos/{id}` |
| `reactivarCatalogo` | PATCH | `/catalogos/{id}/reactivar` |

### dashboard.ts

| función | método | endpoint |
|---|---|---|
| `getEstadisticasProyectosXInvestigador` | GET | `/dashboard/estadisticas-proyectos-investigador` |
| `getKpisDashboard` | GET | `/dashboard/kpis` |
| `getProyectosTrend` | GET | `/dashboard/proyectos-trend` |
| `getRenacytDistribucion` | GET | `/dashboard/renacyt-distribucion` |

### grupos.ts

| función | método | endpoint |
|---|---|---|
| `getAllGrupos` | GET | `/grupos` |
| `getGrupo` | GET | `/grupos/{id}` |
| `createGrupo` | POST | `/grupos` |
| `updateGrupo` | PATCH | `/grupos/{id}` |
| `deleteGrupo` | DELETE | `/grupos/{id}` |

### geo.ts / orgUnits.ts / vocabularios.ts

| función | método | endpoint |
|---|---|---|
| `obtenerUbigeos` | GET | `/geo/ubigeos` |
| `obtenerUbigeosPorDepartamento` | GET | `/geo/ubigeos/departamento/{d}` |
| `buscarUbigeos` | GET | `/geo/ubigeos/buscar` |
| `crearOrgUnit` | POST | `/org-units` |
| `actualizarOrgUnit` | PATCH | `/org-units/{id}` |
| `obtenerOrgUnit` | GET | `/org-units/{id}` |
| `listarOrgUnits` | GET | `/org-units` |
| `eliminarOrgUnit` | DELETE | `/org-units/{id}` |
| `listarVocabulariosConcytec` | GET | `/vocabularios` |
| `listarVocabItems` | GET | `/vocabularios/{esquema}/items` |
| `reimportarVocabulario` | POST | `/vocabularios/{esquema}/reimportar` |

### publicaciones.ts / pure.ts / perucris.ts / eventos.ts

| función | método | endpoint |
|---|---|---|
| `getAllPublicaciones` | GET | `/publicaciones` |
| `sincronizarPublicacionesPure` | POST | `/investigadores/{id}/pure/sync` |
| `getPublicacionesInvestigador` | GET | `/investigadores/{id}/publicaciones` |
| `verificarDiferenciasPure` | POST | `/pure/verificar-diferencias` |
| `listSyncReports` | GET | `/sync/reportes` |
| `enviarAPeruCris` | POST | `/perucris/push` |
| `validarAPeruCris` | POST | `/perucris/validacion` |
| `validarOrgUnitPeruCris` | GET | `/perucris/validacion/org-unit/{id}` |
| `validarPublicacionPeruCris` | GET | `/perucris/validacion/publicacion/{id}` |
| `importarInicialesPeruCris` | POST | `/perucris/import/iniciales` |
| `crearEvento` | POST | `/eventos` |
| `getAllEventos` | GET | `/eventos` |
| `getEventoById` | GET | `/eventos/{id}` |
| `getEventosByInvestigador` | GET | `/eventos/investigador/{id}` |
| `actualizarEvento` | PATCH | `/eventos/{id}` |
| `eliminarEvento` | DELETE | `/eventos/{id}` |
| `reactivarEvento` | PATCH | `/eventos/{id}/reactivar` |

**Total: ~94 funciones wrapper → endpoints REST**.

## 4. Resumen de `types/` por dominio

| Dominio | Interfaces clave | Sirve a |
|---|---|---|
| **Auth** | `Usuario`, `AuthStatus` | auth.ts |
| **Persona/Investigador** | `Investigador`, `InvestigadorDetalle`, `CambioKardex`, `RenacytLookupResult`, `ReniecDniLookupResult`, `ImportInvestigadoresResult` | investigadores.ts |
| **Proyecto** | `Proyecto`, `ProyectoDetalle`, `EliminarProyectoResultado`, `Create/UpdateProyectoConParticipantesArgs` | proyectos.ts |
| **Recurso** | `Patente`, `PublicacionCientifica`, `Equipamiento`, `Financiamiento`, `*ConEtiquetas` | recursos.ts, reportes |
| **Reporte** | `ReporteProyectoIntegral`, `ReporteInvestigadorIntegral` | reportes.ts |
| **Catálogo/Grado** | `GradoAcademico`, `CatalogoItem`, `Persona`, `Eliminar*Resultado` | configuracion.ts, vocabularios.ts |
| **Dashboard** | `KpisDashboard`, `InvestigadorProyectosCount`, `ProyectosTrendItem`, `RenacytDistribucionItem`, `ExportData` | dashboard.ts |
| **Geo** | `Ubigeo` | geo.ts |
| **OrgUnit** | `OrgUnit`, requests | orgUnits.ts |
| **Publicación** | `PublicacionCientifica` | publicaciones.ts, pure.ts |
| **Pure** | `PureMasterlistPersonRow/StaffRow`, `SyncPurePersonIdsResult`, `SyncPublicacionesResult` | pure.ts, reportes |
| **PeruCRIS** | `PeruCrisPushResult`, `PeruCrisValidationReport/Item/Scope`, `PeruCrisImportResult` | perucris.ts |
| **Sync report** | `SyncReport`, `SyncReportItem` | pure.ts |
| **Evento** | `EventoAcademico`, `ParticipanteEvento` | eventos.ts |
| **Genérico** | `PaginatedResult<T>` — definido pero sin uso actual | — |

**Convención**: respuestas snake_case (mirror DTO Rust), requests snake_case (DTOs unificados 2026-09-03; frontend envía camelCase, pipe normaliza).

## 5. Matriz RBAC del frontend (`src/shared/auth/permissions.ts`)

Sin cambios respecto a la versión anterior. Ver AGENTS.md §5 para la tabla completa.

## 6. Hooks (patrón de fetch)

### `shared/hooks/useStableFetch.ts` — patrón canónico
`useStableFetch<T>(fetcher, refreshTrigger, errorLabel, initialData)` → `{ data, loading, refreshing, error, recargar }`. En error: **resetea `data` a `initialData`** y setea `error` con `getErrorMessage`.

### Otros hooks compartidos
| Hook | Qué hace |
|---|---|
| `useToastError` | Callback `toast.error(prefix + ": " + getErrorMessage(error))` |
| `useRefreshToast` | Toast informativo con cooldown (90 s) en refresh |
| `useRecursoCrud` | CRUD genérico de recursos por proyecto |
| `useDataCache` | Caché en memoria con TTL |
| `usePagination` | Estado `{ page, limit }` |
| `usePeruCrisValidation/` (5 archivos) | Provider + store de validación PeruCRIS |
| `useAutoRefresh` (`src/app/hooks/`) | Auto-refresh 15 s + focus/visibilitychange |

### Barriles por feature (`src/features/<feature>/api.ts`)
Re-exportan desde `shared/api/*` + `getErrorMessage` de `shared/http/error`: auth, investigadores (incluye eventos + pure), proyectos, grupos, dashboard, reportes (incluye perucris), publicaciones (incluye pure), configuracion.

## 7. Testing

- **Desktop (vitest)**:8 suites,78 tests. `http/client.test.ts` (16), `http/error.test.ts` (13), `http/config.test.ts` (6), `http/tokenStore.test.ts` (5), `api/auth.test.ts` (7), `shared/auth/permissions.test.ts` (13), `shared/forms/useDniValidation.test.ts` (9), `features/investigadores/utils/parseDniList.test.ts` (9).
- **API (jest)**:12 suites,322 tests. Incluye `perucris.client.spec.ts` (6), `perucris.service.spec.ts` (3), `reportes.controller.spec.ts` (3).

## 8. Hallazgos (solo constatación)

- **Contratos HTTP**: respuestas snake_case (mirror DTO Rust), requests snake_case (DTOs unificados 2026-09-03; frontend envía camelCase, `CamelToSnakePipe` normaliza). Sin cambio en el contrato IPC original del desktop.
- **Duplicación de endpoints**: `crear_publicacion`/`actualizar_publicacion`/`eliminar_publicacion` invocados desde2+módulos (`recursos.ts`, `publicaciones.ts`).
- **`PaginatedResult<T>`** definido y re-exportado pero sin consumer actual.
- **Binarios**: `descargarConstanciaRenacytInvestigador` usa fetch directo (no `apiFetch`) para obtener `Uint8Array`. `saveDesktopFile` usa `@tauri-apps/plugin-fs`.
- **Imports dinámicos legítimos**: code-splitting en `lazyImports.ts`, `ConfiguracionTab.tsx`, `ReportesTab.tsx` (excel/pdf), `PureMasterListPanel.tsx`, `usePeruCrisValidation/*`.
