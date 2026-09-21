# PJVPIN

> **VPIN** — Sistema de escritorio para gestión integral de investigación universitaria construido con Tauri v2 + React (desktop) y NestJS (API REST) en un monorepo pnpm.

PJVPI centraliza el registro y seguimiento de **investigadores** (docentes, tesistas y alumnos egresados), sus **proyectos**, **grupos de investigación**, **publicaciones** y **recursos** asociados. El desktop consulta automáticamente los servicios de **RENIEC** y **RENACYT** (CONCYTEC) para validar identidad y clasificación, y exporta reportes operativos a Excel y PDF.

---

## Tabla de contenidos

1. [Características](#características)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del monorepo](#estructura-del-monorepo)
4. [Requisitos](#requisitos)
5. [Configuración](#configuración)
6. [Desarrollo](#desarrollo)
7. [Verificación](#verificación)
8. [Build de producción](#build-de-producción)
9. [Servicios externos integrados](#servicios-externos-integrados)
10. [Roles y permisos](#roles-y-permisos)
11. [Estado del proyecto](#estado-del-proyecto)
12. [Próximos pasos](#próximos-pasos)
13. [Arquitectura](#arquitectura)
14. [IDE recomendado](#ide-recomendado)

---

## Características

- **Asistente de configuración inicial** (wizard en la ventana Tauri) con verificación real de conectividad al API y bootstrap del primer `superuser`.
- **Identificación automática de investigadores en un solo paso**: el usuario ingresa el DNI, la app valida duplicados, consulta RENIEC para autocompletar nombres y, a continuación, busca el código RENACYT por DNI de forma automática.
- **Tres perfiles de investigador** (`docente`, `tesista`, `alumno_egresado`) configurables al alta y editables.
- **Exportación de reportes** a Excel y PDF con columnas dinámicas (proyectos, investigadores, grupos, recursos, perfil).
- **Sincronización de publicaciones** desde Pure (Elsevier).
- **Panel de KPIs y gráficos** con tendencias de proyectos, distribución RENACYT y carga por investigador.
- **API REST** desacoplada del shell desktop: el API vive en `apps/api` (NestJS v12) y el desktop lo consume por HTTP — habilita despliegue multi-usuario y tests contractuales.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Shell de escritorio | Tauri v2 | 2.10.x |
| Frontend | React + TypeScript | 19.1 / 6.0 |
| Bundler | Vite (Rolldown) | 8.2 |
| Backend (apps/api) | NestJS | 12.x |
| Runtime API | Node.js | ≥ 24.9 (requerido por Jest 30 + ESM) |
| Toolchain Rust | rustc / cargo | 1.85+ |
| Base de datos | MongoDB (driver oficial) | 6.x |
| Hashing de contraseñas | Argon2 | 0.41 |
| HTTP (apps/api) | @nestjs/platform-express | 12.x |
| HTTP (apps/desktop, legacy Tauri) | reqwest (rustls-tls) | 0.12 |
| Gráficos | recharts | 3.8 |
| Generación de PDF | @react-pdf/renderer | 4.4 |
| Exportación Excel | exceljs | 4.4 |
| Iconografía | lucide-react | 1.7 |
| Tooltips | @floating-ui/react | 0.27 |
| Package manager | pnpm (workspaces) | 11.9 |
| Auth API | @nestjs/jwt (Argon2) | 12.x |

---

## Estructura del monorepo

```
pjvpin/
├── apps/
│   ├── desktop/        # Tauri v2 + React — shell desktop (cliente HTTP del API)
│   └── api/            # NestJS — API REST con dominio y conectores externos
├── packages/
│   └── shared/         # Contratos TS compartidos (DTOs request/response)
├── docs/
│   └── backend/        # Censo histórico de la migración Rust → NestJS
├── scripts/            # PowerShell para empaquetado Tauri (NSIS, MSI, portable)
├── pnpm-workspace.yaml
└── package.json        # Scripts orquestadores (pnpm -r)
```

Convención **Screaming Architecture**: cada feature dentro de `apps/desktop/src/features/` y `apps/api/src/` agrupa modelo, comandos/controladores, servicios y repositorio. No hay carpetas técnicas globales.

---

## Requisitos

- **Node.js ≥ 24.9** (apps/api requiere módulos ESM de NestJS v12 y Jest 30).
- **pnpm ≥ 9** (`packageManager: pnpm@11.9.0`).
- **Rust 1.85+** con toolchain estable (para `apps/desktop/src-tauri`).
- **MongoDB Atlas** (tier gratuito M0 suficiente para desarrollo) **o** MongoDB local alcanzable desde la URI configurada.
- **Windows 10/11** (target actual del build de Tauri).
- Opcionales (sin ellos la app funciona en modo degradado):
  - Token de **RENIEC** (consulta de DNI).
  - API key de **Pure** (sincronización de publicaciones).
  - API key de **PerúCRIS** (push CERIF).

---

## Configuración

### Variables de entorno

- **API** (`apps/api/.env`): el NestJS carga este archivo al arrancar desde el directorio del paquete.
  ```env
  PJVPIN_MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/?appName=pjvpin
  PJVPIN_MONGODB_DB=pjvpin
  JWT_ACCESS_SECRET=          # generar con: node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
  JWT_REFRESH_SECRET=         # idem
  JWT_ACCESS_TTL=15m
  JWT_REFRESH_TTL=7d
  PORT=18080
  CORS_ORIGINS=http://localhost:1420,tauri://localhost,http://tauri.localhost
  PJVPIN_AUDIT_LOG_PATH=      # ruta absoluta recomendada en contenedor
  PJVPIN_RENIEC_TOKEN=
  PJVPIN_RENIEC_API_BASE_URL=https://api.decolecta.com/v1
  PJVPIN_RENACYT_API_BASE_URL=
  PJVPIN_RENACYT_ACTO_VERSION=2021
  PJVPIN_PURE_API_BASE_URL=
  PJVPIN_PURE_API_KEY=
  PJVPIN_PERUCRIS_API_BASE_URL=
  PJVPIN_PERUCRIS_API_KEY=
  NODE_ENV=development
  ```
- **Desktop** (`apps/desktop/.env`, opcional): la URL del API.
  ```env
  PJVPIN_API_URL=http://localhost:18080
  ```
  Si no se define, el desktop usa `http://localhost:18080` (default en `apps/desktop/src/shared/http/config.ts`). La URL puede sobrescribirse desde el wizard y se persiste en `localStorage` del WebView.

Las URLs por defecto viven en `apps/api/src/config/defaults.ts` (API) y `apps/desktop/src/shared/config/defaults.ts` (frontend); nunca hardcodearlas en otro sitio.

### Asistente de configuración (wizard)

En el primer arranque, si el `GET /api/v1/health` devuelve `requires_setup: true` (colección `usuarios` vacía en MongoDB) o el API no responde, la ventana Tauri muestra un asistente de **2 pasos**:

1. **URL del API**: el usuario ingresa `http://localhost:18080` y la app ejecuta `GET /health`; debe devolver `ok: true` con `requires_setup` consistente.
2. **Creación del primer `superuser`**: DNI + credenciales (validación vía RENIEC si está configurado, o ingreso manual).

El wizard vuelve a aparecer si la colección `usuarios` queda vacía tras un reset de la base de datos.

---

## Desarrollo

```bash
# 1. Instalar dependencias del monorepo
pnpm install --frozen-lockfile

# 2. Arrancar el API NestJS (terminal 1)
pnpm dev:api
# → http://localhost:18080/api/v1

# 3. Arrancar el desktop Tauri (terminal 2)
pnpm --filter @pjvpin/desktop run tauri:dev
# → ventana Tauri (internamente levanta Vite en http://localhost:1420)
```

> **Importante**: la verificación de login/wizard/dashboard debe hacerse **en la ventana Tauri**, no en Chrome sobre `localhost:1420`. El navegador no expone el contexto IPC de Tauri y rutas como `tauri://` no cargan igual.

Alternativas:

| Necesidad | Comando (desde la raíz) |
|---|---|
| Solo UI web (sin ventana Tauri, sin auth completa) | `pnpm dev:desktop` |
| API en modo prod-like | `pnpm --filter @pjvpin/api run build` && `pnpm --filter @pjvpin/api run start:prod` |
| Levantar API + Vite del desktop en paralelo (sin ventana Tauri) | `pnpm dev` |
| Solo chequeo Rust | `cd apps/desktop/src-tauri && cargo check --no-default-features` |

> **No mezclar `pnpm dev` con `tauri:dev`**: ambos lanzan Vite en el puerto 1420 y colisionan.

---

## Verificación

### Workspace (raíz)

```bash
pnpm typecheck   # tsc --noEmit en api, shared, desktop
pnpm lint        # ESLint en desktop (api/shared son stubs)
pnpm test        # Vitest en desktop + Jest en api
pnpm build       # nest build + tsc && vite build
pnpm check       # typecheck + lint
```

### Backend Rust (apps/desktop/src-tauri)

```bash
cd apps/desktop/src-tauri
cargo check --no-default-features
cargo test  --lib
cargo clippy
```

### E2E del API (requiere MongoDB en `localhost:27017`)

```bash
pnpm --filter @pjvpin/api run test:e2e
```

El e2e conecta a `mongodb://localhost:27017` y opera sobre la base `pjvpin_e2e` (la dropea al inicio y al final). Requiere que `apps/api/.env` provea `JWT_REFRESH_SECRET` (no se sobreescribe en el `beforeAll`).

Regresiones cubiertas:
- Health responde con `ok: true` y claves snake_case.
- Flujo de auth completo (bootstrap → login → session).
- Contrato snake_case en requests y responses.
- **Rate limiting**: `/health/ping` admite más de 5 req/15 min (default global permisivo) y `POST /auth/login` mantiene el límite estricto de 5/15 min devolviendo 429 al saturarlo.

---

## Build de producción

```bash
# Desktop (desde la raíz)
pnpm --filter @pjvpin/desktop run tauri:build:exe        # Solo ejecutable (.exe)
pnpm --filter @pjvpin/desktop run tauri:build:installer  # Instalador NSIS (recomendado)
pnpm --filter @pjvpin/desktop run tauri:build:portable   # ZIP portable con launcher
pnpm --filter @pjvpin/desktop run tauri:build:nsis       # NSIS explícito
pnpm --filter @pjvpin/desktop run tauri:build:msi        # MSI (requiere WiX Toolset)
```

Los scripts delegan en `scripts/tauri-build*.ps1`. El binario resultante se encuentra en `apps/desktop/src-tauri/target/release/pjvpin.exe` (~32 MB).

```bash
# API (desde la raíz)
pnpm --filter @pjvpin/api run build
node apps/api/dist/main.js   # o: pnpm --filter @pjvpin/api run start:prod
```

---

## Servicios externos integrados

| Servicio | Propósito | Autenticación | URL por defecto |
|----------|-----------|---------------|-----------------|
| **MongoDB Atlas** | Almacenamiento principal | URI con credenciales | — |
| **RENIEC** | Consulta de DNI (nombres y apellidos) | Bearer token (`PJVPIN_RENIEC_TOKEN`) | `https://api.decolecta.com/v1` |
| **RENACYT (CONCYTEC)** | Registro y clasificación de investigadores | **Endpoint público** (sin API key) | `https://renacyt.concytec.gob.pe/renacyt-backend` |
| **Pure (Elsevier)** | Sincronización de publicaciones | API key (`PJVPIN_PURE_API_KEY`) | `https://pure.unf.edu.pe/ws/api` |
| **PerúCRIS (CONCYTEC)** | Validación y push CERIF | API key (`PJVPIN_PERUCRIS_API_KEY`) | `https://perucris.example.org/api` |

---

## Roles y permisos

El sistema implementa RBAC con cinco roles predefinidos. Ver `AGENTS.md` para el detalle de la matriz de permisos.

| Rol | Alcance |
|-----|---------|
| `superuser` | Acceso total, único en el sistema, único flujo autorizado para crearlo (wizard de bootstrap) |
| `admin` | Gestión de usuarios, grados, catálogos y todos los CRUDs |
| `operador` | CRUD de investigadores, proyectos, grupos, recursos + exportación de reportes |
| `consulta` | Solo lectura: dashboard, investigadores, proyectos, reportes, grupos |
| `responsable_proyecto` | Solo lectura en su ámbito: dashboard, proyectos, investigadores, reportes, grupos |

---

## Estado del proyecto

**Versión actual:** `0.1.0` (alpha) — en construcción activa.

El proyecto está en etapa de consolidación tras la **migración al monorepo** (apps/desktop + apps/api + packages/shared). El flujo de identificación DNI → RENIEC → RENACYT es de un solo paso, la infraestructura de auditoría y RBAC es estable, y el wire del API es 100 % snake_case. La próxima iteración se enfoca en cobertura E2E continua, firma de ejecutable y endurecimiento de la configuración persistida.

---

## Próximos pasos

- **Firma digital del `.exe`** con code signing (certificado EV) para eliminar los warnings de Windows SmartScreen al instalar.
- **Cifrado de secretos persistidos** en el desktop (actualmente en texto plano) mediante Windows Credential Manager.
- **CI/CD** (actualmente sin `.github/workflows`): gates estáticos + e2e con Mongo de servicio en cada PR.
- **Rate limiting por `username`** en login (hoy es por IP; el target documentado es `username+IP`).
- **Catálogo parametrizable de perfiles** de investigador (actualmente hardcoded).

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│  apps/desktop  (Tauri v2 + React 19 + Vite)                    │
│  ─────────────────────────────────────────                     │
│  features/   { investigadores, proyectos, grupos,              │
│                reportes, recursos, configuracion, wizard }      │
│  shared/     { auth, forms, ui, hooks, utils, api, http, ws }  │
│  src-tauri/  Rust (binario shell + comandos legacy opcionales) │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTP (apiFetch + JWT)
                               │  http://localhost:18080/api/v1
                               ↓
┌────────────────────────────────────────────────────────────────┐
│  apps/api  (NestJS v12 + MongoDB driver + JWT/RBAC/Throttler) │
│  ───────────────────────────────────────────────────────       │
│  src/        { auth, usuarios, investigadores, proyectos,      │
│                recursos, reportes, dashboard, sync, cerif,     │
│                renacyt, pure, perucris, ws, ... }              │
│  test/       app.e2e-spec.ts (supertest, dropDatabase pjvpin_e2e)│
└──────────────────────────────┬─────────────────────────────────┘
                               │ driver 6.x
                               ↓
                          MongoDB Atlas
```

Convenciones clave:
- **Hexagonal**: controllers sin lógica de negocio; DTOs con `class-validator`; guards/interceptors/filters globales.
- **Wire snake_case** en todo el API (sin capas de transformación).
- **JWT stateless**: access (15 m) + refresh (7 d); sesiones en memoria del Rust legacy eliminadas.
- **Throttler**: default global permisivo (100 req/min por endpoint por IP); `POST /auth/login` mantiene el límite estricto de 5/15 min.
- **Sin ORMs**: queries directas al driver oficial de MongoDB; índices `partial_filter_expression` replicados 1:1 desde el modelo legacy.

Para detalle técnico, convenciones de código, comandos disponibles y la deuda técnica conocida, ver [`AGENTS.md`](./AGENTS.md).

---

## IDE recomendado

[Visual Studio Code](https://code.visualstudio.com/) con las extensiones:

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Jest Runner](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) — útil para apps/api.

---

<div align="center">

**Universidad Nacional de Frontera · Vicerrectorado de Investigación**

</div>
