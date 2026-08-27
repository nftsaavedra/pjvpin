# Documentación del Backend PJVPI — Censo v0.1.0

> **Fecha del censo**: 2026-08-27
> **Fuente**: análisis estático read-only de `src-tauri/src/` + `src/shared/tauri/` (4 agentes de exploración en paralelo).
> **Propósito**: inventario completo del backend actual (Tauri v2 + Rust + MongoDB Atlas) como línea base para la migración a monorepo con backend NestJS separado.

## Índice

| Archivo | Contenido |
|---|---|
| [01-endpoints-ipc.md](./01-endpoints-ipc.md) | Censo exhaustivo de los **155 comandos Tauri** (endpoints IPC): firma, RBAC, auditoría, servicios externos, sesión |
| [02-features-dominio.md](./02-features-dominio.md) | Censo de las **15 features de dominio** Rust: archivos, modelos, colecciones, índices, dependencias, tests |
| [03-shared-infraestructura.md](./03-shared-infraestructura.md) | Censo de **`shared/`** (infraestructura transversal): AppState, RBAC (matriz completa), sesiones, VOs, clientes HTTP externos, macros |
| [04-capa-cliente-frontend.md](./04-capa-cliente-frontend.md) | Censo de **`src/shared/tauri/`** (capa API del frontend): 94 wrappers IPC → comando, tipos, matriz RBAC TS, gating de UI |

## Resumen ejecutivo

### Dimensiones del backend

| Métrica | Valor |
|---|---|
| Comandos Tauri (endpoints IPC) registrados | **155** (verificados 1:1 definidos vs registrados) |
| Features de dominio Rust | **15** (catalogos, eventos, geo, grados, grupos, investigadores, ocde, org_units, personas, proyectos, publicaciones, recursos, reportes, seguridad, usuarios) |
| Líneas de código Rust | **33 266** en 126 archivos `.rs` |
| — `shared/` (infraestructura) | 8 878 líneas (26.7%) |
| — Top 3 features | investigadores (3 903), proyectos (3 628), reportes (3 517) |
| Colecciones MongoDB | **23** (+ 17 en reset dev) |
| Permisos RBAC backend | **23** (`AppPermission`) × 5 roles |
| Permisos RBAC frontend | **21** (naming dotted) × 5 roles |
| Tests Rust | **117** (`#[test]` + `#[tokio::test]` + pivots inline) |
| Wrappers IPC frontend | **94 funciones** → comandos snake_case |
| Servicios externos | RENIEC, RENACYT, Pure, PeruCRIS (4 clientes HTTP + 6 servicios) |

### Arquitectura actual (a preservar en la migración)

- **Hexagonal por feature**: `models.rs` (dominio puro, sin serde) + `dto.rs` (`*Doc` BSON + `*Request`/`*Dto` IPC, camelCase) + `repository.rs` + `handlers.rs` + `commands.rs`. Única excepción deliberada: `seguridad` (fachada IPC delgada).
- **RBAC**: enum + matriz `role_has_permission` en `shared/rbac.rs`; enforcement en cada handler/command vía `require_permission`. Excepción de ownership: `require_recursos_manage_or_responsable`.
- **Sesiones**: en memoria (`SessionStore`, `RwLock<HashMap>`), timeout 30 min / máximo 4 h, sesión por ventana. Rate limiter de login (5 intentos/15 min). Cache RENIEC TTL 1 h.
- **Integridad referencial**: simulada en Rust (`shared::refs` — RESTRICT; `shared::hierarchy` — ciclos/self-parent) + índices UNIQUE con `partial_filter_expression` para campos nullable (lección E11000 consolidada).
- **Pivots M:N**: 5 pivots CONCYTEC/PerúCRIS vía macro `impl_pivot_repository!` (insert/list/delete/delete_for/ensure_indexes).
- **Auditoría**: archivo JSONL append-only (`pjvpin-audit.log`), ~65 call-sites, NO MongoDB.
- **Vocabularios SKOS CONCYTEC**: seed embebido (15 esquemas) + ubigeo INEI embebido (2 113 registros).
- **Exportación CERIF**: `reportes/cerif.rs` serializa JSON `pjvpin/cerif-json/0.1` (5 entidades).

### Hallazgos relevantes para la migración (solo constatación)

1. **Desync RBAC frontend/backend**: la matriz TS (21 permisos dotted) difiere de la matriz Rust (23 permisos PascalCase) en al menos 3 puntos: `proyectos.manage` y `reportes.export` otorgados a `responsable_proyecto` en frontend pero NO en backend (backend compensa con ownership-check y filtrado por rol); `grupos.view` denegado a `consulta` en frontend pero `GruposView` concedido en backend. La tabla RBAC de AGENTS.md tampoco coincide al 100%.
2. **`PaginatedResult<T>` definido pero sin uso**: existe en backend (3 comandos paginados lo retornan) y en `types/pagination.types.ts`, pero ningún wrapper frontend actual lo consume.
3. **Contratos mixtos**: respuestas IPC en snake_case (mirror DTO Rust), requests en camelCase (`#[serde(rename_all = "camelCase")]`). `ImportInvestigadoresResult` y `SyncPurePersonIdsResultDto` son camelCase en ambos sentidos.
4. **AGENTS.md desactualizado en 2 puntos**: la capa API vive en `src/shared/tauri/` (no `src/services/tauri/`); no existe barrel `src/hooks/` (hooks en `src/shared/hooks/` + `src/features/*/hooks/`).
5. **Circuit breaker y timeouts**: solo RENIEC lo tiene (en `investigadores/import.rs`, no en shared); timeouts explícitos solo en constancia RENACYT (30 s) y PeruCRIS público (15 s).
6. **Wizard/bootstrap**: 15 comandos sin sesión (pre-auth), config persistida en `pjvpin.config.json` plaintext — en una arquitectura cliente-servidor este flujo cambia de dueño (el wizard configuraría el servidor, no el cliente).
7. **Recursos con escritura a disco local**: `write_export_file` (Excel/PDF/CERIF) escribe en el CWD del desktop — en backend NestJS centralizado, la exportación debe devolverse como stream/descarga HTTP.
8. **Sesiones en memoria**: no escalan a multi-usuario web → la migración requiere JWT/sesiones compartidas (Redis o stateless).

### Mapa preliminar de correspondencia para NestJS (informativo)

| Concepto actual (Rust/Tauri) | Equivalente NestJS |
|---|---|
| `commands.rs` (`#[tauri::command]`) | `*.controller.ts` (`@Controller`, DTOs con class-validator) |
| `handlers.rs` (lógica de negocio) | `*.service.ts` |
| `repository.rs` + `*Doc` | `*.repository.ts` (Mongoose Schema o driver directo) |
| `models.rs` (dominio puro) | Clases de dominio / interfaces en `packages/*` |
| `shared/rbac.rs` + guards | Guards NestJS (`@Roles()`, `PermissionsGuard`) |
| `SessionStore` (memoria) | JWT access/refresh o sesión Redis |
| `AppError` | `HttpException` filter global + excepciones de dominio |
| `impl_pivot_repository!` | Repositorios pivot genéricos TS |
| `shared/external/*` | `HttpModule`/`HttpService` clients en `packages/connectors` |
| `shared/audit.rs` (JSONL) | Interceptor de auditoría (misma salida o colección Mongo) |
| `write_export_file` | Endpoint de descarga (`StreamableFile`) |
| Wizard (`wizard_*`) | Bootstrap endpoint + setup UI web |
