# Censo de Features de Dominio — Backend Rust `src-tauri/src/`

> Alcance: 15 features de dominio + `shared/` (infraestructura). **Total: 33 266 líneas** en 126 archivos `.rs`.

## 1. Árbol de `src-tauri/src/` (líneas por archivo)

### Nivel raíz
| Archivo | Líneas | Rol |
|---|---|---|
| `lib.rs` | 381 | Entry point Tauri: `run()`; declara los 15 módulos feature + `shared`; setup (config, MongoDB, seeds en primer arranque, `PJVPIN_RESET_DEV`); registro de los 155 comandos `#[tauri::command]` |
| `main.rs` | 6 | Bootstrap: `pjvpin_lib::run()` |

### Features (15 carpetas)
```
catalogos/       1949   eventos/   541   geo/        488   grados/   718
grupos/           429   investigadores/ 3903   ocde/    484   org_units/ 1531
personas/         503   proyectos/ 3628   publicaciones/ 1587   recursos/ 2412
reportes/        3517   seguridad/  378   usuarios/  1933
```

### `shared/` (infraestructura transversal) — 8 878 líneas, 27 archivos
```
access_control.rs (3)      audit.rs (121)       config.rs (410)
config_validator.rs (67)   config_wizard.rs (468)  config_wizard_tests.rs (172)
data_loader.rs (74)        db.rs (569)          defaults.rs (79)
dni.rs (153)               doi.rs (149)         error.rs (156)
hierarchy.rs (109)         logging.rs (12)      macros.rs (190)
orcid.rs (218)             pagination.rs (10)   rbac.rs (177) + rbac_tests.rs (177)
rate_limiter_tests.rs (57) refs.rs (175)        state.rs (298)
time.rs (16)               tokens.rs (193)      vocab_mapper.rs (253)
external/ (13 archivos, ~3 600 líneas):
  reniec_client (163), renacyt_client (756), pure_client (556), pure_service (481),
  pure_cmd (60), pure_diff_service (571), perucris_client (124), perucris_cmd (132),
  perucris_service (96), perucris_importer (592), perucris_validator (346),
  perucris_validation_dto (73), perucris_validation_service (579)
```

## 2. Features — detalle por módulo

### catalogos (1 949 líneas)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 9 | Declaraciones |
| models.rs | 131 | `CatalogoItem` (dominio) |
| dto.rs | 122 | `CatalogoItemDoc` (BSON), `CatalogoItemDto`, `CreateCatalogoRequest`, `EliminarCatalogoResultadoDto` |
| repository.rs | 333 | Persistencia + `ensure_indexes` |
| handlers.rs | 158 | Lógica de negocio |
| commands.rs | 97 | Comandos Tauri (CRUD catálogos + vocabularios SKOS) |
| seed_vocabularios.rs | 994 | Seed SKOS CONCYTEC (ocde_ford, etc.) |
| dto_tests.rs | 105 | 5 tests |

- **Colección**: `catalogos`
- **Índices** (`ensure_indexes`): UNIQUE `(tipo, codigo)`; UNIQUE partial `(esquema, codigo_skos)` `$type:string`; `(esquema, padre_codigo)`
- **Deps**: `shared::{error, rbac, state}`; `personas::dto`
- **Tests**: 5

### eventos (541)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs / dto.rs / models.rs / repository.rs | 8/76/89/62/91/167 | CRUD eventos académicos |
| dto_tests.rs | 48 | 2 tests |

- **Structs**: `EventoAcademico` (model), `ParticipanteEvento` (embebido), `EventoAcademicoDto`, `CreateEventoRequest`, `UpdateEventoRequest`
- **Colección**: `eventos_academicos`
- **Índices** (en `shared/db.rs`): UNIQUE `id_evento`; `participantes.investigador_id`
- **Deps**: `shared::{error, rbac, state, time}`
- **Tests**: 2

### geo (488)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs / dto.rs / models.rs | 29/37/36/29/39 | Ubigeo INEI |
| repository.rs | 174 | Persistencia + `ensure_indexes` + FK helper |
| seed.rs | 104 | Dataset INEI embebido (25 deptos + 196 prov + ~1 892 distritos) |
| dto_tests.rs | 40 | 2 tests |

- **Structs**: `Ubigeo` (model, `validate_codigo`), `UbigeoDoc`, `UbigeoDto`
- **Colección**: `ubigeos`
- **Índices**: UNIQUE `codigo`; `(departamento, provincia, distrito)`
- **Deps**: `shared::{error, rbac, state, time}`
- **Tests**: 2

### grados (718)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs / models.rs | 9/71/98/133 | CRUD grados académicos |
| repository.rs | 163 | Persistencia |
| seed.rs | 105 | Seed grados |
| dto.rs / dto_tests.rs | 74/65 | 4 tests |

- **Structs**: `GradoAcademico` (model), `GradoAcademicoDoc`, `GradoAcademicoDto`, `CreateGradoRequest`
- **Colecciones**: `grados` (rw); `investigadores` (solo lectura, guard de borrado)
- **Índices**: UNIQUE `id_grado`; UNIQUE `nombre`
- **Deps**: `shared::{error, pagination, rbac, state}`
- **Tests**: 4

### grupos (429)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs / models.rs / repository.rs | 8/56/78/58/125 | CRUD grupos de investigación |
| dto.rs / dto_tests.rs | 38/66 | 4 tests |

- **Structs**: `GrupoInvestigacion` (model), `GrupoInvestigacionDto`, `Create/UpdateGrupoInvestigacionRequest`
- **Colección**: `grupos_investigacion`
- **Índices**: UNIQUE `id_grupo`; `coordinador_id`
- **Deps**: `shared::{error, rbac, state}`
- **Tests**: 4

### investigadores (3 903 — el más grande)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 10 | Declaraciones |
| models.rs | 336 | `Investigador` (dominio) |
| dto.rs | 247 | `InvestigadorDto`, `InvestigadorDetalleDto`, `Create/UpdateInvestigadorRequest`, `ReniecDniLookupResult`, `RenacytLookupResult`, `SyncPublicacionesResult`, etc. |
| repository.rs | 560 | Persistencia (col. `investigadores`, `participaciones`, `grados`) |
| handlers.rs | 471 | Lógica de negocio |
| commands.rs | 287 | Comandos Tauri (18) |
| import.rs | 828 | **Importación por DNI** (pipeline RENIEC → PeruCRIS → Pure → RENACYT; conc. 5, circuit breaker RENIEC) |
| kardex.rs | 831 | Timeline RENACYT (col. `renacyt_kardex`) + `ensure_indexes` |
| tests.rs | 333 | 14 tests |

- **Colecciones**: `investigadores` (rw), `personas` (import), `grados` (read, fallback), `participaciones` (read), `renacyt_kardex` (rw, en kardex.rs)
- **Índices**: `investigadores` → UNIQUE `id_investigador`, UNIQUE `persona_id`, `renacyt_id_investigador`, UNIQUE partial `renacyt_codigo_registro`, UNIQUE partial `renacyt_orcid`; `renacyt_kardex` → `(investigador_id, fecha_evento: -1)`
- **Deps**: `grados::dto`; `personas::{models, dto, repository}`; `shared::{config, data_loader, dni, error, external(reniec, renacyt), orcid, pagination, rbac, state, time, vocab_mapper}`
- **Tests**: 14

### ocde (484)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 23 | Declaraciones + `pub const COLLECTION` |
| models.rs / dto.rs / handlers.rs / commands.rs | 68/45/69/59 | Pivot polimórfico OCDE |
| repository.rs | 131 | Persistencia + `ensure_indexes` |
| tests.rs | 89 | 7 tests |

- **Structs**: `EntidadCampoOcde` (model), `EntityOcdeFieldDoc`
- **Colección**: `entity_ocde_fields`
- **Índices**: UNIQUE `(entity_type, entity_id, ocde_codigo)`; `(entity_type, entity_id)`; `(ocde_codigo)`
- **Deps**: `shared::{error, rbac, refs, state, vocab_mapper}`
- **Tests**: 7

### org_units (1 531)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs | 23/54/139 | CRUD unidades organizativas |
| models.rs | 382 | `OrgUnit` (jerarquía `parent_id`) |
| dto.rs | 240 | `OrgUnitDoc`, `OrgUnitDto`, `Create/UpdateOrgUnitRequest` |
| repository.rs | 367 | Persistencia + jerarquía (cycle/self-parent) + `ensure_indexes` |
| seed.rs | 224 | Seed org_units UNF |
| dto_tests.rs | 102 | 3 tests |

- **Colección**: `org_units`
- **Índices**: UNIQUE `id_org_unit`; UNIQUE partial `ruc` `$type:string`; `(parent_id, tipo_dependencia)`; `nombre`
- **Deps**: `shared::{error, refs, state, time}`
- **Tests**: 3

### personas (503)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs | 8/14/29 | Identidad canónica |
| models.rs | 88 | `Persona` (dni, nombres, apellidos, `nombre_completo` compuesto) |
| dto.rs | 83 | `PersonaDto`, `Create/UpdatePersonaRequest`, `PersonaDeUsuarioDto` |
| repository.rs | 235 | Persistencia (búsqueda por DNI) |
| dto_tests.rs | 46 | 2 tests |

- **Colección**: `personas` — **sin `ensure_indexes` propio** (no aparece en `shared/db.rs`)
- **Deps**: `shared::{dni, error, rbac, state, time}`; `usuarios::repository`
- **Tests**: 2

### proyectos (3 628)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 14 | Declaraciones |
| models.rs | 489 | `Proyecto`, `ParticipacionRecord` |
| dto.rs | 382 | `ProyectoDto`, `Create/UpdateProyectoConParticipantesRequest`, DTOs exportación/KPIs |
| repository.rs | 486 | Persistencia (transaccional en borrado) |
| repository_queries.rs | 186 | Queries de listado |
| repository_stats.rs | 181 | KPIs/estadísticas |
| export_queries.rs | 625 | Queries de exportación (multi-colección) |
| repository_export.rs | 5 | Re-export |
| handlers.rs / commands.rs | 325/197 | Lógica + comandos Tauri |
| proyecto_organizaciones.rs | 242 | Pivot M:N (model+doc+macro, 8 tests inline) |
| proyecto_financiamientos.rs | 193 | Pivot M:N (model+doc+macro, 4 tests inline) |
| tests.rs | 303 | 17 tests |

- **Colecciones**: `proyectos` (rw), `participaciones` (rw) + pivots `proyecto_organizaciones`, `proyecto_financiamientos` + lecturas en export_queries: `investigadores`, `patentes`, `equipamientos`, `financiamientos`, `publicaciones_cientificas`, `org_units`, `patente_inventores`, `publicacion_autores`
- **Índices**: `proyectos` → UNIQUE `id_proyecto`, UNIQUE partial `codigo`; `participaciones` → `id_proyecto`, `id_investigador`, UNIQUE `(id_proyecto, id_investigador)`; pivots inline UNIQUE + duplicados vía macro (dedup benigno documentado)
- **Deps**: `catalogos::models`; `investigadores::{dto, models, repository}`; `recursos::{dto, models}`; `shared::{data_loader, error, pagination, rbac, state, time, vocab_mapper}`
- **Tests**: 17 + 8 + 4 = 29

### publicaciones (1 587)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs / commands.rs / handlers.rs | 9/153/198 | CRUD publicaciones científicas + software |
| models.rs | 463 | `PublicacionCientifica` |
| dto.rs | 188 | `PublicacionCientificaDto`, `Create/UpdatePublicacionRequest` |
| repository.rs | 324 | Persistencia |
| autores.rs | 173 | Pivot M:N `publicacion_autores` (model+doc+macro, 3 tests inline) |
| dto_tests.rs | 79 | 3 tests |

- **Colecciones**: `publicaciones_cientificas` (rw), `publicacion_autores` (rw vía macro)
- **Índices**: `publicaciones_cientificas` → UNIQUE `id_publicacion`, `anio`, UNIQUE partial `doi`, UNIQUE partial `pure_uuid`; `publicacion_autores` → UNIQUE `(id_publicacion, id_persona)`, `(id_persona)`, `(id_org_unit_afiliacion)` + macro
- **Deps**: `shared::{data_loader, error, rbac, state, time, vocab_mapper}`
- **Tests**: 3 + 3 = 6

### recursos (2 412)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 15 | Declaraciones |
| models.rs | 3 | Re-export de los 3 modelos |
| model_patente.rs / model_equipamiento.rs / model_financiamiento.rs | 250/227/270 | `Patente`, `Equipamiento`, `Financiamiento` (dominio) |
| dto.rs | 266 | DTOs + Create/Update requests |
| repository.rs | 89 | 3 invocaciones de `impl_resource_repository!` (macro CRUD soft-delete) |
| macros.rs | 139 | Macro `impl_resource_repository!` |
| handlers.rs / commands.rs | 454/255 | Lógica + comandos Tauri (21) |
| patente_inventores.rs | 149 | Pivot M:N (3 tests inline) |
| patente_titulares.rs | 214 | Pivot M:N polimórfico (4 tests inline) |
| dto_tests.rs | 81 | 4 tests |

- **Colecciones**: `patentes`, `equipamientos`, `financiamientos` + pivots `patente_inventores`, `patente_titulares`
- **Índices**: `patentes` → `proyecto_id`, UNIQUE partial `numero_patente`; `equipamientos` → `proyecto_id`, UNIQUE partial `codigo_institucional`; `financiamientos` → `proyecto_id`; `patente_inventores` → UNIQUE `(id_patente, id_persona)` + `(id_persona)`; `patente_titulares` → UNIQUE sparse `(id_patente, holder_type, id_org_unit)` + UNIQUE sparse `(id_patente, holder_type, id_persona)` (decisión documentada: no migrar a partial por polimorfismo)
- **Deps**: `shared::{error, rbac, state, vocab_mapper}`; `usuarios::models`
- **Tests**: 4 + 3 + 4 = 11

### reportes (3 517)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 13 | Declaraciones |
| dto.rs | 469 | ~25 structs (ReporteProyecto/InvestigadorIntegral, PureMasterlistData, etc.) |
| cerif.rs | 1 145 | Exportador CERIF JSON (B2) |
| entity_service.rs | 29 | Orquestador reportes integrales |
| repository_export.rs | 28 | Exportación masiva |
| repository_investigador.rs / repository_proyecto.rs | 368/362 | Queries multi-colección |
| repository_pure_masterlist.rs | 265 | Masterlist Pure |
| sync_reportes.rs | 301 | Historial sync (col. `sync_reportes`) + `ensure_indexes` |
| handlers.rs / commands.rs | 289/183 | Lógica + comandos Tauri |
| dto_tests.rs | 65 | 2 tests |

- **Colecciones (lectura amplia)**: `proyectos`, `participaciones`, `org_units`, `financiamientos`, `patentes`, `publicaciones_cientificas`, `equipamientos`, `proyecto_financiamientos`, `patente_inventores`, `publicacion_autores`, `investigadores`, `personas`; **escritura**: `sync_reportes`
- **Índices**: `sync_reportes` → `(tipo, ejecutado_at: -1)`
- **Deps**: cruza 7 features (mayor acoplamiento): catalogos, investigadores, org_units, personas, proyectos, publicaciones, recursos + shared
- **Tests**: 2

### seguridad (378) — fachada IPC delgada (sin handlers/models/repository, por diseño)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 27 | Documentación de diseño |
| commands.rs | 250 | 12 comandos: `get_security_status`, `get_setup_guide`, `get_security_recommendations`, `wizard_*` (9) |
| dto.rs | 37 | `SecurityStatus`, `ConfigurationGuide`, `SecurityRecommendations`, etc. |
| dto_tests.rs | 64 | 3 tests |

- **Colección**: `usuarios` (solo lectura, `wizard_has_config` cuenta registros)
- **Deps**: `shared::{config, defaults, error, external::reniec_client, state, tokens}`
- **Tests**: 3

### usuarios (1 933)
| Archivo | Líneas | Rol |
|---|---|---|
| mod.rs | 14 | Declaraciones |
| models.rs | 404 | `Usuario`, `UsuarioConPassword` (Argon2) |
| dto.rs | 154 | `UsuarioDoc`, `UsuarioDto`, `AuthStatusDto`, `Create/Bootstrap/Update/LoginUsuarioRequest` |
| repository.rs | 6 | Re-export de los 4 sub-repos |
| repository_auth.rs | 112 | Login/logout/auth status |
| repository_bootstrap.rs | 188 | `bootstrap_admin` (wizard) |
| repository_crud.rs | 230 | CRUD usuarios |
| repository_mappers.rs | 153 | Mappers Document ↔ Dto ↔ Model |
| validations.rs | 86 | Guards invariantes superuser |
| handlers.rs / commands.rs | 243/133 | Lógica + 12 comandos Tauri |
| dto_tests.rs / validations_tests.rs | 78/132 | 3 + 14 tests |

- **Colección**: `usuarios`
- **Índices**: UNIQUE `id_usuario`; UNIQUE `username`
- **Deps**: `investigadores::dto`; `personas::{dto, repository}`; `shared::{defaults, dni, error, pagination, rbac, state}`
- **Tests**: 17

## 3. Pivots M:N vía `impl_pivot_repository!` (5, en `shared/macros.rs`)

| Pivot | Archivo | Colección | Uniqueness (macro) | Tests inline |
|---|---|---|---|---|
| ProyectoOrganizacion | proyectos/proyecto_organizaciones.rs | proyecto_organizaciones | `id_proyecto, id_org_unit, rol` | 8 |
| ProyectoFinanciamiento | proyectos/proyecto_financiamientos.rs | proyecto_financiamientos | `id_proyecto, id_financiamiento` | 4 |
| PatenteInventor | recursos/patente_inventores.rs | patente_inventores | `id_patente, id_persona` | 3 |
| PatenteTitular | recursos/patente_titulares.rs | patente_titulares | `id_patente, holder_type, id_org_unit, id_persona` | 4 |
| PublicacionAutor | publicaciones/autores.rs | publicacion_autores | `id_publicacion, id_persona` | 3 |

**Nota**: los 5 pivots tienen índices inline en `shared/db.rs` **y** los mismos creados por la macro — dedup benigno documentado (misma clave, distinto nombre).

## 4. Matriz feature → colecciones MongoDB (23 colecciones)

| Colección | Escribe | Lee |
|---|---|---|
| `catalogos` | catalogos | catalogos, shared::refs |
| `entity_ocde_fields` | ocde | ocde, shared::db |
| `equipamientos` | recursos | recursos, proyectos (export), reportes |
| `eventos_academicos` | eventos | eventos |
| `financiamientos` | recursos | recursos, proyectos (export), reportes (cerif), shared::db |
| `grados` | grados, investigadores (import fallback) | grados, investigadores, shared::db |
| `grupos_investigacion` | grupos | grupos, shared::db |
| `investigadores` | investigadores, shared::external (pure_service) | investigadores, grados (guard), proyectos, reportes, perucris_importer |
| `org_units` | org_units, shared::external (perucris_importer) | org_units, proyectos (export), reportes (cerif) |
| `participaciones` | proyectos | proyectos, investigadores, reportes (cerif) |
| `patente_inventores` | recursos (macro) | recursos, proyectos (export), reportes |
| `patente_titulares` | recursos (macro) | recursos |
| `patentes` | recursos | recursos, proyectos (export), reportes (cerif) |
| `personas` | personas, investigadores (import), shared::external (perucris_importer) | personas, investigadores, reportes, perucris_importer |
| `proyecto_financiamientos` | proyectos (macro) | proyectos, reportes |
| `proyecto_organizaciones` | proyectos (macro) | proyectos |
| `proyectos` | proyectos, shared::external (perucris_importer) | proyectos, reportes (cerif), shared::db |
| `publicacion_autores` | publicaciones (macro), shared::external (perucris_importer) | publicaciones, proyectos (export), reportes |
| `publicaciones_cientificas` | publicaciones, shared::external (pure_service, perucris_importer) | publicaciones, proyectos (export), reportes |
| `renacyt_kardex` | investigadores (kardex.rs) | investigadores |
| `sync_reportes` | reportes (sync_reportes.rs) | reportes |
| `ubigeos` | geo (seed) | geo, org_units |
| `usuarios` | usuarios | usuarios, seguridad (wizard_has_config) |

**Sin colección Mongo para sesiones**: `SessionStore` y `LoginRateLimiter` viven en memoria en `shared/state.rs`. La auditoría escribe a archivo JSONL (`PJVPIN_AUDIT_LOG_PATH`), no a Mongo.

## 5. Índices UNIQUE — resumen por colección

| Colección | Índices UNIQUE |
|---|---|
| grados | `id_grado`, `nombre` |
| investigadores | `id_investigador`, `persona_id`, partial `renacyt_codigo_registro`, partial `renacyt_orcid` |
| proyectos | `id_proyecto`, partial `codigo` |
| participaciones | `(id_proyecto, id_investigador)` |
| proyecto_organizaciones | `(id_proyecto, id_org_unit, rol)` |
| proyecto_financiamientos | `(id_proyecto, id_financiamiento)` |
| entity_ocde_fields | `(entity_type, entity_id, ocde_codigo)` |
| patente_inventores | `(id_patente, id_persona)` |
| patente_titulares | sparse `(id_patente, holder_type, id_org_unit)` + sparse `(id_patente, holder_type, id_persona)` |
| publicacion_autores | `(id_publicacion, id_persona)` |
| usuarios | `id_usuario`, `username` |
| patentes | partial `numero_patente` |
| equipamientos | partial `codigo_institucional` |
| ubigeos | `codigo` |
| grupos_investigacion | `id_grupo` |
| publicaciones_cientificas | `id_publicacion`, partial `doi`, partial `pure_uuid` |
| eventos_academicos | `id_evento` |
| catalogos | `(tipo, codigo)`, partial `(esquema, codigo_skos)` |
| org_units | `id_org_unit`, partial `ruc` |

> **Lección consolidada** (índices): cualquier índice `unique(true)` simple sobre campo `Option<T>` DEBE usar `partial_filter_expression(doc! { campo: { "$type": "string" } })`. Sparse NO es suficiente para índice simple sobre un solo campo nullable (E11000).

## 6. Tests por módulo (conteo `#[test]`)

| Módulo | Archivo | Tests |
|---|---|---|
| proyectos | tests.rs | 17 |
| investigadores | tests.rs | 14 |
| usuarios | validations_tests.rs | 14 |
| shared | rbac_tests.rs | 13 |
| ocde | tests.rs | 7 |
| shared | config_wizard_tests.rs | 6 |
| catalogos | dto_tests.rs | 5 |
| grados | dto_tests.rs | 4 |
| grupos | dto_tests.rs | 4 |
| recursos | dto_tests.rs | 4 |
| shared | rate_limiter_tests.rs | 4 (vía `#[tokio::test]`) |
| org_units | dto_tests.rs | 3 |
| publicaciones | dto_tests.rs | 3 |
| seguridad | dto_tests.rs | 3 |
| usuarios | dto_tests.rs | 3 |
| eventos | dto_tests.rs | 2 |
| geo | dto_tests.rs | 2 |
| personas | dto_tests.rs | 2 |
| reportes | dto_tests.rs | 2 |

**Pivots (inline)**: proyecto_organizaciones 8, proyecto_financiamientos 4, patente_titulares 4, patente_inventores 3, publicacion_autores 3. **Total: 117 tests**.

## 7. Ranking de líneas de código Rust por feature

| # | Feature | Líneas | % del total (33 266) |
|---|---|---|---|
| — | **shared/** (infra) | 8 878 | 26.7 % |
| 1 | investigadores | 3 903 | 11.7 % |
| 2 | proyectos | 3 628 | 10.9 % |
| 3 | reportes | 3 517 | 10.6 % |
| 4 | recursos | 2 412 | 7.3 % |
| 5 | catalogos | 1 949 | 5.9 % |
| 6 | usuarios | 1 933 | 5.8 % |
| 7 | publicaciones | 1 587 | 4.8 % |
| 8 | org_units | 1 531 | 4.6 % |
| 9 | grados | 718 | 2.2 % |
| 10 | eventos | 541 | 1.6 % |
| 11 | personas | 503 | 1.5 % |
| 12 | geo | 488 | 1.5 % |
| 13 | ocde | 484 | 1.5 % |
| 14 | grupos | 429 | 1.3 % |
| 15 | seguridad | 378 | 1.1 % |
| — | lib.rs + main.rs | 387 | 1.2 % |

## 8. Observaciones estructurales

- **Módulos de dominio reales (15)**: no existen features separadas `dashboard`, `auth` ni `config_wizard`: los KPIs viven en `reportes`, el auth/sesión en `usuarios`, y el wizard en `shared/config_wizard.rs` expuesto vía `seguridad::commands`.
- **Patrón hexagonal** consistente en 14 de 15 features (`models.rs` sin serde + `dto.rs` con `*Doc`/`*Request` + `repository.rs`); `seguridad` es la única excepción deliberada (fachada IPC delgada).
- **Dependencias cross-feature más relevantes**: `investigadores → personas`; `proyectos → investigadores + recursos + catalogos`; `reportes → 7 features` (mayor acoplamiento); `personas → usuarios`; `recursos → usuarios`.
- **Macros DRY**: `shared::macros::impl_pivot_repository!` (5 pivots M:N) + `recursos::macros::impl_resource_repository!` (3 recursos × 7 funciones CRUD).
- **Setup en `lib.rs`**: config multi-fuente → `init_mongo` (si hay URI) → seeds (catalogos, vocabularios, ubigeos, grados, org_units) → `PJVPIN_RESET_DEV` (debug only, dropea 17 colecciones) → `app.manage(AppState)`. Sin URI → modo wizard (`mongo: None`).
