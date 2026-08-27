# Censo de Infraestructura Transversal — `src-tauri/src/shared/`

> Cobertura: 27 archivos de `shared/` + 14 de `shared/external/` + interacción con `geo/` y el setup de `lib.rs`.

## 1. `shared/mod.rs` — registro de módulos

Exporta 23 módulos públicos + 3 de test: access_control, audit, config, config_validator, config_wizard, data_loader, db, defaults, dni, doi, error, external, hierarchy, logging, macros, orcid, pagination, rbac, refs, state, time, tokens, vocab_mapper.

## 2. `error.rs` — AppError + sanitización (156 líneas)

**Propósito**: enum de errores canónico de toda la app (backend y frontera IPC serde).

**API pública**:
- `enum AppError` (Serializar/Deserializar para cruzar IPC): `DatabaseError(String)`, `UniqueConstraintViolation(String)`, `NotFound(String)`, `InternalError(String)`, `ConfigurationError(String)`, `ExternalServiceError(String)`, `DataInconsistency(String)`, `ReferentialIntegrity(String)`, `ValidationError(String)`.
- `sanitize_external_detail(input: &str) -> String` — redacta secretos tras markers (`api-key`, `authorization`, `bearer `, `token`, `password`, `secret`, `PJVPIN_*`, `mongodb://`…), colapsa CR/LF y trunca a 512 chars.
- `format_error_chain(e) -> String` (pub(crate)) — cadena de sources para logs.

**Conversiones**: `From<mongodb::error::Error>` (detecta `E11000`/`duplicate key` → `UniqueConstraintViolation` con mensaje user-friendly según campo) y `From<reqwest::Error>` → `ExternalServiceError` sanitizado.

**Crates**: serde, mongodb, reqwest.

## 3. `state.rs` — AppState, SessionStore, LoginRateLimiter, ReniecCache (298 líneas)

**AppState** (gestionado por Tauri `app.manage()`):
| Campo | Tipo | Notas |
|---|---|---|
| `mongo` | `Option<Database>` | `None` = modo wizard |
| `reniec` | `ReniecConfig` | |
| `renacyt` | `RenacytConfig` | |
| `pure_config` | `PureConfig` | |
| `perucris_config` | `PeruCrisConfig` | |
| `tokens` | `TokenResolver` | construido en `new()` |
| `sessions` | `SessionStore` (privado) | en memoria |
| `rate_limiter` | `LoginRateLimiter` | en memoria |
| `reniec_cache` | `ReniecCache` | en memoria, TTL 1h |

Métodos: `mongo_db() -> Result<&Database>` (ConfigurationError si None), `set_current_session`, `get_current_session_user_id`, `validate_session`, `touch_current_session`, `clear_current_session`, `cleanup_sessions`.

**SessionStore** (memoria pura, `RwLock<HashMap>`): `SessionEntry { user_id, last_activity_at, created_at }`. `SESSION_TIMEOUT_MS = 30 min`; máx absoluto 8×TTL = 4 h. Token = UUID v4. Mapa `window_map` (window_label → token): sesión única por ventana. `validate_and_get_user_id` hace touch + limpia expirados.

**LoginRateLimiter**: 5 intentos por username en ventana de 15 min; `check_and_record` devuelve error con segundos de espera; `clear` tras login exitoso.

**ReniecCache**: key = DNI validado, TTL 60 min, guarda `ReniecDniLookupResult`.

**Crates**: mongodb, tokio, uuid, serde.

## 4. `config.rs` — RuntimeConfig multi-fuente (410 líneas)

**Structs**: `DatabaseConfig { mongodb_uri: Option, mongodb_db_name, mongodb_max_pool_size, mongodb_min_pool_size }`, `ReniecConfig { api_base_url, token: Option }`, `RenacytConfig { api_base_url, acto_version, ficha_base_url }`, `PureConfig { api_base_url, api_key: Option }`, `PeruCrisConfig { api_base_url, api_key: Option, ruc: Option }`, `RuntimeConfig { database, reniec, renacyt, pure, perucris }`.

**Precedencia de fuentes en `load_runtime_config(user_config_path, project_env_path)`** (menor → mayor):
1. `.env` del proyecto (best-effort).
2. JSON de usuario `pjvpin.config.json` (camelCase).
3. `pjvpin.env` legacy junto al config.
4. Env del proceso (lista fija de 14 keys `PJVPIN_*`).

Cada `*Config::from_values` resuelve defaults desde `defaults.rs` y env vars específicas (ej. `PureConfig` acepta `PJVPIN_PURE_API_KEY` y legacy `PURE_API_KEY`).

## 5. `config_validator.rs` (67 líneas)

`validate_database_config(&DatabaseConfig) -> Result<(), AppError>`: exige URI si `requires_mongodb()` (siempre true) y valida formato `mongodb://` / `mongodb+srv://` con host no vacío. Invocado en `lib.rs` setup antes de `init_mongo`.

## 6. `config_wizard.rs` — Wizard (468 líneas)

- `WizardConfigRequest` (camelCase): `master_password`, `mongodb_uri`, `mongodb_db: Option`, `reniec_token: Option`, `renacyt_base_url: Option`, `renacyt_acto_version: Option`, `pure_api_key: Option`, `perucris_api_key: Option`, `perucris_ruc: Option`.
- `ConnectivityResult { service, success, message }`.
- `get_config_path()` → `{APPDATA}/com.vpin.pjvpin/pjvpin.config.json` (fallbacks: config dir, temp).
- `save_wizard_config(request, path)` — escribe JSON plaintext con defaults para URLs no provistas.
- `validate_master_password` — ≥8 chars, mayúscula, minúscula, dígito, especial.
- Tests de conectividad (timeout 10 s): `test_mongodb_connectivity` (ping), `test_reniec_connectivity` (GET DNI test, 404 = éxito), `test_renacyt_connectivity` (acto registral público), `test_pure_connectivity` (GET /persons?size=1 con api-key), `test_perucris_connectivity` (GET {base}/cerif/status tolera 404 + search público + sanity-check por RUC).

## 7. `db.rs` — Conexión MongoDB + índices (569 líneas)

- `DEV_RESET_COLLECTIONS: &[&str]` — 17 colecciones dropeadas por reset dev.
- `drop_dev_collections(&Database)` — drop best-effort, solo `#[cfg(debug_assertions)]` + `PJVPIN_RESET_DEV=1|true`.
- `init_mongo(&DatabaseConfig) -> Result<Database>` — `ClientOptions::parse`, pool configurable, `app_name = "PJVPI"`, luego `ensure_indexes`.
- `ensure_indexes(&Database)` — **idempotente**: dropea TODOS los índices non-_id y recrea. Delega en los repositorios de feature (catalogos, geo, ocde, org_units, kardex, sync_reportes y los 5 pivots vía macro).

## 8. Value Objects: `dni.rs`, `doi.rs`, `orcid.rs`

Patrón: VO puro **sin serde**, construcción validada en `new()`, desempaque con `into_string()`, `Display` + `AsRef<str>`.

| VO | Regla | API | Tests |
|---|---|---|---|
| `Dni` (153 L) | 8 dígitos ASCII + trim | `Dni::new(&str)`, `Dni::validate`, `into_string()`, `DNI_LEN=8` | 11 |
| `Doi` (149 L) | prefijo `10.` + prefijo numérico + `/` + sufijo sin espacios, ≤255 | `Doi::new`, `Doi::new_opt`, `DOI_MAX_LEN=255` | 9 |
| `Orcid` (218 L) | 16 dígitos + checksum ISO 7064 mod 11-2; normaliza sin guiones | `Orcid::new`, `Orcid::new_opt`, `into_string()` | 12 |

## 9. `tokens.rs` — TokenResolver (193 líneas)

Acceso centralizado a credenciales externas con mensajes canónicos. RENACYT no requiere token (público).

**API**: `TokenResolver::from_config(&RuntimeConfig)`, `has_reniec()/has_pure()/has_perucris()`, `resolve_reniec_token()` (hint `PJVPIN_RENIEC_TOKEN`), `resolve_pure_api_key()` (hint `PJVPIN_PURE_API_KEY` o `PURE_API_KEY`), `resolve_perucris_api_key()` (hint `PJVPIN_PERUCRIS_API_KEY`). Errores: `AppError::ConfigurationError`. 6 tests.

## 10. `rbac.rs` — RBAC (177 líneas) + `access_control.rs`

`access_control.rs` (3 líneas): shim legacy que re-exporta helpers de rbac.

### `enum AppPermission` COMPLETO (23 variantes)
`DashboardView`, `InvestigadoresView`, `InvestigadoresManage`, `ProyectosView`, `ProyectosManage`, `PublicacionesView`, `PublicacionesManage`, `ReportesView`, `ReportesExport`, `GradosRead`, `GradosManage`, `GruposView`, `GruposManage`, `RecursosManage`, `CatalogosRead`, `CatalogosManage`, `UsuariosManage`, `GeoRead`, `OrgUnitsView`, `OrgUnitsManage`, `VocabulariosRead`, `VocabulariosManage`, `OcdeAssignManage`.

**Funciones**: `role_has_permission(role, perm) -> bool` (rol desconocido → false), `require_permission(state, window_label, perm) -> Result<Usuario>`, `get_session_actor_user`, `get_user_by_id`.

### Matriz RBAC completa (`role_has_permission`)

| Permiso | superuser | admin | operador | consulta | responsable_proyecto |
|---|---|---|---|---|---|
| DashboardView | ✅ | ✅ | ✅ | ✅ | ✅ |
| InvestigadoresView | ✅ | ✅ | ✅ | ✅ | ✅ |
| InvestigadoresManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| ProyectosView | ✅ | ✅ | ✅ | ✅ | ✅ |
| ProyectosManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| PublicacionesView | ✅ | ✅ | ✅ | ✅ | ✅ |
| PublicacionesManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| ReportesView | ✅ | ✅ | ✅ | ✅ | ✅ |
| ReportesExport | ✅ | ✅ | ✅ | ❌ | ❌ |
| GradosRead | ✅ | ✅ | ✅ | ❌ | ❌ |
| GradosManage | ✅ | ✅ | ❌ | ❌ | ❌ |
| GruposView | ✅ | ✅ | ✅ | ✅ | ✅ |
| GruposManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| RecursosManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| CatalogosRead | ✅ | ✅ | ✅ | ❌ | ❌ |
| CatalogosManage | ✅ | ✅ | ❌ | ❌ | ❌ |
| UsuariosManage | ✅ | ✅ | ❌ | ❌ | ❌ |
| GeoRead | ✅ | ✅ | ✅ | ✅ | ✅ |
| OrgUnitsView | ✅ | ✅ | ✅ | ✅ | ✅ |
| OrgUnitsManage | ✅ | ✅ | ✅ | ❌ | ❌ |
| VocabulariosRead | ✅ | ✅ | ✅ | ✅ | ✅ |
| VocabulariosManage | ✅ | ✅ | ❌ | ❌ | ❌ |
| OcdeAssignManage | ✅ | ✅ | ✅ | ❌ | ❌ |

**Regla superuser**: `=> true` incondicional. `consulta` y `responsable_proyecto` tienen matrices idénticas (solo lectura). Solo `superuser`/`admin` tienen GradosManage, CatalogosManage, UsuariosManage, VocabulariosManage.

## 11. `audit.rs` — Auditoría (121 líneas)

**Persistencia**: archivo de log plano append-only (JSON lines), NO MongoDB. Ruta: env `PJVPIN_AUDIT_LOG_PATH` o `current_dir()/pjvpin-audit.log` (fallback temp).

**Estructuras**: `AuditEntry` (usuarios: `{ timestamp RFC3339, actor_user_id, actor_username, actor_role, action, target_user_id, target_username, target_role, details }`) y `AuditGenericEntry` (resto: `{ timestamp, actor_user_id, actor_username, actor_role, action, target_type, target_id, details }`).

**API**: `write_user_audit(actor, action, target, details)` y `write_generic_audit(actor, action, target_type, target_id, details)`. Síncronas (`OpenOptions::append`), fallos → `tracing::error!` sin propagar. ~65 call-sites.

## 12. `time.rs` (16 líneas)

`now_ms() -> i64` (SystemTime/UNIX_EPOCH) y `now_rfc3339() -> String` (chrono::Utc). Helper unificado de timestamps.

## 13. `logging.rs` (12 líneas)

`init_logging()`: `tracing_subscriber::fmt()` con `EnvFilter` (default `info`), `with_span_events(FmtSpan::CLOSE)`, `with_target(true)`.

## 14. `data_loader.rs` (74 líneas)

Helpers para reportes/exportaciones: `resolve_grado_nombre`, `resolve_renacyt_nivel`, `join_or_none`; loaders async: `load_grados_map`, `load_investigadores_map`, `load_personas_map`, `load_proyectos_map`, `load_participaciones`, `load_grupos_map`, `load_catalogos_map` (clave `(tipo, codigo)`).

## 15. `macros.rs` — `impl_pivot_repository!` (190 líneas)

Macro declarativa que genera para un pivot M:N: `insert(db, &model)`, `$list_fn(db, parent_id) -> Vec<Model>`, `$delete_cascade_fn(db, parent_id) -> u64`, `delete(db, id)`, `ensure_indexes(db)` (UNIQUE compuesto `uniq_{error_label}` + índice simple `idx_{coll}_{field}`; drop_indexes idempotente previo). Validaciones FK fuera de la macro (en handlers). Usada por los 5 pivots.

## 16. `refs.rs` — Integridad referencial Rust-side (175 líneas)

Simula 3NF (RESTRICT/CASCADE) sobre MongoDB:
- `ensure_exists(db, collection, id)` — lookup por PK canónicas (`$or` sobre `_id` + 12 campos `id_*`).
- `ensure_active(db, collection, id)` — exige `activo=1` (acepta `i64` o `bool` en BSON).
- `ensure_vocab_active(db, esquema, codigo_skos)` — lookup en `catalogos`.
- `assert_not_referenced(db, target_collection, target_id, referencing_collections)` — ON DELETE RESTRICT: count_documents; si >0 → `AppError::ReferentialIntegrity`.

## 17. `hierarchy.rs` — Jerarquías autoreferenciales (109 líneas)

`assert_not_self_parent(child_id, parent_id)` y `assert_no_cycle(db, collection, id, parent_field)` (asciende por `parent_field` con `MAX_ASCENT_DEPTH = 10_000`). Usado por `org_units` y financiamientos jerárquicos.

## 18. `defaults.rs` — Single source of truth (79 líneas)

| Constante | Valor |
|---|---|
| `RENIEC_API_BASE_URL` | `https://api.decolecta.com/v1` |
| `RENACYT_API_BASE_URL` | `https://renacyt.concytec.gob.pe/renacyt-backend` |
| `RENACYT_FICHA_BASE_URL` | `https://servicio-renacyt.concytec.gob.pe/ficha-renacyt/` |
| `RENACYT_ACTO_VERSION` | `2021` |
| `PURE_API_BASE_URL` | `https://pure.unf.edu.pe/ws/api` |
| `PERUCRIS_API_BASE_URL` | `https://perucris.example.org/api` (placeholder ingesta) |
| `PERUCRIS_PUBLIC_API_BASE_URL` | `https://rest.perucris.pe/server/api` (HAL público) |
| `DEFAULT_MONGODB_DB` | `pjvpin` |
| `DEFAULT_MONGODB_MAX/MIN_POOL_SIZE` | `10` / `1` |
| `RENIEC_TEST_DNI` | `00000000` |
| `RENACYT_TEST_CTI_VITAE` / `ACTO_VERSION` | `80203` / `2021` |
| `VOCAB_CONCYTEC_VERSION` | `2026-08-12-alpha` |
| Pure Master List | `PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID="UNF001"`, `VISIBILITY="public"`, `EMPLOYED_AS="academic"`, `STAFF_TYPE="academic"`, `START_DATE="2025-06-02"`, `EXTERNALLY_AUTH="yes"`, `NEW_PERSON_PREFIX="PJV-"` |

## 19. `pagination.rs` (10 líneas)

`PaginatedResult<T> { items, total: u64, page: u32, limit: u32, total_pages: u32 }`.

## 20. `vocab_mapper.rs` — Mappers SKOS CONCYTEC (253 líneas)

Frontera datos internos ↔ `concytec_terminos`; no se persisten, se aplican en capa DTO al exportar. Constantes: tipos de documento, roles de participación (`INVESTIGADOR_PRINCIPAL`, `CO_INVESTIGADOR`, `TESISTA`, `ASISTENTE_INVESTIGACION`, `ASISTENTE_ADMINISTRATIVO`), roles de org unit en proyecto (`EJECUTORA/CO_EJECUTORA/PATROCINADORA/COLABORADORA`), tipos de patente, cuartiles Q1-Q4, `DOMINIO_ORIGEN_MANUAL/PURE/PERUCRIS`, 14 tipos de publicación, `acceso_abierto`. Validadores puros: `is_allowed_publication_tipo`, `is_cuartil_valor`, `is_iso_4217`, `is_iso_639_1`; mappers: `genero_to_skos`, `naturaleza_to_skos`. 5 tests.

## 21. `external/` — Clientes HTTP y servicios externos

### 21.1 `reniec_client.rs` (163 L)
- **Base**: `https://api.decolecta.com/v1`. **Endpoint**: `GET {base}/reniec/dni?numero={DNI}`.
- **Headers**: `Authorization: Bearer {token}` + JSON. **Env**: `PJVPIN_RENIEC_TOKEN` (TokenResolver).
- **Wire**: `DecolectaDniResponse { first_name, first_last_name, second_last_name, full_name, document_number }` (snake_case) → `ReniecDniLookupResult` (camelCase IPC).
- Funciones: `consultar_dni(tokens, base, numero)`, `consultar_dni_anon(token, base, numero)`. 400/404 → "No se encontraron datos válidos". **Sin timeout explícito ni circuit breaker** (el breaker está en `investigadores/import.rs`). 5 tests.

### 21.2 `renacyt_client.rs` (756 L) — público, sin auth
- **Endpoints**:
  - `GET {base}/postulante/obtenerDatosPostulante/{id}`
  - `GET {base}/actoRegistral/obtenerActoRegistralActivoCtiVitae/{acto_version}/{id}`
  - `GET {ficha_base_url}?idInvestigador={id}` → HTML scrapeado (fechas `%d/%m/%Y`)
  - `GET {base}/usuario/obtenerInformacionCriteriosFiltroCc/{solicitud_id}` → formaciones
  - `POST {base}/actoRegistral/obtenerActosRegistralesActivos/reglamento/{acto}/pagina/1/numeroRegistros/10` (filtro por DNI) → `buscar_por_dni`
  - `GET {base}/actoRegistral/obtenerConstanciaReporteActividad/{codigo}` → PDF bytes (timeout 30 s, valida Content-Type y ≥1024 bytes)
- **Env**: `PJVPIN_RENACYT_API_BASE_URL`, `PJVPIN_RENACYT_ACTO_VERSION`, `PJVPIN_RENACYT_FICHA_BASE_URL`. 8 tests (3 funcionales con skip sin red).

### 21.3 `pure_client.rs` (556 L)
- **Endpoints**: `POST {base}/research-outputs/search` (paginado 50), `POST {base}/persons/search` (size 5, resolver UUID por Scopus), `GET {base}/persons?size=100&offset={n}` (mapeo completo DNI→pure_person_id).
- **Headers**: `api-key: {key}`. 403 → `ConfigurationError` con hint de rol Pure.
- **Env**: `PJVPIN_PURE_API_KEY` (o legacy `PURE_API_KEY`).
- **Salida**: `FetchedPublication { pure_uuid, titulo, tipo_publicacion, doi, anio_publicacion, autores_json, estado_publicacion, journal_titulo, issn }`. Structs Deserialize defensivos con defaults. 3 tests.

### 21.4 `perucris_client.rs` (124 L) — push CERIF
- **Endpoint**: `POST {base}/cerif/ingest` con payload `pjvpin/cerif-json/0.1`. **Headers**: `api-key`.
- `push_cerif(tokens, api_base_url, payload) -> Result<u16>`. 401 → key inválida; 403 → sin permisos. 1 test.

### 21.5 `perucris_validator.rs` (346 L) — HAL público (lectura, sin key)
- **Base**: `https://rest.perucris.pe/server/api`. **Endpoints**: `GET {base}/discover/search/objects?query={q}&dsoType=ITEM&size={n}`, `GET {base}/dso/find?uuid={uuid}`.
- **Headers**: `User-Agent: PJVPIN-Validator/0.1`. **Timeout**: 15 s. Structs: `PeruCrisHit { uuid, handle, last_modified, name, metadata }`, `PeruCrisMetadata` con `first_value(key)` y `entity_type()`. 2 tests.

### 21.6 `perucris_service.rs` (96 L)
`enviar_a_perucris(state)`: construye `CerifDocument` (scope Todo), serializa, `push_cerif`. `PeruCrisPushResult` con totales por entidad.

### 21.7 `perucris_validation_service.rs` (579 L)
`validar_sincronizacion(state, scope)`: valida las 5 entidades CERIF contra el HAL público (orgunit por RUC>ROR>ISNI o UUID; persona por DNI primero con fallback ORCID; proyecto por scope; publicación por DOI con fallback título; patente no validable). Persiste reporte en `sync_reportes`. 6 tests.

### 21.8 `perucris_importer.rs` (592 L)
`importar_proyectos_unf` (scope `RELATION.OrgUnit.projects`, UUID institucional hardcodeado, dedupe por `perucris_uuid` + título normalizado, id determinístico `proj-perucris-{fnv1a64_hex32}`) e `importar_publicaciones_unf` (pasada dual: Phase A por RUC, Phase B por DNI por investigador + vinculación pivot `publicacion_autores` idempotente).

### 21.9 `pure_service.rs` (481 L)
`sync_publicaciones(state, investigador_id)`: exige `renacyt_scopus_author_id`, resuelve UUID por Scopus, descarga outputs, upsert por `pure_uuid` (`dominio_origen="PURE"`), sincroniza pivot autores (delete_for + reinsert; resuelve personas por `nombre_completo` normalizado). `sincronizar_pure_person_ids`: rellena `pure_person_id` solo si vacío. Mapper `map_pure_tipo` (EN → CERIF ES). 5 tests.

### 21.10 `pure_diff_service.rs` (571 L)
Diff read-only doble vía contra Pure: `diff_publicaciones` (match por `pure_uuid`, fallback DOI) y `diff_personas` (match por `pure_person_id`, fallback DNI). Persiste en `sync_reportes` (`PureDiff`). `adoptable` = SoloLocal con pure_uuid. 8 tests.

### 21.11 `pure_cmd.rs` (60 L) / `perucris_cmd.rs` (132 L)
Commands Tauri de Pure (3) y PeruCRIS (5) — ver [01-endpoints-ipc.md](./01-endpoints-ipc.md) §2.13-2.14.

## 22. `geo/` — Ubigeo INEI

`seed.rs` (104 L): dataset oficial INEI embebido `include_str!("data/ubigeo_inei.json")` — 191 055 bytes, 2 113 registros (25 deptos + 196 provincias + 1 892 distritos). `seed_ubigeos_if_empty(db)` + `reseed_ubigeos(db)`. 2 tests.

## 23. `lib.rs` — Setup (creación de AppState)

1. Ruta config: `app_config_dir()` → fallback `app_data_dir()` → fallback temp + `pjvpin.config.json`.
2. `.env` del proyecto: `./.env` o `../.env`.
3. `load_runtime_config(...)`.
4. Si hay URI: `validate_database_config` → `init_mongo` (block_on) → seeds: `seed_catalogos`, `seed_vocabularios_concytec_if_empty`, `seed_ubigeos_if_empty`, `seed_grados_if_empty`, `seed_org_units_unf_if_empty`. (Seed automático de investigadores ELIMINADO → flujo manual `importar_investigadores`.)
5. Sin URI: `mongo = None` → modo wizard.
6. `PJVPIN_RESET_DEV` (debug): drop 17 colecciones + re-seed.
7. `app.manage(AppState::new(...))` — construye `TokenResolver` desde RuntimeConfig.
8. `invoke_handler` registra los 155 comandos.

## 24. Notas de cierre

- **Circuit breaker**: solo RENIEC (en `investigadores/import.rs`, fuera de shared). Timeouts explícitos solo en constancia RENACYT (30 s) y PeruCRIS público (15 s).
- **Persistencia transversal**: sesiones/rate limiter/cache RENIEC 100% memoria; auditoría JSONL; config `pjvpin.config.json` plaintext + env; sync reports en `sync_reportes`.
- **Serde/IPC**: requests camelCase (`rename_all`); VOs sin serde; DTOs salida mayormente snake_case.
