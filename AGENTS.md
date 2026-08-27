# PJVPI — Agentes de Desarrollo

## Identidad del Proyecto

Sistema de escritorio para gestión de investigación universitaria (investigadores, proyectos, grados
académicos, grupos de investigación, reportes). Construido con Tauri v2 + React + Rust.

- **Nombre**: PJVPI (VPIN/UNF)
- **Tipo**: Desktop app (Windows)
- **Versión**: 0.1.0 — etapa de construcción/consolidación
- **Identificador**: `com.vpin.pjvpin`

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Shell | Tauri v2 | 2.10.x |
| Frontend | React + TypeScript | 19.1 / 6.0 |
| Bundler | Vite (Rolldown) | 8.2 |
| Backend | Rust (edition 2021) | 1.85+ |
| Base de datos | MongoDB Atlas | Driver 3.5 |
| Diseño | DESIGN.md (Google format) | alpha |
| Auth | Argon2 (password hashing) | 0.5.3 |
| HTTP | reqwest (rustls-tls) | 0.12 |
| Gráficos | recharts | 3.8 |
| PDF | @react-pdf/renderer | 4.4 |
| Excel | exceljs | 4.4 |
| Iconos | lucide-react | 1.7 |
| Tooltips | @floating-ui/react | 0.27 |

---

## Estructura del Proyecto (Screaming Architecture)

```
pjvpin/
├── src/                          # Frontend React
│   ├── features/                 # Módulos de dominio (vertical slicing)
│   │   ├── auth/                 #   Login / primer arranque
│   │   ├── dashboard/            #   KPIs y gráficos
│   │   ├── investigadores/       #   CRUD investigadores + RENIEC/RENACYT/Pure
│   │   ├── proyectos/            #   CRUD proyectos + participantes + recursos
│   │   ├── grupos/               #   Grupos de investigación
│   │   ├── reportes/             #   Exportación Excel/PDF
│   │   └── configuracion/        #   Grados académicos + Usuarios
│   ├── shared/                   # Componentes transversales
│   │   ├── auth/                 #   RBAC (roles, permisos)
│   │   ├── ui/                   #   AppIcon, Skeleton, TableActionButton
│   │   ├── forms/                #   FormModal, FormInput, FormSelect, FieldHelpTooltip
│   │   ├── overlays/             #   ConfirmDialog, FloatingTooltip
│   │   ├── navigation/           #   TabNavigation
│   │   ├── feedback/             #   ToastContainer
│   │   ├── hooks/                #   useStableFetch, useRefreshToast
│   │   └── utils/                #   renacyt, saveDesktopFile
│   ├── services/                 # Capa de API (Tauri IPC wrappers)
│   │   └── tauri/                #   client, error, types, auth, investigadores, proyectos, ...
│   └── hooks/                    # Barrel re-exports → features/*/hooks + shared/hooks
│
├── src-tauri/                    # Backend Rust
│   └── src/
│       ├── shared/               # Infraestructura transversal
│       │   ├── error.rs          #   AppError, sanitize_external_detail
│       │   ├── state.rs          #   AppState, SessionStore
│       │   ├── config.rs         #   Carga de configuración multi-fuente
│       │   ├── db.rs             #   Conexión MongoDB con pool configurable
│       │   ├── dni.rs            #   Value Object Dni (8 dígitos + trim)
│       │   ├── tokens.rs         #   TokenResolver para credenciales externas
│       │   ├── access_control.rs #   Handlers de dominio (delega RBAC a rbac.rs)
│       │   ├── rbac.rs           #   RBAC: roles, permisos, autorización
│       │   ├── audit.rs          #   Auditoría de operaciones
│       │   ├── time.rs           #   Helper de timestamps unificado
│       │   ├── data_loader.rs    #   Helpers compartidos de carga (load_*_map)
│       │   ├── logging.rs        #   Structured logging via tracing
│       │   └── external/         #   Clientes HTTP a servicios externos
│       ├── catalogos/            # Feature: Catálogos parametrizables (tipos, estados, monedas)
│       ├── investigadores/             # Feature: Docentes
│       ├── proyectos/            # Feature: Proyectos + Participantes
│       ├── recursos/             # Feature: Patentes/Productos/Equipamientos/Financiamientos (repo via macros)
│       ├── reportes/             # Feature: Estadísticas + Exportación
│       └── seguridad/            # Feature: Status de seguridad + guías
│
├── scripts/                      # Scripts de build (PowerShell)
└── .agents/skills/               # Skills para agentes AI
```

---

## Principios de Arquitectura

### Design System

El diseño del frontend sigue el estándar [DESIGN.md](https://github.com/google-labs-code/design.md). El archivo `DESIGN.md` define tokens de diseño (colores, tipografía, espaciado, sombras, bordes) y guías de componentes. Todo cambio visual debe usar las CSS variables de `App.css` que corresponden a los tokens de DESIGN.md.

### Screaming Architecture
La estructura de directorios **grita** lo que la aplicación HACE, no qué frameworks usa.
Cada feature es un módulo autocontenido con sus propios modelos, comandos, servicios
y repositorio.

### Single Responsibility (SRP)
- **Un archivo = Una responsabilidad**
- `mongo_repo.rs` monolítico (1320 líneas) → dividido por feature
- Hooks de React → máximo 200 líneas, una sola entidad de negocio

### DRY (Don't Repeat Yourself)
- Helpers duplicados en exportaciones (Excel/PDF) → compartidos en `shared/utils/`
- Handlers de recursos casi idénticos → abstraídos en hook genérico

### KISS (Keep It Simple)
- Sin over-engineering: MongoDB como única BD es aceptable para v0.1.0
- Sin ORMs: queries directas al driver de MongoDB
- Sin state management libraries: `useState` + custom hooks

### DDD Value Objects (en shared/)
- **`Dni`** (`shared/dni.rs`): encapsula validación de DNI peruano (8 dígitos ASCII)
  + trim. Usado por `Persona::new`, `Usuario::new` (vía `build_usuario_with_password`),
  `ReniecCache`, `reniec_client`. Construir siempre vía `Dni::new(&str) -> Result<Self, AppError>`
  o `Dni::new_opt(Option<&str>) -> Result<Option<Self>, AppError>`.
- **`TokenResolver`** (`shared/tokens.rs`): acceso centralizado a credenciales externas
  (RENIEC token + Pure API key) con mensajes de error canónicos apuntando a las env vars.
  Construido una sola vez desde `RuntimeConfig` y guardado en `AppState.tokens`.

### Hexagonal / DTO separation
- Cada feature tiene `dto.rs` (serde, contrato IPC) + `models.rs` puro (sin serde, validando en `new()`).
- Repository convierte `Document` ↔ `Dto` ↔ `Model` con `try_from`/`From` traits.
- Handlers/commands convierten `Model → Dto` antes de cruzar al frontend.

---

## Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Vite dev server (puerto 1420)
npm run tauri:dev        # Tauri dev mode (ventana desktop)

# Calidad
npm run lint             # ESLint
npm run lint:fix         # ESLint --fix
npm run format           # Prettier --write
npm run typecheck        # tsc --noEmit
npm run check            # lint + typecheck

# Build
npm run build            # tsc + vite build
npm run tauri:build:exe  # Release .exe sin bundle
npm run tauri:build:installer  # NSIS installer completo

# Rust
cargo check              # Verificar compilación (desde src-tauri/)
cargo test               # Tests unitarios (desde src-tauri/)
cargo clippy             # Linter Rust
```

---

## Convenciones de Código

### TypeScript / React
- **Imports**: Usar alias `@/` → `./src/` (ej: `@/shared/ui/AppIcon`)
- **Componentes**: PascalCase, una exportación por archivo
- **Hooks**: `use` prefix, extraer lógica de negocio del JSX
- **Tipos**: Interfaces en `services/tauri/types.ts`, tipos locales en el feature
- **Manejo de errores**: Siempre `try/catch` con `getTauriErrorMessage(error)`
- **Lazy loading**: Features grandes con `React.lazy` + `Suspense` + skeleton fallback

### Rust
- **Módulos**: Un `mod.rs` por feature, exports públicos explícitos
- **Errores**: Siempre `Result<T, AppError>`, nunca `unwrap()` en producción
- **Nombres**: snake_case para funciones, CamelCase para tipos
- **Inter-systema serde con frontend**: Todo struct Rust usado como argumento de `#[tauri::command]` que reciba JSON desde el frontend DEBE llevar `#[serde(rename_all = "camelCase")]` cuando sus fields sean multi-word en snake_case. El frontend TS SIEMPRE envía keys en camelCase (idiomático). Sin este atributo, la deserialización falla con `missing field X` (o silenciosamente pierde datos si el field es `Option<T>` con `#[serde(default)]`). Ejemplos correctos: `WizardConfigRequest`, `BootstrapUsuarioRequest`, `CreateUsuarioRequest`. Excepciones (no requieren rename): structs con fields single-word (`nombre`, `descripcion`) o que el frontend ya envía en snake por convención interna.
- **Formato**: `rustfmt.toml` (100 chars, edition 2021, group_imports)
- **Dependencias**: Mínimas, evitar crates innecesarios
- **Timestamps**: Usar `shared::time::now_ms()` (unificado, basado en `std::time`)
- **Dead code**: Cero tolerancia a `#[allow(dead_code)]`. Todo código DEBE estar integrado y usado. Si una función no se usa, se elimina o se integra donde corresponde. Si un struct/field/método no se lee, se elimina o se usa. Ejemplos:
  - Funciones de repositorio no usadas → eliminarlas o integrarlas en handlers/service
  - Permisos no asignados → agregarlos a la matriz de roles que corresponda
  - Cachés no usados → integrarlos en el flujo de consulta externa
  - Campos redundantes → eliminarlos del struct
- **Seguridad**: Nunca hardcodear credenciales, URIs reales ni tokens en el código fuente. Usar `localhost` o placeholders vacíos en templates por defecto. Las credenciales reales solo en `.env` (gitignorado).

---

## Roles y Permisos (RBAC)

| Rol | Permisos |
|-----|----------|
| **superuser** | Todo (incluye gestión de usuarios, grados y catálogos). Rol único creado por el asistente de configuración. No se puede crear vía `crear_usuario`, no se puede degradar, no se puede desactivar/eliminar. |
| **admin** | Todo (incluye gestión de usuarios y grados) |
| **operador** | CRUD investigadores, proyectos, grupos, recursos, publicaciones + reportes export |
| **consulta** | Solo lectura: dashboard, investigadores, proyectos, publicaciones, reportes, grupos |
| **responsable_proyecto** | Solo lectura: dashboard, investigadores, proyectos, publicaciones, reportes, grupos |

### Invariantes del rol `superuser`

1. **Unicidad global**: solo puede existir **un** usuario con `rol="superuser"` y debe estar `activo=1`.
2. **Origen único**: el único flujo autorizado a crearlo es el asistente de configuración (`bootstrap_admin`), y solo cuando la colección `usuarios` esté vacía.
3. **No eliminable**: `desactivar_usuario` rechaza cualquier target con `rol="superuser"`.
4. **No escalable**: `crear_usuario` y `actualizar_usuario` rechazan cambiar el rol a `superuser` desde otro rol.
5. **No auto-degradable**: `actualizar_usuario` ya bloquea al usuario a cambiarse su propio rol.

Estas invariantes se aplican en `src-tauri/src/usuarios/validations.rs`
(guards puros) y se prueban en `src-tauri/src/usuarios/validations_tests.rs`.

---

## Identidad y Persona

Cada `Usuario` se vincula a una `Persona` (modelo canónico de identidad, ya
usado por `investigadores`). `Persona` almacena `dni`, `nombres`, `apellido_paterno`,
`apellido_materno` y `nombre_completo` (compuesto). El `Usuario` referencia a la
`Persona` por `persona_id` y desnormaliza `dni` y `nombre_completo` para display
eficiente (el repositorio repuebla desde `Persona` en cada lectura).

### Flujos de creación de usuario

- **Wizard (bootstrap)**: `bootstrap_admin` exige DNI y crea una `Persona`
  nueva (no se reutiliza DNI existente en la BD vacía). Cuando RENIEC está
  configurado y la conectividad pasó, los nombres se autocompletan desde
  RENIEC (`wizard_consultar_dni`). Sin RENIEC, los nombres se ingresan
  manualmente (DNI obligatorio igualmente para trazabilidad).
- **Tab Usuarios (gestión)**: `crear_usuario` exige DNI. Si la `Persona` con
  ese DNI ya existe, se **reutiliza** (vincula); si no, se crea nueva.

### Comandos Tauri

- `wizard_consultar_dni(token, numero)` — RENIEC en contexto de wizard
  (sin sesión, con token del paso 2).
- `consultar_dni_para_usuario(numero)` — RENIEC en contexto de gestión
  (requiere `UsuariosManage`).
- `consultar_dni_reniec(numero)` — RENIEC en contexto de investigadores
  (requiere `DocentesView`).

### Componente compartido

`src/shared/forms/DniField.tsx` y `src/shared/forms/useDniValidation.ts`
proveen el patrón DNI + validar + auto-completar, reutilizado por el wizard y
la tab Usuarios. El flujo de investigadores conserva su `DniValidationSection` legacy
por estabilidad.

### Edición de identidad

La edición del nombre/DNI de un usuario existente está **fuera del scope**
actual: la pestaña Usuarios muestra DNI/nombre como solo lectura cuando se
edita un usuario y delega la edición a la ficha de Persona. Esta es una
decisión consciente: el nombre proviene de Persona; cambiarlo requiere editar
la Persona, lo cual se cubre en un follow-up dedicado.

---

## Servicios Externos

| Servicio | Propósito | Configuración |
|----------|-----------|---------------|
| MongoDB Atlas | Base de datos principal | `PJVPIN_MONGODB_URI` + `PJVPIN_MONGODB_DB` (default: `pjvpin`) |
| RENIEC | Consulta de DNI | `PJVPIN_RENIEC_TOKEN` (URL base por defecto: `https://api.decolecta.com/v1`) |
| RENACYT | Registro de investigadores | `PJVPIN_RENACYT_API_BASE_URL` (default en `shared/defaults.rs`) |
| Pure (Elsevier) | Sincronización de publicaciones | `PJVPIN_PURE_API_BASE_URL` + `PJVPIN_PURE_API_KEY` |

**URLs por defecto** (single source of truth): `src-tauri/src/shared/defaults.rs` (Rust) y `src/shared/config/defaults.ts` (frontend). No usar literales en otros sitios.

### Asistente de configuración (wizard)

- **Detección**: `wizard_has_config` consulta `AppState.mongo_db` y cuenta usuarios en la colección `usuarios`. Retorna `false` si MongoDB no está conectado O la colección está vacía. El wizard se muestra siempre que falte al menos un usuario.
- **Auto-creación de config desactivada**: `load_runtime_config` NO crea `pjvpin.config.json` con defaults. Sin config, la app arranca en modo wizard (`mongo: None`, sin `seed_catalogos`).
- **Re-bootstrap**: si config existe pero `usuarios` está vacío (DB borrada, wizard interrumpido), el wizard se muestra de nuevo.
- **Conexión temporal en `registrar_primer_usuario`**: si `AppState.mongo` es `None`, el handler crea una conexión `Client::with_uri_str(uri)` desde `request.mongodb_uri` para que el bootstrap funcione en true first-run.
- **Persistencia**: `wizard_save_config` escribe `pjvpin.config.json` en plaintext. (Plan de cifrado futuro: integrar con OS keychain vía `TokenResolver`.)

### Tests de conectividad del wizard

Los tests validan los **endpoints reales** que la app usa en producción. Endpoints centralizados en `src-tauri/src/shared/defaults.rs`.

| Servicio | Endpoint de test | Criterio de éxito | Criterio de fallo |
|----------|------------------|-------------------|-------------------|
| **MongoDB** | `admin.runCommand({ping:1})` vía driver | 200 OK sin error | Error de red o auth |
| **RENIEC** | `GET {base}/reniec/dni?numero={RENIEC_TEST_DNI}` con `Authorization: Bearer {token}` | HTTP 200 o HTTP 404 (DNI de prueba no existe, pero endpoint y token OK) | HTTP 401/403 (token inválido), 5xx u otro 4xx |
| **RENACYT** | `GET {base}/actoRegistral/obtenerActoRegistralActivoCtiVitae/{RENACYT_TEST_ACTO_VERSION}/{RENACYT_TEST_CTI_VITAE}` (público) | HTTP 200 | HTTP 404 (URL base mal), 5xx |
| **Pure** | `GET {base}/persons?size=1` con header `api-key` | HTTP 200 con JSON (api-key válida) | HTTP 401 (key inválida), 403 (sin permisos), 5xx |

**Valores de prueba** (`defaults.rs`): `RENIEC_TEST_DNI="00000000"`, `RENACYT_TEST_CTI_VITAE="80203"`, `RENACYT_TEST_ACTO_VERSION="2021"`. Todos son registros públicos (RENIEC y RENACYT/CTI Vitae).

Si los endpoints externos cambian en el futuro, basta actualizar `defaults.rs` y los handlers en `config_wizard.rs` para apuntar al nuevo endpoint.

---

## Decisión de arquitectura: migración a backend centralizado NestJS (ACTIVADA 2026-08-27)

**Estado**: MIGRACIÓN APROBADA E INICIADA. La anterior "decisión diferida" queda
reemplazada: los tres gatillos se consideran cumplidos.

1. **Requisito de multi-usuario: CUMPLIDO.** El sistema se utilizará en modalidad multi-usuario institucional.
2. **Infraestructura de servidor: CUMPLIDO.** VPS con soporte Node.js; despliegue de producción vía **Dokploy** (Docker). El backend NestJS (API REST) se alojará allí.
3. **Ventana de desarrollo: APROVECHADA.** El proyecto está en etapa de construcción (v0.1.0) — se migra ahora para no consolidar deuda sobre el backend embebido.

### Objetivo de arquitectura (target)

El proyecto se convierte en un **monorepo** (pnpm workspaces, convención del
monorepo `congreso`) con:

```
pjvpin/
├── apps/
│   ├── desktop/        # Tauri v2 + React → shell delgada, cliente HTTP del API
│   └── api/            # NestJS (API REST) — TODO el dominio y los conectores
├── packages/
│   └── shared/         # Contratos TS (DTOs request/response) compartidos api↔desktop
```

### Invariantes de la migración

- **Misma base de datos**: MongoDB Atlas existente (URI y DB de `.env` / env vars del servidor). El modelo de datos (23 colecciones, índices partial/sparse) se replica 1:1 — NO se rediseña. Los seeds (catálogos, vocabularios SKOS, ubigeo, grados, org_units) y `ensure_indexes` (idempotente) corren en el boot de NestJS.
- **Secretos se mueven al servidor**: `PJVPIN_MONGODB_URI`, `PJVPIN_MONGODB_DB`, `PJVPIN_RENIEC_TOKEN`, `PJVPIN_PURE_API_KEY`, `PJVPIN_PERUCRIS_*`, `PJVPIN_RENACYT_*` viven SOLO como env vars del API (Dokploy). El desktop NO almacena credenciales de BD ni de servicios externos → su `.env` se reduce a `PJVPIN_API_URL`. Los clientes HTTP externos (RENIEC/RENACYT/Pure/PeruCRIS) se reimplementan en NestJS.
- **Wizard de configuración del desktop se simplifica**: se limita a (1) establecer/validar la **URL del API REST** (test `GET /health`) y (2) login del primer superuser contra el endpoint de bootstrap del API (que solo opera con colección `usuarios` vacía). La configuración de BD/tokens/URLs externas del servidor se gestiona por env vars en Dokploy, NO desde el desktop. La sección "Asistente de configuración (wizard)" de este documento describe el comportamiento legacy (Rust embebido) y queda vigente solo hasta el switch final del desktop.
- **Disciplina hexagonal preservada**: `commands.rs` → `*.controller.ts`; `handlers.rs` → `*.service.ts`; `repository.rs` + `*Doc` → repositorios TS sobre driver MongoDB (sin Mongoose ODM completo si replica índices distintos — mantener opciones de índice EXACTAS, incl. `partial_filter_expression`); `AppError` → excepciones + exception filter global; RBAC (`AppPermission` + matriz) → guards/decoradores; auditoría JSONL → interceptor (misma salida); sesiones en memoria Rust → **JWT access/refresh** (stateless, multi-usuario); `write_export_file` → descarga HTTP (bytes/stream).
- **Contratos IPC actuales como base**: en la fase 1 los DTOs conservan sus shapes (respuestas snake_case, requests camelCase) para que el frontend solo cambie el transporte (`invoke` → `fetch`); normalización a camelCase unificado queda como deuda controlada posterior.
- **Transición sin escritura dual**: mientras un módulo convive, el desktop en modo API NO usa el backend Rust para ese módulo. Nunca corren seeds/`ensure_indexes` dos backends contra la misma BD a la vez (los índices son idempotentes, pero se evita por higiene).

### Documentación de soporte

- `docs/backend/README.md` — censo ejecutivo + mapa de correspondencia Rust → NestJS.
- `docs/backend/01-endpoints-ipc.md` — los 155 comandos IPC (inventario de endpoints a migrar).
- `docs/backend/02-features-dominio.md` — features, colecciones, índices, dependencias.
- `docs/backend/03-shared-infraestructura.md` — infraestructura transversal + matriz RBAC + clientes HTTP externos.
- `docs/backend/04-capa-cliente-frontend.md` — capa API del frontend (a convertir en cliente HTTP).
- `docs/backend/05-escenarios-migracion-nestjs.md` — análisis de escenarios de backend, despliegue y operación.

Lección consolidada (vigente): los errores de índices MongoDB (E11000 null, IndexKeySpecsConflict) son bugs de **modelado de datos**, independientes del stack. NestJS/Mongoose los reproduciría idénticos — por eso el modelo y sus índices se migran tal cual, sin rediseño.

---

## Modelo de datos CONCYTEC/PerúCRIS (capa de datos)

La capa de datos está alineada a la especificación relacional 3NF (CERIF) de CONCYTEC/PerúCRIS. Decisiones operativas vigentes:

- **`grupos_investigacion` se mantiene** como identidad de primer orden (trazabilidad). **`org_units`** coexiste para la estructura institucional (matriz + sub-unidades). NO se elimina `mod grupos` ni `Investigador.grupo_investigacion_id`.
- **Pivots M:N** (proyecto_organizaciones, proyecto_financiamientos, patente_inventores, patente_titulares, publicacion_autores) persisten vía macro DRY `shared::macros::impl_pivot_repository!` (insert/list_by_*/delete/delete_for_*/ensure_indexes). Cascade cableado en el borrado del padre.
- **Productos → Software**: `productos` se consolidó en `publicaciones` con `tipo="software"` + `id_proyecto` denormalizado (D5a).
- **Integridad referencial** en capa Rust (`shared::{refs,hierarchy}`): `ensure_exists`/`ensure_active`/`ensure_vocab_active`/`assert_not_referenced`/`assert_no_cycle`/`assert_not_self_parent`.
- **`PJVPIN_RESET_DEV`**: `shared::db::drop_dev_collections()` dropea 15 colecciones reestructuradas y re-seed (solo `#[cfg(debug_assertions)]` + env var).
- **VOs**: `Orcid`, `Doi` (en `shared/`) con `new`/`new_opt`/`into_string` (sin `as_str`; usar `AsRef<str>`).
- **Campos legacy eliminados** (D10 green-field): `equipamiento.proyecto_id`, `patente.investigador_id`, `financiamiento.proyecto_id`+`entidad_financiadora`, `publicacion.autores_ids`/`revista`/`url`/`pure_id`. `patente.proyecto_id` se conserva.
- **Sync Pure consolidado** (B1): el sync escribe en `publicaciones_cientificas` (`PublicacionCientifica`, `dominio_origen="PURE"`, `pure_uuid` UNIQUE sparse) vía `pure_service::sync_publicaciones` (mapper `build_request` + `map_pure_tipo`), pobla el pivot `publicacion_autores` desde `autores_json` (resuelve personas por `nombre_completo`), y lee por pivot (`publicaciones::repository::get_by_investigador`). La colección legacy `publicaciones` y `investigadores::Publicacion`/`PublicacionDto` fueron ELIMINADAS. `scopus_eid` ya no se persiste.
- **Exportador CERIF** (B2): `reportes/cerif.rs` serializa JSON `pjvpin/cerif-json/0.1` (entidades OrgUnit/Person/ResultProject/ResultPublication/ResultPatent) leyendo modelo consolidado + pivots M:N + `entity_ocde_fields`; command `exportar_cerif(file_path, entidad?)` vía `write_export_file` (RBAC `ReportesExport` + audit). CERIF XML real queda como deuda.
- **Conector PerúCRIS** (B3): `shared/external/perucris_client.rs` (POST `{base}/cerif/ingest` con header `api-key`) + `perucris_service.rs` (orquesta `cerif.rs` → push → `PeruCrisPushResult`) + command `enviar_a_perucris`. Registrado en `defaults.rs`/`config.rs`/`tokens.rs`/`state.rs`/`defaults.ts` (env: `PJVPIN_PERUCRIS_API_BASE_URL`, `PJVPIN_PERUCRIS_API_KEY`) + wizard test `test_perucris_connectivity` (GET `{base}/cerif/status`, tolera 200/404). Endpoints asumidos (placeholder) — ajustar cuando CONCYTEC exponga el oficial.
- **Ubigeo INEI completo** (A0): `geo/seed.rs` carga el dataset oficial (~2113 registros: 25 deptos + 196 provincias + 1892 distritos) embebido como JSON (`geo/data/ubigeo_inei.json`, `include_str!`, fuente INEI vía datosabiertos.gob.pe, ODbL). Reemplaza los 24 departamentos sintéticos. `validate_codigo` se conserva.
- **UI CONCYTEC** (A1-A3): frontend `UbigeoSelect` (`src/shared/forms/`), services `geo.ts`/`vocabularios.ts`/`orgUnits.ts`, UI de vocabularios (`configuracion/vocabularios/VocabulariosPanel.tsx`, árbol SKOS lazy + Reimportar gated `vocabularios.manage`) y org_units (`configuracion/org-units/`, árbol por `parent_id` + form con UbigeoSelect y vocabs). Permisos frontend `geo.view`/`vocabularios.*`/`org_units.*` en `permissions.ts`. Fix integridad: `update_catalogo` rechaza editar items `editable=0`.
- **Importación de investigadores por DNI (en lugar de seed auto-run)**: `investigadores/import.rs` reemplaza al antiguo `seed_investigadores_pending` (que corría 55 DNIs en cada arranque contra RENIEC+RENACYT). El admin ahora dispara el flujo manualmente desde el tab Investigadores → botón **Importar por DNI** (modal `ImportInvestigadoresModal`). El JSON embebido con los 55 DNIs UNF sigue siendo la fuente de la plantilla precargada (botón "Cargar plantilla UNF"), pero el seed automático desapareció del setup hook de `lib.rs`. **Pipeline de enriquecimiento por DNI (orden de prioridad)**: 1) RENIEC (identidad legal, obligatorio), 2) PeruCRIS (`search_by_query(dni)` filtro `entity_type=Person`, captura `perucris_uuid`), 3) Pure (mapping maestro `DNI→pure_person_id` descargado una vez por lote), 4) RENACYT (nivel/código/grupo). Concurrencia 5, circuit breaker RENIEC, idempotencia per-DNI (`load_existing_persona_dnis`), grado fallback `default_grado_id`. Commands Tauri: `importar_investigadores` (RBAC `InvestigadoresManage` + audit `investigador.import`) y `get_plantilla_investigadores_default` (RBAC `InvestigadoresView`).

**Deuda diferida** (fase siguiente): `skos_importer` (XLSX oficiales CONCYTEC — el seed embebido cubre v0.1.0; requiere `calamine`); CERIF XML real (hoy JSON); validación del payload contra el esquema oficial PerúCRIS cuando CONCYTEC exponga el endpoint; UI del wizard para la key de PerúCRIS (hoy `Option` tolerada por serde); `org_units.ubigeo_codigo` no admite distritos (los 24 sintéticos `X0100` migran a códigos reales al re-seed); N+1 en loaders CERIF (optimizable con agregaciones).

---

## Flujo de Trabajo con OpenCode

### Flujo de desarrollo con Árbitro de Cumplimiento (estándar OBLIGATORIO desde 2026-08-27)

Todo trabajo de construcción (feature, fix, refactor, migración) sigue el ciclo
**Plan → Build → Árbitro → Fix → Gates → Commit**. Fundamentado en las prácticas
2026 de flujos con agentes: separación builder/reviewer (la sesión que escribió
el código jamás lo audita), patrón LLM-as-Judge con criterios explícitos,
spec-first (criterios de aceptación antes de implementar) y stop rules
anti-drift.

**Ciclo por unidad de trabajo (feature/fix/refactor):**

1. **Plan** — tarea no trivial → `submit_plan` (plannotator) con criterios de
   aceptación por tarea. El usuario aprueba; nada fuera del plan se implementa
   (scope creep se REPORTA, no se ejecuta).
2. **Build** — subagente implementador (`build`) ejecuta SOLO el plan aprobado
   en branch `feat/*` o `fix/*`. Diffs pequeños y revisables.
3. **Árbitro** (gate OBLIGATORIO antes de commit) — agente auditor INDEPENDIENTE
   del implementador (subagente `explore` read-only o agente `plan` en rol de
   árbitro; nunca el mismo contexto que escribió el código). Verifica con un
   reporte de hallazgos **bloqueantes / no bloqueantes**:
   - **Cumplimiento del plan**: cada tarea marcada implementada/no implementada;
     desviaciones del plan listadas explícitamente.
   - **No-regresión**: ninguna funcionalidad existente VÁLIDA eliminada o
     modificada sin estar prevista en el plan. Inventario de referencia:
     `docs/backend/01-endpoints-ipc.md` (155 comandos) y los 94 wrappers de
     `src/shared/tauri/`.
   - **Buenas prácticas del stack** — NestJS/REST: controllers sin lógica de
     negocio, DTOs + class-validator en toda entrada, guards/decoradores RBAC,
     exception filter global, códigos HTTP correctos (200/201/204/400/401/403/
     404/409), rutas kebab-case, DI por constructor, config por env vars, sin
     `any`. React/TS: hooks ≤200 líneas, feature-based, mensajes centralizados
     (`messages/*`), componentes compartidos (`EmptyState`/`Badge`/`FormInput`).
     Rust: `Result<T, AppError>`, sin `unwrap()`, cero dead code.
   - **Principios AGENTS.md**: SOLID/DRY/KISS/YAGNI, cero secretos hardcodeados,
     convención serde camelCase en requests, opciones de índice exactas.
   - **Blast-radius**: `pr_impact`/`call_graph` del codebase-index cuando el
     cambio toca símbolos compartidos (>5 callers).
4. **Fix loop** — el implementador corrige hallazgos; el Árbitro re-verifica
   hasta cero bloqueantes. **Regla de 2 correcciones**: si el mismo hallazgo
   reaparece 2 veces, detener y escalar al usuario (stop rule anti-drift).
5. **Gates técnicos** — typecheck/lint/test/build cero errores/warnings +
   auditorías de literales/secretos de este documento.
6. **Commit atómico** (Conventional Commits, subject en español) — solo con
   Árbitro aprobado.
7. **Persistencia** — `memory add` de decisiones/patrones al cierre de hitos.

**Definition of Done** de toda unidad de trabajo: tareas 100% + Árbitro sin
hallazgos bloqueantes + gates técnicos verdes + no-regresión confirmada.

**Herramientas del Árbitro**: subagente `explore` (read-only por diseño),
`pr_impact`/`call_graph` (blast radius), skill `plannotator-review` (revisión
visual del diff por el usuario), comandos `/security-check` y `/prepare-pr`
(checks previos a PR).

### Herramienta prioritaria de descubrimiento: plugin `opencode-codebase-index`

Este proyecto tiene un **índice semántico del codebase** en `.opencode/index/` (modelo: `nomic-embed-text` vía Ollama, ~3 000 chunks). **Toda exploración de código DEBE priorizar las herramientas del plugin antes que `grep`/`read`/`glob` aislados.** Jerarquía de uso:

| Necesidad | Herramienta prioritaria | Cuándo NO usar |
|---|---|---|
| Descubrimiento conceptual ("¿dónde se valida la sesión?") | `codebase_search` (devuelve top-N semántico) | Si necesitas matches exactos/exhaustivos → `grep` |
| Localizar la definición de un símbolo | `implementation_lookup` o `codebase_peek` (devuelve file:line + nombre) | Para ver el código completo → `read` |
| Blast-radius de un cambio antes de refactor | `pr_impact` (afectados directos + transitivos + hub nodes) | Si el cambio es trivial y no toca funciones compartidas |
| Callers / callees de una función | `call_graph` (con `direction: "callers"` o `"callees"`) | Si la función es interna y trivial |
| Path entre dos símbolos | `call_graph_path` | Si no hay relación call entre ellos |
| Verificar salud del índice | `index_status` (cuántos chunks, branch) | — |
| Diagnóstico de fallos del indexer | `index_logs` | — |

**Reglas concretas de uso:**

1. **Antes de cualquier refactor que toque una función/comando público** → correr `call_graph` con `direction: "callers"` para listar todos los call-sites, **luego** `pr_impact` para dimensionar el blast-radius en el branch.
2. **Antes de proponer cambios arquitectónicos** (eliminar service layer, renombrar DTOs, mover funciones entre módulos) → correr `codebase_peek` con query descriptivo para encontrar **patrones replicados** en otros módulos antes de aplicar la solución.
3. **En subagentes `explore`**: usar `codebase_search` como primera pasada conceptual (reduce ~90% de flips de lectura), luego `grep` para confirmar identificadores exactos. **Prohibido abrir 5+ archivos cuando `codebase_peek` + `call_graph` resuelven en 1 tool-call.**
4. **Auditorías cross-module** (auditar N módulos) → usar `codebase_peek` con queries separados por feature, no abrir cada carpeta manualmente.
5. **Si el index no está construido** (`index_status` reporta 0 chunks) → ejecutar `index_codebase` antes de cualquier `codebase_search`/`codebase_peek`. Index incremental ~50 ms en estado estable.
6. **Mantenimiento**: si `index_status` muestra "stale" o chunks de archivos borrados → ejecutar `index_health_check` para limpiar entradas obsoletas. Auto-GC cada 7 días activado por config.

**Anti-patterns explícitos (prohibidos):**

- ❌ `grep` exhaustivo sobre 5+ archivos cuando `codebase_peek` con un query descriptivo los encuentra todos.
- ❌ `read` de archivos completos >200 líneas para localizar un símbolo cuando `codebase_peek` da su ubicación.
- ❌ Lanzar subagentes `explore` con instrucciones genéricas ("busca cómo se hace X") en vez de un query semántico concreto que el index puede resolver.
- ❌ Proponer refactors sin `pr_impact` previo cuando el símbolo es hub (>5 callers).
- ❌ Ejecutar `index_codebase` con `force: true` en cada sesión (es costoso: re-embedea todo). El incremental cubre diffs.

### Agentes Recomendados
- **explore**: Para búsquedas en el codebase, encontrar patrones, analizar dependencias. **DEBE usar `codebase_search` + `codebase_peek` + `call_graph` como primera opción** antes de `grep`/`read`/`glob`.
- **general**: Para tareas multi-step complejas que requieren leer + escribir. Aplica la misma jerarquía de discovery.
- **infra-expert** / **doc-expert**: Para tareas especializadas (infraestructura, documentación). También usan el índice semántico.
- Usar agentes en paralelo cuando las tareas son independientes. Delegar a subagente todo trabajo tool-heavy para mantener el contexto del agente principal limpio.

### Skills Disponibles
- `tauri-v2`: Tauri v2 patterns, IPC, capacidades, build troubleshooting
- `vite`: Configuración de Vite, plugins, chunk splitting
- `frontend-design`: Diseño de UI/UX
- `typescript-advanced-types`: Tipos avanzados de TypeScript
- `accessibility`: Auditoría WCAG 2.2
- `vercel-react-best-practices`: Optimización de rendimiento React
- `vercel-composition-patterns`: Patrones de composición React

### Testing
- Rust: `cargo test --lib` desde `src-tauri/`. Cobertura obligatoria para cada módulo reformado: `Model::new`, round-trip `From<Model>/TryFrom<Dto>`, ramas del `Request::validate()`. Sin tests de integración MongoDB (requieren M11+ o testcontainers — pendiente).
- Frontend: `npm run test` (Vitest + Testing Library). Cubrir permisos, error handling, validación de DNI, hooks de fetch estables.
- E2E: Pendiente (Playwright recomendado con Tauri).

- Build scripts en `scripts/tauri-build.ps1`

---


## Reglas de UI/UX (v0.1.0-alpha — refactor CSS → Tailwind)

### Tailwind-first

- **Priorizar Tailwind utilities** para todo diseño nuevo: `grid grid-cols-1 md:grid-cols-2 gap-6`, `flex items-center gap-3`, `p-6`, `rounded-xl`, `shadow-md`.
- CSS custom (`@apply` en `*.css`) solo para patrones repetidos ≥3 veces que merezcan abstracción.
- Si una utility se repite, promover a componente compartido (ej. `<Badge>`, `<StatusChip>`).

### UI funcional, no explicativa

- **Prosa explicativa > 1 línea en el cuerpo de pantallas: NO.** Mover a `<FieldHelpTooltip>` (icono `?` junto al título del campo/sección).
- Tooltip content ≤ 240 caracteres. Si más, usar `<details>` collapsible.
- **Cards de resumen (roles, configuración, métricas)**: preferir **chips de módulos** (Badge variant="default") sobre listas de capabilities en prosa. Resumir "qué módulos toca este rol" en una fila de `<Badge>` escaneable. Máximo una línea de `summary` debajo del label.
- **Empty states verbosos**: máximo 4 palabras. `"Sin resultados"` > `"No hay elementos para el filtro seleccionado"`.
- **Inline feedback verbose**: máximo 6 palabras. `"Modo consulta: solo lectura."` > `"Modo consulta: puede revisar pero no crear, editar, ni desactivar."`.
- **ConfirmDialog messages**: pregunta directa + consecuencia esencial en 1 línea. Sin prosa sobre comportamiento interno del backend.
- **Tab descriptions**: evitar descriptions debajo del label del tab — el icono + label bastan.
- **Help texts en FormInput/FormSelect**: si el placeholder ya comunica la idea → omitir. Si aporta info real no inferible del label → pasar al `help` prop (que renderiza `<FieldHelpTooltip>` junto al label).
- **Banner de error de refresco / carga**: en fallo de fetch, `useStableFetch` **resetea** `data` a su valor inicial. Los mensajes inline NO deben afirmar "datos previos / anteriores / conservados / actuales" — el estado post-error es data vacía + `error` seteado. Forma canónica: `messages.ui.sinDatos` + botón **Reintentar**.
- Componentes clave:
  - `<FieldHelpTooltip content={...} label={...}>` — basado en `FloatingTooltip` (`@floating-ui/react`), `size="rich"`, `placement="top-start"`.
  - `<FloatingTooltip>` para todos los tooltips.

### Mensajes centralizados

- TODO string user-facing (toast, inline-feedback, ConfirmDialog, empty-state) **DEBE** importarse de `@/shared/feedback/messages`. Literales inline prohibidos en `*.tsx`.
- Excepciones mínimas: títulos presentacionales del DOM (ej. `<h2>Catálogos</h2>`, labels de inputs que se repiten en el plan de captura).
- Estructura del catálogo:
  - `messages/ui.ts` — mensajes genéricos compartidos (`sinDatos`, `sinResultados`, `reintentar`, `cancelar`, `confirmar`, `guardar`, `error`, `errorInesperado`, `modoConsulta`, `cargando`).
  - `messages/<feature>.ts` — un archivo por feature (`catalogos`, `grados`, `usuarios`, `investigadores`, `proyectos`, `grupos`, `reportes`, `dashboard`, `auth`).
- Convenciones:
  - Strings sin interpolación: const simple o agrupado en objeto `as const`.
  - Strings con interpolación: builder puro: `export const eliminar = (nombre: string) => \`¿Eliminar "${nombre}"?\``
  - Para errores con detalle del backend: `${ui.error}: ${getTauriErrorMessage(err)}` — único patrón permitido de concatenación.
  - Exportar tipo `MessageKey = keyof typeof messages.<feature>` para autocompletado en consumers.
- **Cero duplicación**: un mismo concepto tiene un único ID. Ajustes de tono/terminología se hacen en un único lugar.

### Padding de forms en cards

- Cualquier `<form className="form">` (definida en `forms.css` como `flex flex-col gap-5` **SIN padding**) **debe envolverse** en `<div className="p-6">…</div>` dentro de la card.
- Aplica a `AuthScreen`, `AppLoadingScreen`, y cualquier modal/form card.
- Mismo patrón para skeletons (`.form` envuelto en `<div className="p-6">`).

### Componentes compartidos clave (reusar antes que crear alias)

- `<Badge variant="default|info|success|warning">` — reemplaza `.badge*`.
- `<StatusChip variant="total|success|warning|info">` — reemplaza `.status-chip*` y `.refresh-hint`.
- `<AppIcon icon={...} size={...}>` — wrapper de `lucide-react`. SIEMPRE usar este wrapper.
- `<FieldHelpTooltip>`, `<FloatingTooltip>` — tooltips.
- `<Skeleton>`, `<SkeletonBlock>`, `<SkeletonTable>`, `<SkeletonFallbacks>` — loaders.
- `<EmptyState variant="empty|filtered|error">` — empty states estandarizados. Reemplaza TODO `<div className="empty-state">` directo en components (excepto internals de `EmptyState.tsx`).

### Empty states (vía componente `<EmptyState>`)

Toda vista de registros (tabla, grid, list) que pueda mostrar 0 elementos DEBE usar el componente compartido `<EmptyState>` con uno de 3 variants:

- `variant="empty"` — sin filtros activos y data === []: mensaje `messages.ui.emptyState('<entidad>')`, CTA "Crear primer X" (`messages.ui.emptyStateCtas.crearPrimero`) cuando `canManage`.
- `variant="filtered"` — filtros activos y data filtrada === []: mensaje `messages.ui.filteredEmpty('<entidad>')`, CTA "Limpiar filtros" (`messages.ui.emptyStateCtas.limpiarFiltros`).
- `variant="error"` — fetch error: mensaje `messages.ui.errorCarga('<entidad>')`, CTA "Reintentar" (`messages.ui.reintentar`).

Reglas:

- Toolbar y filtros NO se renderizan en estado error (reemplazados por `<EmptyState variant="error">`). Mutua exclusión error/empty.
- Detección de "filtros activos" via helper `hasActiveFilters` en el hook/state del feature (ej: `estadoFiltro !== 'todos' || busqueda.trim() !== ''`).
- En sub-tablas de solo lectura (reportes, detail panels) sin toolbar, usar `variant="empty"` con mensaje específico del feature (no builders genéricos, porque no hay contexto de filtro).
- En charts (DashboardCharts), usar `variant="empty"` con `messages.dashboard.chartEmptyMessages.<key>`.
- Prohibido: `<div className="empty-state">{string}</div>` directo en components (excepto dentro de `EmptyState.tsx` internals).

### Politica de color y dark mode (v0.1.0-alpha)

La app es **light-only** en v0.1.0. No se implementa dark mode. Esto elimina el bug "texto blanco sobre fondo blanco" en sistemas con tema oscuro donde el WebView de Tauri hereda `color: white` para inputs nativos.

- **NO** usar `@media (prefers-color-scheme: dark)` en `src/assets/styles/*.css`. El único `color-scheme: light` permitido está en `tokens.css :root`.
- **Todo componente con `bg-white`** (sea `@apply` en CSS o `className` inline) **DEBE pinar `text-gray-800` o `text-gray-900`** en su propia regla, para evitar herencia de color blanco del agente-usuario. Aplica a: `.modal-content`, `.modal-body`, `.form-card`, `.chart-container`, `.renacyt-detail-card`, `.table-container`, `.catalogo-summary-card`, `.kpi-card`.
- **Inputs nativos** (`<input>`, `<select>`, `<textarea>`) **DEBEN** incluir `text-gray-900` explícitamente. Usar siempre `<FormInput>` o `<FormSelect>` (que aplican `inputClassName` desde `src/shared/forms/inputClassName.ts`). El string está exportado para ser importado en pantallas que no usan los wrappers (auth, wizard, reportes, DniField, DniValidationSection, RenacytValidationSection).
- **NO** crear reglas CSS `.form-input` o `.form-select` globales. Usar `inputClassName` (Tailwind utilities) o `<FormInput>`/`<FormSelect>`.

### Auditoría de runtime (importante)

- **Verificación de login, wizard, dashboard, configuración, reportes debe hacerse en la ventana Tauri** (`npm run tauri dev`), NO en el navegador Chrome sobre `localhost:1420`. El navegador no expone el IPC Tauri → `invoke()` falla → login/wizard no procesan datos.
- Solo Chrome DevTools emulación (dark mode, responsive, focus-visible) puede hacerse en el navegador.
- Para inspeccionar login sin wizard: restaurar un `pjvpin.config.json` previamente generado y reiniciar la app.

### Quality gates obligatorios antes de commitear

```bash
npm run typecheck  # 0 errores
npm run lint       # 0 errors / 0 warnings
npm run test       # vitest pasa todos
cargo check --no-default-features  # 0 warnings
cargo test --lib   # todos los tests Rust pasan
npm run build      # OK

# Auditoria del codebase-index (debe estar sano antes de cualquier refactor)
index_status       # chunks > 0, branch=main, no "stale"

# Auditoria de literales inline en *.tsx (cero debe sobrevivir)
rg -n "toast\.(error|success|warning|info)\(['\"]" src/ --glob "*.tsx"   # debe estar vacio
rg -n 'aria-label="[A-ZÁÉÍÓÚÑ]' src/ --glob "*.tsx"                    # debe estar vacio
rg -n 'title="[A-ZÁÉÍÓÚÑ][^"$]*"' src/ --glob "*.tsx" | rg -v "pendingChange"  # debe estar vacio
rg -n 'className="empty-state"' src/ --glob "*.tsx" | rg -v "EmptyState.tsx"  # debe estar vacio (solo internals de EmptyState)

# Auditoria de politica de color (light-only, inputClassName)
rg -n 'prefers-color-scheme' src/ --glob "*.css"                       # debe estar vacio (no dark mode)
rg -n 'className="form-input"' src/ --glob "*.tsx"                    # debe estar vacio (usar inputClassName)

# Auditoria de cross-module debt: service.rs pasamanos ya no debe existir
rg -n 'pub mod service' src-tauri/src/  # debe estar vacio (eliminado en I.8 + J.3)
```

Si typecheck/lint/build falla o la auditoria detecta literales no migrados al
catálogo, **detener y reportar antes de commitear**.

### Entorno Windows (shell bash/MSYS)

- Null device = `/dev/null`. **Nunca** redirigir a `> nul` en bash: crea un archivo literal `nul` en el CWD (MSYS lo permite; CMD/Explorer no pueden borrarlo).
- Variables de entorno = `$USERPROFILE`. **Nunca** `%USERPROFILE%` (no se expande en bash).
- Listar = `ls`. **Nunca** `dir /b` (en bash, `dir` es alias de `ls` y `/b` se interpreta como ruta).
- Mezclar sintaxis CMD dentro de un shell POSIX es la causa raíz del archivo basura `nul` ya limpiado del repo (ignorado en `.gitignore` como red de seguridad).

