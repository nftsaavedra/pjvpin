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
| Bundler | Vite (Rolldown) | 8.0 |
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
│       │   ├── db.rs             #   Conexión MongoDB
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
├── docs/                         # Documentación de arquitectura
├── _docs/                        # Vault Obsidian (docs internas)
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
| **operador** | CRUD investigadores, proyectos, grupos, recursos + reportes export |
| **consulta** | Solo lectura: dashboard, investigadores, proyectos, reportes, grupos |
| **responsable_proyecto** | Solo lectura: dashboard, investigadores, proyectos, reportes, grupos |

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
- **Persistencia**: `wizard_save_config` escribe `pjvpin.config.json` en plaintext (coherente con `load_runtime_config`). Ver "Deuda Técnica" para plan de cifrado.

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

## Flujo de Trabajo con OpenCode

### Agentes Recomendados
- **explore**: Para búsquedas en el codebase, encontrar patrones, analizar dependencias
- **general**: Para tareas multi-step complejas que requieren leer + escribir
- Usar agentes en paralelo cuando las tareas son independientes

### Skills Disponibles
- `tauri-v2`: Tauri v2 patterns, IPC, capacidades, build troubleshooting
- `vite`: Configuración de Vite, plugins, chunk splitting
- `frontend-design`: Diseño de UI/UX
- `typescript-advanced-types`: Tipos avanzados de TypeScript
- `accessibility`: Auditoría WCAG 2.2
- `vercel-react-best-practices`: Optimización de rendimiento React
- `vercel-composition-patterns`: Patrones de composición React

### Testing (Pendiente)
- Rust: `cargo test` (6 tests: 2 config_validator + 4 investigadores)
- Frontend: Vitest + Testing Library (15 tests: permissions + error handling)
- E2E: Sin tests (Playwright recomendado con Tauri)

### CI/CD (Pendiente)
- GitHub Actions configurado (`.github/workflows/ci.yml`): lint + typecheck + test + build
- Build scripts en `scripts/tauri-build.ps1`

---

## Deuda Técnica Conocida

| Prioridad | Ítem |
|-----------|------|
| ✅ Resuelto | CSP habilitado en tauri.conf.json |
| ✅ Resuelto | Tests: 6 Rust + 15 frontend (Vitest) |
| ✅ Resuelto | Structured logging con tracing crate |
| ✅ Resuelto | Sin transacciones MongoDB para operaciones multi-documento |
| ✅ Resuelto | Sin paginación en queries de lista (tipo PaginatedResult creado, integrado en investigadores) |
| ✅ Resuelto | `pure_cmd.rs` bypassea capa de servicios → pure_service.rs creado |
| ✅ Resuelto | `chrono` centralizado en `time.rs` y `renacyt_client.rs` |
| ✅ Resuelto | `access_control.rs` dividido en `rbac.rs` + handlers + auditoría genérica en 11 operaciones |
| ✅ Resuelto | `has_existing_config` chequeaba solo archivo → `wizard_has_config` ahora consulta usuarios en MongoDB |
| ✅ Resuelto | `load_runtime_config` auto-creaba config con defaults → ya no auto-crea, arranca en modo wizard |
| ✅ Resuelto | `save_wizard_config` escribía `.json.enc` (cifrado dead code) → escribe `pjvpin.config.json` plaintext |
| ✅ Resuelto | URLs hardcoded duplicadas → centralizadas en `src-tauri/src/shared/defaults.rs` y `src/shared/config/defaults.ts` |
| 🟡 Medio | Cifrado de config en disco: eliminar `encryption.rs` (hecho), re-implementar con `decrypt_config` + OS keychain (Windows Credential Manager) |
| 🟡 Bajo | Auditoría pendiente en recursos (12 operaciones) y update/reactivate de investigadores/grados/proyectos |
| 🟡 Medio | Dropdowns de recursos aún usan placeholders; integrar con catálogos (FormSelect dinámico) |

---

## Reglas de UI/UX (v0.1.0-alpha — refactor CSS → Tailwind)

### Tailwind-first

- **Priorizar Tailwind utilities** para todo diseño nuevo: `grid grid-cols-1 md:grid-cols-2 gap-6`, `flex items-center gap-3`, `p-6`, `rounded-xl`, `shadow-md`.
- CSS custom (`@apply` en `*.css`) solo para patrones repetidos ≥3 veces que merezcan abstracción.
- Si una utility se repite, promover a componente compartido (ej. `<Badge>`, `<StatusChip>`).

### UI funcional, no explicativa

- **Prosa explicativa > 1 línea en el cuerpo de pantallas: NO.** Mover a `<FieldHelpTooltip>` (icono `?` junto al título del campo/sección).
- Tooltip content ≤ 240 caracteres. Si más, usar `<details>` collapsible.
- Componentes clave:
  - `<FieldHelpTooltip content={...} label={...}>` — basado en `FloatingTooltip` (`@floating-ui/react`), `size="rich"`, `placement="top-start"`.
  - `<FloatingTooltip>` para todos los tooltips.

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

### Auditoría de runtime (importante)

- **Verificación de login, wizard, dashboard, configuración, reportes debe hacerse en la ventana Tauri** (`npm run tauri dev`), NO en el navegador Chrome sobre `localhost:1420`. El navegador no expone el IPC Tauri → `invoke()` falla → login/wizard no procesan datos.
- Solo Chrome DevTools emulación (dark mode, responsive, focus-visible) puede hacerse en el navegador.
- Para inspeccionar login sin wizard: restaurar un `pjvpin.config.json` previamente generado y reiniciar la app.

### Quality gates obligatorios antes de commitear

```bash
npm run typecheck  # 0 errores
npm run lint       # baseline 6 errors + 4 warnings preexistentes
npm run test       # 27/27 vitest
cargo check --no-default-features  # 0 warnings
npm run build      # OK
```

Si typecheck/lint/build falla, **detener y reportar antes de commitear**.

## Carve-outs respetados (no renombrar)

- `perfil: "docente"` (default) en TS/Rust — modelo canónico.
- Constantes y enums asociados a `"docente"` en código de negocio.
- Tokens de perfil en backend (`perfil="docente"`, `default_perfil()`).

Sí se renombraron (en este refactor):
- Selectores CSS `docente-*` → `investigador-*`.
- Archivos `docentes.css` → `investigadores.css`, `docente-info.css` → `investigador-info.css`.
- Util `docenteUtils.ts` → `investigadorUtils.ts`.
- ID HTML `docente-dni` → `investigador-dni`.
- Selector `project-docentes-trigger` → `project-investigadores-trigger`.
