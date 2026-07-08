# PJVPIN

> **VPIN** — Sistema de escritorio para gestión integral de investigación universitaria construido con Tauri v2, React y Rust.

PJVPI centraliza el registro y seguimiento de **investigadores** (docentes, tesistas y alumnos egresados), sus **proyectos**, **grupos de investigación**, **publicaciones** y **recursos** asociados. La aplicación consulta automáticamente los servicios de **RENIEC** y **RENACYT** (CONCYTEC) para validar identidad y clasificación, y exporta reportes operativos a Excel y PDF.

---

## Tabla de contenidos

1. [Características](#características)
2. [Stack tecnológico](#stack-tecnológico)
3. [Requisitos](#requisitos)
4. [Configuración](#configuración)
5. [Desarrollo](#desarrollo)
6. [Verificación](#verificación)
7. [Build de producción](#build-de-producción)
8. [Servicios externos integrados](#servicios-externos-integrados)
9. [Roles y permisos](#roles-y-permisos)
10. [Estado del proyecto](#estado-del-proyecto)
11. [Próximos pasos](#próximos-pasos)
12. [Arquitectura](#arquitectura)
13. [IDE recomendado](#ide-recomendado)

---

## Características

- **Asistente de configuración inicial** con verificación real de conectividad a cada servicio externo antes de habilitar el registro.
- **Identificación automática de investigadores en un solo paso**: el usuario ingresa el DNI, la app valida duplicados, consulta RENIEC para autocompletar nombres y, a continuación, busca el código RENACYT por DNI de forma automática.
- **Tres perfiles de investigador** (`docente`, `tesista`, `alumno_egresado`) configurables al alta y editables.
- **Exportación de reportes** a Excel y PDF con columnas dinámicas (proyectos, investigadores, grupos, recursos, perfil).
- **Sincronización de publicaciones** desde Pure (Elsevier) vía Scopus Author ID.
- **Panel de KPIs y gráficos** con tendencias de proyectos, distribución RENACYT y carga por investigador.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Shell de escritorio | Tauri v2 | 2.10.x |
| Frontend | React + TypeScript | 19.1 / 6.0 |
| Bundler | Vite (Rolldown) | 8.0 |
| Backend | Rust (edition 2021) | 1.85+ |
| Base de datos | MongoDB Atlas (driver oficial) | 3.5 |
| Hashing de contraseñas | Argon2 | 0.5.3 |
| Cliente HTTP | reqwest (rustls-tls) | 0.12 |
| Gráficos | recharts | 3.8 |
| Generación de PDF | @react-pdf/renderer | 4.4 |
| Exportación Excel | exceljs | 4.4 |
| Iconografía | lucide-react | 1.7 |
| Tooltips | @floating-ui/react | 0.27 |

---

## Requisitos

- **Node.js 20+** y npm.
- **Rust 1.85+** con toolchain estable.
- **MongoDB Atlas** (tier gratuito M0 suficiente para desarrollo).
- **Windows 10/11** (target actual del build).
- Opcionales (sin ellos la app funciona en modo degradado):
  - Token de **RENIEC** (consulta de DNI).
  - API key de **Pure** (sincronización de publicaciones).

---

## Configuración

### Variables de entorno (desarrollo)

Crear `.env` en la raíz del proyecto. En producción, las variables se leen desde `%APPDATA%\com.vpin.pjvpin\pjvpin.env`.

```env
PJVPIN_MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/?appName=pjvpin
PJVPIN_MONGODB_DB=pjvpin
PJVPIN_RENIEC_API_BASE_URL=https://api.decolecta.com/v1
PJVPIN_RENIEC_TOKEN=<token_opcional>
PJVPIN_RENACYT_API_BASE_URL=https://renacyt.concytec.gob.pe/renacyt-backend
PJVPIN_RENACYT_ACTO_VERSION=2021
PJVPIN_PURE_API_BASE_URL=https://pure.unf.edu.pe/ws/api
PJVPIN_PURE_API_KEY=<api_key_pure>
```

Las URLs por defecto viven en `src-tauri/src/shared/defaults.rs` (Rust) y `src/shared/config/defaults.ts` (frontend); nunca hardcodearlas en otro sitio.

### Asistente de configuración (wizard)

En el primer arranque, si la colección `usuarios` de MongoDB está vacía, la aplicación muestra un asistente de **5 pasos**:

1. **Contraseña maestra** del archivo de configuración.
2. **Credenciales** de servicios externos (MongoDB obligatorio, RENIEC/RENACYT/Pure opcionales).
3. **Test de conectividad** contra los endpoints reales de cada servicio con DNIs/CTI Vitae públicos de prueba.
4. **Creación del primer usuario `superuser`** con validación de DNI vía RENIEC (si está configurado) o ingreso manual.
5. **Resumen final** para guardar la configuración y arrancar la app.

El wizard se vuelve a mostrar si el archivo de configuración se borra o si la colección `usuarios` queda vacía tras un reset de la base de datos.

### Migración desde una instalación previa

Si la base de datos contiene la colección `docentes` (versión previa al rename `docente → investigador`), ejecutar **una sola vez** el script de migración incluido:

```bash
mongosh "$PJVPIN_MONGODB_URI/$PJVPIN_MONGODB_DB" scripts/migrate-investigadores.js
```

El script renombra la colección a `investigadores` y añade el campo `perfil: "docente"` a los registros existentes. El campo `id_docente` dentro de cada documento se preserva para mantener compatibilidad con la colección `participaciones` y los registros de publicaciones.

---

## Desarrollo

```bash
npm install
npm run tauri:dev      # Dev con ventana desktop
npm run dev            # Solo Vite (puerto 1420)
```

---

## Verificación

### Frontend (React + TypeScript)

```bash
npm run check          # ESLint + tsc --noEmit
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run test           # Vitest
npm run build          # Vite build de producción
```

### Backend (Rust)

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test  --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --manifest-path src-tauri/Cargo.toml
```

---

## Build de producción

```bash
npm run tauri:build:exe        # Solo ejecutable (.exe)
npm run tauri:build:installer  # Instalador NSIS (recomendado)
npm run tauri:build:portable   # ZIP portable con launcher
```

`tauri:build:msi` requiere WiX Toolset; `tauri:build:nsis` es el bundle por defecto.

El binario resultante se encuentra en `src-tauri/target/release/pjvpin.exe` (~32 MB).

---

## Servicios externos integrados

| Servicio | Propósito | Autenticación | URL por defecto |
|----------|-----------|---------------|-----------------|
| **MongoDB Atlas** | Almacenamiento principal | URI con credenciales | — |
| **RENIEC** | Consulta de DNI (nombres y apellidos) | Bearer token (`PJVPIN_RENIEC_TOKEN`) | `https://api.decolecta.com/v1` |
| **RENACYT (CONCYTEC)** | Registro y clasificación de investigadores | **Endpoint público** (sin API key) | `https://renacyt.concytec.gob.pe/renacyt-backend` |
| **Pure (Elsevier)** | Sincronización de publicaciones vía Scopus Author ID | API key (`PJVPIN_PURE_API_KEY`) | `https://pure.unf.edu.pe/ws/api` |

El endpoint de búsqueda RENACYT por DNI (`/actoRegistral/obtenerActosRegistralesActivos`) es público y se valida durante el wizard con un DNI de prueba. Si el token de RENIEC no está configurado, la app permite registrar nombres manualmente.

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

El proyecto está en etapa de consolidación: la refactorización mayor `docente → investigador` con campo `perfil` está completada, el flujo de identificación DNI → RENIEC → RENACYT ya es de un solo paso, y la infraestructura de auditoría y RBAC es estable. La próxima iteración se enfoca en producción (firma de ejecutable, cifrado de configuración) y cobertura de pruebas E2E.

---

## Próximos pasos

- **Firma digital del `.exe`** con code signing (certificado EV) para eliminar los warnings de Windows SmartScreen al instalar.
- **Cifrado de `pjvpin.config.json` en disco** mediante Windows Credential Manager (actualmente en texto plano dentro de `%APPDATA%\com.vpin.pjvpin\`).
- **Migración del campo `id_docente` → `id_investigador`** en documentos MongoDB (actualmente preservado con `#[serde(rename)]` para mantener compatibilidad; se consolidará en `v0.2.0` con un script de cleanup).
- **Catálogo parametrizable de perfiles** de investigador (actualmente hardcoded con tres valores: `docente`, `tesista`, `alumno_egresado`; el siguiente paso es permitir gestión dinámica vía la UI de catálogos).
- **Auditoría completa de operaciones multi-documento**, particularmente en recursos y en operaciones `update` / `reactivate` que hoy solo registran el evento en algunos casos.

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript)                                │
│  ──────────────────────────────                               │
│  features/     { investigadores, proyectos, grupos,            │
│                 reportes, recursos, configuracion, wizard }     │
│  shared/       { auth, forms, ui, hooks, utils }              │
│  services/     tauri IPC wrappers                              │
└──────────────────────────────┬─────────────────────────────────┘
                               │ Tauri IPC (invoke)
                               ↓
┌────────────────────────────────────────────────────────────────┐
│  Backend (Rust)                                                │
│  ────────────────                                              │
│  commands/  →  services/  →  repository/  →  MongoDB           │
│       └─→ shared/external/{reniec, renacyt, pure}_client.rs   │
└────────────────────────────────────────────────────────────────┘
```

- **Screaming Architecture:** cada feature es un módulo autocontenido con sus propios modelos, comandos, servicios y repositorios.
- **Single Responsibility:** un archivo = una responsabilidad; los hooks de React no superan las 200 líneas.
- **DRY:** helpers compartidos en `shared/utils/` y `shared/forms/`.
- **Sin ORMs:** queries directas al driver oficial de MongoDB.

Para detalle técnico, convenciones de código, comandos disponibles y la deuda técnica conocida, ver [`AGENTS.md`](./AGENTS.md).

---

## IDE recomendado

[Visual Studio Code](https://code.visualstudio.com/) con las extensiones:

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

<div align="center">

**Universidad Nacional de Frontera · Vicerrectorado de Investigación**

</div>
