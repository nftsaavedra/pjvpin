# PJVPI

Aplicación de escritorio para gestión de grados académicos, docentes y proyectos de investigación. Construida con Tauri v2, React y TypeScript, con backend en Rust.

## Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust (Tauri v2)
- **Base de datos**: MongoDB (Atlas)

## Configuración

En desarrollo use `.env` en la raíz. En producción, edite `%APPDATA%\com.vpin.pjvpin\pjvpin.env`.

```env
PJVPIN_MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/?appName=pjvpin
PJVPIN_MONGODB_DB=pjvpin
PJVPIN_RENIEC_API_BASE_URL=https://api.decolecta.com/v1
PJVPIN_RENIEC_TOKEN=<token_opcional>
PJVPIN_PURE_API_BASE_URL=https://pure.unf.edu.pe/ws/api
PJVPIN_PURE_API_KEY=<tu_api_key_pure>
```

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PJVPIN_MONGODB_URI` | URI de conexión a MongoDB | Sí |
| `PJVPIN_MONGODB_DB` | Nombre de la base de datos | No (default: `pjvpin`) |
| `PJVPIN_PURE_API_BASE_URL` | URL base API de Pure | No (default: `https://pure.unf.edu.pe/ws/api`) |
| `PJVPIN_PURE_API_KEY` | API key para sincronización con Pure | Sí (solo para sync Pure) |
| `PJVPIN_RENIEC_API_BASE_URL` | URL base API RENIEC | No (default: `https://api.decolecta.com/v1`) |
| `PJVPIN_RENIEC_TOKEN` | Token API para consulta de DNI | No |

## Desarrollo

```bash
npm install
npm run tauri:dev
```

## Build

```bash
# Solo ejecutable (.exe)
npm run tauri:build:exe

# Instalador NSIS (recomendado)
npm run tauri:build:installer

# Portable (ZIP con launcher)
npm run tauri:build:portable

# Targets explícitos
npm run tauri:build:nsis
npm run tauri:build:msi
```

> `msi` requiere WiX Toolset. `nsis` es el bundle por defecto del proyecto.

## Verificación

```bash
cd src-tauri && cargo check
npm run build
```

## Arquitectura

```
Frontend (React) → Tauri IPC → Rust Commands → Services → MongoDB
```

- Screaming Architecture: cada feature (`docentes/`, `proyectos/`, `grupos/`, etc.) tiene sus propios modelos, comandos, servicio y repositorio.
- Ver [docs/mongodb-primary-plan.md](docs/mongodb-primary-plan.md) y [AGENTS.md](AGENTS.md) para detalles de arquitectura.

## IDE Recomendado

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
