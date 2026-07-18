# Plan — Refactor Integral del Módulo `configuracion`

**Estado:** Pendiente de aprobación  
**Scope:** Frontend (React/TS) + Backend (Rust/Tauri) + CSS  
**Decisiones del usuario (confirmadas):**
- Edición de identidad Usuario: **Fix + integrar Persona** (romper carve-out)
- Backend catálogos/grados: **Migrar a separación hexagonal** (`*Doc`/`*Dto`/`*Request`)
- RBAC: **Crear `CatalogosRead` + migrar handlers**
- Tests backend: **Sí, mínimos** (~20–30 tests nuevos)

---

## Resumen ejecutivo

El módulo `configuracion` presenta **desorden visual severo** con 17 hallazgos
auditoría (1 crítico visual, 1 crítico funcional, 8 medios). Es el tab más
complejo del sistema (1,664 líneas frontend + 2,920 líneas backend) y acumula
deuda técnica desde v0.1.0. El plan es **6 fases incrementales** que atacan
primero lo visual/funcional (alto impacto, bajo riesgo) y después lo
arquitectónico (medio impacto, medio riesgo):

| Fase | Objetivo | Riesgo | Líneas aprox. |
|------|----------|:------:|--------------:|
| **A** | Restore visual del tab padre + accesibilidad | Bajo | ~250 |
| **B** | Bug edición identidad Usuario + integrar Persona | Medio | ~400 |
| **C** | Backend hexagonal catálogos/grados | Medio | ~350 |
| **D** | RBAC: nuevo `CatalogosRead` + migrar handlers | Bajo | ~120 |
| **E** | Tests backend (DTOs, models, mappers, RBAC) | Bajo | ~300 |
| **F** | Optimización `CatalogosPanel` +pending UI | Bajo | ~150 |
| **G** | Quality gates + commit + push | — | — |

**Total:** ~1,570 líneas añadidas/modificadas, 0 nuevos archivos front, 4 nuevos
archivos backend (Doc structs x2 + tests x2).

---

## Fase A — Restore visual + accesibilidad (frontend, prioridad absoluta)

### A.1 Reparar `ConfiguracionTab.tsx` (CSS roto + usar `TabNavigation`)

**Problema:** `ConfiguracionTab.tsx:88-108` usa clases `settings-layout`,
`settings-nav-panel`, `settings-nav-button`, `settings-nav-icon`,
`settings-nav-copy` que **no existen** en ningún stylesheet. Solo `settings.css`
define `settings-shell`, `settings-nav`, `settings-nav-btn` — nombres
incompatibles. El tab se renderiza sin estilos funcionales (solo Tailwind base).

**Solución:**
1. Eliminar implementación ad-hoc de tabs en `ConfiguracionTab.tsx:88-111` y
   reemplazar por `<TabNavigation>` compartido con `variant="settings"`.
2. Migrar `tabId`/`activeTab` al contrato de `Tab` (`id`, `label`, `icon`,
   `description`) ya provisto por `TabNavigation`.
3. Conservar el panel `role="tabpanel"` con `aria-labelledby` en el wrapper.

**Archivos:**
- `src/features/configuracion/ConfiguracionTab.tsx` — refactor completo (~137 → ~80 líneas)
- `src/shared/navigation/TabNavigation.tsx:13-21` — agregar `variant: 'topbar' | 'sidebar' | 'settings'` al tipo
- `src/shared/navigation/TabNavigation.tsx:74` — rama `variant === 'settings'` que reenderiza botones con icono+label+descripción en estilo claro (similar a sidebar expandido pero light)
- `src/assets/styles/tabs.css` — añadir:
  ```css
  .tab-navigation-settings {
    @apply flex gap-2 flex-wrap border-b border-gray-200 pb-2;
  }
  .tab-navigation-settings .tab-button-settings {
    @apply px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent cursor-pointer transition-all duration-200 bg-transparent text-gray-600 flex items-center gap-2.5;
  }
  .tab-navigation-settings .tab-button-settings:hover { @apply text-gray-900 bg-gray-100; }
  .tab-navigation-settings .tab-button-settings:focus-visible { @apply outline-none ring-2 ring-blue-300 bg-blue-50; }
  .tab-navigation-settings .tab-button-settings.active {
    @apply text-blue-700 bg-blue-50 border-blue-200 shadow-sm;
  }
  .tab-navigation-settings .tab-button-settings-icon { @apply flex-shrink-0; }
  .tab-navigation-settings .tab-button-settings-copy { @apply flex flex-col gap-0.5; }
  .tab-navigation-settings .tab-button-settings-label { @apply text-sm font-semibold; }
  .tab-navigation-settings .tab-button-settings-description { @apply text-xs font-normal text-gray-500; }
  ```
- `src/assets/styles/settings.css` — **eliminar archivo completo** (clases
  `settings-*` no usadas por componente migrado; `tab-navigation-settings` las
  reemplaza). Verificar con `grep "settings-shell\|settings-nav\|settings-content\|settings-hero-badges"` antes de borrar.

### A.2 Eliminar render redundante `currentUser ?`

`ConfiguracionTab.tsx:122` y `:130` — los chequeos `currentUser ? <GradosTab/> : null` son redundantes: `ConfiguracionTab` ya retorna null si no hay `currentUser`.

**Solución:** Simplificar a `<GradosTab .../>` directo (tab padre garantiza no-null).

### A.3 Añadir `scope="col"` a todas las tablas del módulo

12-13 `<th>` sin `scope` → WCAG 2.2 (H63):

| Archivo | Líneas | Count |
|---------|--------|------:|
| `UsuariosTab.tsx` | 148-153 | 6 |
| `GradosTab.tsx` | 203-205 | 3 |
| `CatalogosTab.tsx` | 241-244 | 3-4 |

**Solución:** Añadir `scope="col"` a cada `<th>`.

### A.4 Envolver forms de los 3 `FormModal` en `<div className="p-6">`

AGENTS.md: "Cualquier `<form className="form">` debe envolverse en `<div className="p-6">` dentro de la card".

| Archivo | Línea del FormModal | Estado |
|---------|---------------------|--------|
| `UsuariosTab.tsx` | 224 | **Falta** |
| `GradosTab.tsx` | 252 | **Falta** |
| `CatalogosTab.tsx` | 296 | **Falta** |

**Solución:** Envolver el contenido dentro de `<form>` en `<div className="form-modal-form-wrapper"><div className="p-6"> ... </div></div>`. Patrón idéntico al ya existente en `AuthScreen.tsx`. Mantener la estructura del footer fuera del `p-6` para que los botones queden en el borde inferior.

### A.5 Reemplazar prosa redundante por `<FieldHelpTooltip>`

| Archivo | Línea | Texto a eliminar |
|---------|-------|-------------------|
| `GradosTab.tsx` | 260 | "Complete la información base..." |
| `CatalogosTab.tsx` | 305 | "Complete la información..." |
| `UsuariosTab.tsx` | 285-287 | "La edicion de identidad se gestiona..." (con typo) |
| `UsuariosTab.tsx` | 312-316 | Texto duplicado del anterior |

**Solución:**
- En los `FormModal` de grados y catálogos, eliminar la prop `description` y
  poner un `<FieldHelpTooltip content="..." label="Ayuda" />` al lado del
  `<h2>` del título de cada modal en el header.
- En `UsuariosTab`, eliminar ambos bloques de prosa del body. Si se requiere
  contexto, mover a `FieldHelpTooltip` en el título del modal. **Importante:**
  el texto se elimina completamente cuando se implemente Fase B (los campos
  de nombres pasan a ser editables).

### A.6 Typo "edicion" → "edición"

`UsuariosTab.tsx:285` — se elimina en A.5.

### A.7 Memoizar cálculos de `totalActivos`/`totalInactivos`

`GradosTab.tsx:128-129` y `CatalogosTab.tsx:163-164` recalculan en cada render.

**Solución:** Envolver en `useMemo` como ya hace `useUsuariosTab.ts:163-170`.

### A.8 Quality gate Fase A

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
Esperado: 0 errores, 27/27 tests, build OK (sin Tauri necesario).

---

## Fase B — Bug edición identidad + integrar Persona

### B.1 Diagnóstico del bug

`useUsuariosTab.ts:114-120` (`handleEditar`):
```ts
dni.loadFromPersona({
  dni: usuario.dni,
  nombres: "",        // ← siempre vacío
  apellidoPaterno: "", // ← siempre vacío
  apellidoMaterno: "", // ← siempre vacío
});
```

El hook `useDniValidation.loadFromPersona` (`useDniValidation.ts:92-105`)
setea `validatedDni` y `status="validated"`, pero los campos de nombres
quedan vacíos. En la UI, los inputs aparecen deshabilitados con valores
vacíos — el usuario no ve el nombre del usuario editado.

**Causa raíz:** `UsuarioDto` solo desnormaliza `nombre_completo` (string
compuesto), NO los campos `nombres`/`apellido_paterno`/`apellido_materno`
separados que viven en la colección `personas`. El wizard de creación sí
captura esos campos porque el frontend los envía, pero la lectura del
usuario nunca los trae de vuelta.

### B.2 Diseño de la solución (backend + frontend)

**Decisión:** NO añadir `nombres/apellido_paterno/apellido_materno` a
`UsuarioDto` (evitar inflar el DTO hot-path). En su lugar, exponer un nuevo
comando `consultar_persona_de_usuario(id_usuario) -> PersonaDto` que el
frontend invoca al abrir el modal de edición.

**Backend (Rust):**

1. **`src-tauri/src/personas/mod.rs`**: añadir `pub mod commands;` (nuevo).
2. **`src-tauri/src/personas/commands.rs`** (nuevo, ~50 líneas):
   ```rust
   #[tauri::command]
   pub async fn consultar_persona_de_usuario(
       window: tauri::Window,
       state: tauri::State<'_, crate::shared::state::AppState>,
       id_usuario: String,
   ) -> Result<PersonaDto, AppError> {
       crate::personas::handlers::consultar_persona_de_usuario(&window, &state, id_usuario).await
   }
   ```
3. **`src-tauri/src/personas/handlers.rs`** (nuevo, ~40 líneas):
   - `consultar_persona_de_usuario`: requiere `UsuariosManage` (vía `rbac::require_permission`), obtiene el usuario desde `usuarios::repository::find_by_id`, extrae `persona_id`, llama `personas::repository::find_by_id_persona`, devuelve `PersonaDto`. No audita (operación de lectura).
4. **`src-tauri/src/personas/dto.rs`** (actual): verificar que `PersonaDto` derive `Serialize` y rename si faltare (auditoría: ya serializa en snake_case, ok).
5. **`src-tauri/src/personas/mod.rs`**: añadir `pub mod handlers;`.
6. **`src-tauri/src/lib.rs`**: registrar `consultar_persona_de_usuario` en `invoke_handler`.

**Extender `actualizar_usuario` para persistir identidad:**

7. **`src-tauri/src/usuarios/dto.rs`**: extender `UpdateUsuarioRequest` con
   campos opcionales de identidad:
   ```rust
   #[serde(default)]
   pub nombres: Option<String>,
   #[serde(default)]
   pub apellido_paterno: Option<String>,
   #[serde(default)]
   pub apellido_materno: Option<String>,
   ```
   (mantiene `#[serde(rename_all = "camelCase")]`)

8. **`src-tauri/src/usuarios/handlers.rs:169`** (`handle_actualizar_usuario`): tras validar el actor, si `request.nombres` o `apellido_paterno` están presentes, llamar a `personas::repository::update(db, persona_id, UpdatePersonaRequest { nombres, apellido_paterno, apellido_materno, ..None })`. Si la persona no existe o no está vinculada, ignorar silenciosamente (no fallar toda la actualización).
9. **`src-tauri/src/usuarios/repository.rs:518`** (`update_usuario`): añadir
   parámetro opcional `identity_update: Option<(String, UpdatePersonaRequest)>`
   y propagar a `personas::repository::update` tras el `update_one` exitoso.
   Repoblar `nombre_completo` en el DTO retornado desde la persona actualizada.

**Frontend (TS):**

10. **`src/shared/tauri/types/catalogo.types.ts`**: añadir interfaz `Persona`:
    ```ts
    export interface Persona {
      id_persona: string;
      dni: string | null;
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string | null;
      nombre_completo: string;
      activo: number;
    }
    ```
11. **`src/shared/tauri/types/index.ts`**: export `Persona`.
12. **`src/shared/tauri/configuracion.ts`**: añadir wrapper `consultarPersonaDeUsuario(idUsuario: string)`.
13. **`src/shared/tauri/configuracion.ts`**: extender `actualizarUsuario` (wrapper actual) para aceptar
    `nombres?`, `apellidoPaterno?`, `apellidoMaterno?` opcionales.
14. **`src/features/configuracion/usuarios/hooks/useUsuariosTab.ts`** (`handleEditar:109-125`):
    - Tras `setEditingUsuario`, invocar `await consultarPersonaDeUsuario(usuario.id_usuario)`.
    - Mostrar spinner en el modal durante la carga (nuevo estado `isCargandoPersona`).
    - Si la persona se carga: `dni.loadFromPersona({ dni: usuario.dni, nombres: persona.nombres, apellidoPaterno: persona.apellido_paterno, apellidoMaterno: persona.apellido_materno ?? "" })`.
    - Si falla (persona no vinculada): `dni.reset()` y mostrar advertencia en toast.
    - Añadir `try/catch` con `getTauriErrorMessage`.
15. **`src/features/configuracion/usuarios/UsuariosTab.tsx`** (form modal):
    - Habilitar los inputs de nombres/apellidos en modo edición (actualmente
      están bajo `{!isEditing && ...}` que los oculta en edición).
    - Cambiar la condición a `{(dni.isValidated || isEditing) && (...)}` para
      mostrarlos siempre que haya DNI válido o estemos editando.
    - En modo edición, los inputs son editables (no `disabled`).
    - Añadir indicador de carga: si `isCargandoPersona`, mostrar `<SkeletonBlock>` dentro del modal mientras se obtiene la persona.
16. **`src/features/configuracion/usuarios/hooks/useUsuariosTab.ts`** (`handleSubmit:50`):
    - En la rama `editingUsuario`, si `dni.nombres` o `dni.apellidoPaterno`
      cambiaron respecto a los cargados, incluirlos en `actualizarUsuario(... )`.

**Auditoría:** `actualizar_usuario` ya audita `usuario.update`. La sub-operación de identidad (`persona.update`) debe generar registro de auditoría adicional con dos campos: `usuario.update` para el usuario, `usuario.identity.update` para la persona. Reutilizar `audit::log_op` con actor/target=persona_id.

**Invariantes preservadas:**
- Invariante #5 (no auto-cambio de rol): sigue en `validations.rs:67-76`, sin cambios.
- Edición del DNI de un usuario existente: **NO permitida** (out of scope
  explícito — el DNI es identity key de la persona; cambiarlo requiere otro
  flujo). El input de DNI sigue **`disabled` en edición**.

### B.3 Pruebas de Fase B (backend)

- Test unitario en `usuarios/dto_tests.rs`: `update_request_accepts_identity_fields_camelCase`.
- Test en `usuarios/validations_tests.rs`: `actualizar_usuario_preserves_existing_persona_when_identity_unchanged`.

### B.4 Quality gate Fase B

```bash
cargo check --no-default-features
cargo test --lib
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## Fase C — Backend hexagonal catálogos y grados

### C.1 Estado actual (no hexagonal)

Tanto `catalogos/dto.rs` como `grados/dto.rs` usan **un único struct Dto**
tanto para BSON (persistencia) como para IPC (wire). Esto viola el
principio hexagonal que `usuarios/dto.rs` sí respeta con `*Doc`/`*Dto`/`*Request`.

### C.2 Refactor `catalogos/dto.rs`

**Antes (33 líneas, 3 structs):**
- `CatalogoItemDto` (Ser/Deser BSON+IPC, snake)
- `EliminarCatalogoResultadoDto` (Salida)
- `CreateCatalogoRequest` (Entrada, sin rename)

**Después (~70 líneas, 4 structs):**
```rust
// Persistencia (BSON): snake_case, sin rename_all
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogoItemDoc {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub orden: Option<i64>,
    pub activo: i64,
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

// IPC Salida: snake_case, solo Serialize
#[derive(Debug, Clone, Serialize)]
pub struct CatalogoItemDto {
    pub id_catalogo: String,
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub orden: Option<i64>,
    pub activo: i64,
    pub updated_at: Option<i64>,
}

// IPC Entrada: camelCase
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCatalogoRequest {
    pub tipo: String,
    pub codigo: String,
    pub nombre: String,
    #[serde(default)]
    pub descripcion: Option<String>,
    #[serde(default)]
    pub orden: Option<i64>,
}

// Resultado eliminación
#[derive(Debug, Clone, Serialize)]
pub struct EliminarCatalogoResultadoDto {
    pub id_catalogo: String,
    pub fue_eliminado: bool,
    pub fue_desactivado: bool,
}
```

**Atención: `descripcion` es `Option<String>` en backend** (TS ya lo tipa
como `string | null`). Confirmar al leer `CatalogoItem` model.

### C.3 Refactor `catalogos/repository.rs`

- Sustituir `doc_to_dto` por `doc_to_doc` (BSON → `CatalogoItemDoc`).
- Sustituir `dto_to_model`/`model_to_dto` por:
  - `fn doc_to_model(doc: CatalogoItemDoc) -> Result<CatalogoItem, AppError>` (vía `CatalogoItem::new`)
  - `fn model_to_dto(m: &CatalogoItem) -> CatalogoItemDto` (manual como en usuarios)
- Implementar `From<CatalogoItemDoc> for CatalogoItem` y `From<CatalogoItem> for CatalogoItemDto` en `models.rs` con `try_from` para validación.
- Actualizar `seed_catalogos` para insertar `CatalogoItemDoc` (no `CatalogoItemDto`).

### C.4 Refactor `grados/dto.rs` y `grados/repository.rs`

Mismo patrón: añadir `GradoAcademicoDoc` (BSON), separar `GradoAcademicoDto` (solo Serialize), añadir `#[serde(rename_all = "camelCase")]` a `CreateGradoRequest`.

### C.5 Bug `update_grado` no actualiza `updated_at`

`grados/repository.rs:78-81` — el `$set` no incluye `updated_at`. Comparar con `update_catalogo:116-122` que sí lo hace. **Corregir** añadiendo `time::now_ms()` al `$set`:
```rust
doc! { "$set": {
    "nombre": request.nombre,
    "descripcion": request.descripcion,
    "updated_at": time::now_ms(),
}}
```

### C.6 Mismatch TS `activo: number` vs Rust `activo: i64`

`catalogo.types.ts:1`: `GradoAcademico.activo?: number` (opcional), Rust `i64` (obligatorio).

**Solución:** Hacer `activo: number` (no opcional) en TS para reflejar que el backend siempre lo envía. Alineación con `UsuarioDto` que también lo envía siempre.

### C.7 TS `CatalogoItem` faltan `updated_at`

`catalogo.types.ts:13` — `CatalogoItem` no incluye `updated_at` pero Rust sí lo
envía. **Añadir** `updated_at?: number` opcional (TS lo puede ignorar).

### C.8 Quality gate Fase C

```bash
cargo check --no-default-features   # 0 warnings
cargo test --lib
npm run typecheck
npm run build
```

---

## Fase D — Refactor RBAC: nuevo permiso `CatalogosRead`

### D.1 Estado actual

| Comando | Permiso actual | Semántica correcta |
|---------|---------------|---------------------|
| `get_catalogos` (handler) | `GradosRead` | `CatalogosRead` (no existe) |
| `get_all_catalogos_admin` (handler) | `GradosManage` | `CatalogosManage` |
| `crear_catalogo`/`actualizar_catalogo`/... | `CatalogosManage` | `CatalogosManage` ✓ |
| ConfiguracionTab.tsx:49 (frontend) | `grados.manage` para mostrar tab Catálogos | `catalogos.view` o `catalogos.manage` |

`CatalogosManage` y `GradosManage` son **redundantes** (mismos roles), pero
funcionan por la matriz. `CatalogosRead` no existe.

### D.2 Backend

1. **`src-tauri/src/shared/rbac.rs:7`**: añadir variante `CatalogosRead` al enum `AppPermission`.
2. **`src-tauri/src/shared/rbac.rs`** (matriz): añadir `CatalogosRead` a los roles `superuser`, `admin`, `operador` (mismos que `GradosRead` actual).
3. **`src-tauri/src/catalogos/handlers.rs:13`** (`handle_get_catalogos`): cambiar `require_permission(... GradosRead)` → `CatalogosRead`.
4. **`src-tauri/src/catalogos/handlers.rs:22`** (`handle_get_all_catalogos_admin`): cambiar `GradosManage` → `CatalogosManage`.
5. **`src-tauri/src/usuarios/handlers.rs:148`** (`handle_get_all_usuarios`): mover `rbac::require_permission(... UsuariosManage)` explícitamente al handler (elimina bypass vía `validar_actor_admin`).
6. **`src-tauri/src/usuarios/handlers.rs:157`** (`handle_get_all_usuarios_paginated`): idem.
7. **`src-tauri/src/usuarios/repository.rs:148`**: evaluar si `validar_actor_admin` se puede eliminar tras mover el check al handler. Si se elimina, borrar también la función y su test si existe.

### D.3 Frontend

8. **`src/shared/auth/permissions.ts`**: añadir `'catalogos.view'` y mapear `CatalogosRead` (si hay mapeo explícito).
9. **`src/features/configuracion/ConfiguracionTab.tsx:49`**: cambiar el chequeo del tab Catálogos de `'grados.manage'` a `'catalogos.view'` (si existe) o `'catalogos.manage'` si se prefiere exigir manage. **Decisión:** usar `'catalogos.view'` (alineado a `GradosRead` para visibilidad de tablero). Si no existe `catalogos.view`, crear el mapeo.
10. **`src/features/configuracion/catalogos/CatalogosPanel.tsx:128`**: recibir `canManage` como prop (dejar de hardcodear `true`). Pasar desde `ConfiguracionTab`.

### D.4 Health check

```bash
cargo test --lib
# Verificar que matriz de permisos en tests refleja el nuevo CatalogosRead
```

---

## Fase E — Tests backend catálogos/grados

### E.1 Objetivo

Catálogos y grados tienen **0 tests** en backend. Usuarios tiene 23. Añadir
tests que cubran:
- Deserialización DTOs de entrada con camelCase (regresión Fase C).
- Mappers `Doc → Model → Dto` (regresión Fase C).
- RBAC: matriz de permisos incluye `CatalogosRead` (regresión Fase D).

### E.2 Archivos nuevos

- `src-tauri/src/catalogos/dto_tests.rs` (~80 líneas): 4 tests
  - `create_catalogo_request_accepts_camel_case`
  - `create_catalogo_request_optional_fields_default_to_none`
  - `catalogo_item_doc_roundtrip_bson`
  - `model_to_dto_preserves_fields`

- `src-tauri/src/grados/dto_tests.rs` (~80 líneas): 4 tests
  - `create_grado_request_accepts_camel_case`
  - `create_grado_request_optional_fields_default_to_none`
  - `grado_doc_roundtrip_bson`
  - `model_to_dto_preserves_fields`

- Extender `src-tauri/src/shared/rbac.rs` (inline tests): 2 tests
  - `catalogos_read_in_superuser_admin_operador`
  - `catalogos_manage_excludes_consulta_responsable`

### E.3 Registration

- `src-tauri/src/catalogos/mod.rs`: `#[cfg(test)] mod dto_tests;`
- `src-tauri/src/grados/mod.rs`: `#[cfg(test)] mod dto_tests;`

### E.4 Tests para Fase B (edición identidad)

- En `src-tauri/src/usuarios/dto_tests.rs`: añadir `update_request_accepts_identity_fields_camel_case`.
- En `src-tauri/src/usuarios/validations_tests.rs`: añadir `actualizar_usuario_preserves_persona_id_when_identity_unchanged`.

### E.5 Comando de validación

```bash
cargo test --lib
```
Esperado: **71 (baseline) + 10 nuevos = 81 tests**.

---

## Fase F — Pendientes UI/UX menores y performance

### F.1 `CatalogosPanel` paralelizar stats

`CatalogosPanel.tsx:90-108` — `fetchAll()` hace 6 `await` en serie. Cambiar
a `Promise.allSettled` con array de 6 promesas. Si una falla, su stat queda
en 0 sin interrumpir el resto (mejor UX que el catch silencioso actual).

### F.2 `CatalogosPanel` eliminar `currentUser: unknown`

`CatalogosPanel.tsx:75` — tipar como `Usuario | null` somente.

### F.3 Dolar duplicado

`CatalogosPanel.tsx:53,55` — `DollarSign` para "General" y "Monedas". Usar
`Coins` o `Banknote` para "Monedas" (ambos en lucide-react).

### F.4 `RoleMatrixCard` component

Extraer `.role-matrix-card` / `.role-matrix-card-active` (role-matrix.css, 7
líneas) a un componente compartido `src/features/configuracion/usuarios/components/RoleMatrixCard.tsx`.
Props: `rolActivo`, `rolValue`, `label`, `description`, `onClick`.
Añadir `role="radio"` y `aria-checked` para que sea accesible como radio group.
Mover `role-matrix.css` a ese componente si es necesario, o dejarlo global.

### F.5 Estado vacío visual

`ConfiguracionTab` no muestra empty state si el usuario no tiene permisos
para ninguna sub-sección (grados+catalogos+usuarios inaccesibles). Añadir:
```tsx
{tabsVisibles.length === 0 && (
  <div className="empty-state">
    <p>No tiene permisos para acceder a ninguna sección de configuración.</p>
  </div>
)}
```

### F.6 Quality gate Fase F

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## Fase G — Quality gates finales + commit + push

### G.1 Gates obligatorios (según AGENTS.md)

```bash
npm run typecheck         # 0 errores
npm run lint               # baseline 6 errors + 4 warnings preexistentes (objetivo: 0 + 0)
npm run test               # 27/27 vitest (si no se añaden tests front)
cargo check --no-default-features  # 0 warnings
cargo test --lib           # 81/81 (71 baseline + 10 nuevos)
npm run build              # OK
```

### G.2 Commits sugeridos (uno por fase)

```
fix(configuracion): restore visual tabs + a11y (scope, padding, tooltip)
fix(usuarios): edición identidad integra Persona con consult+update
refactor(catalogos,grados): separación hexagonal Doc/Dto/Request + bug updated_at grados
refactor(rbac): nuevo permiso CatalogosRead + migrar handlers
test(catalogos,grados,usuarios): DTOs, mappers y RBAC
feat(configuracion): CatalogosPanel parallel stats + RoleMatrixCard + empty state
```

### G.3 Push

```bash
git push origin main
```

---

## Tabla de archivos impactados

### Frontend (15 archivos)

| Archivo | Fase | Cambio |
|---------|:----:|--------|
| `src/features/configuracion/ConfiguracionTab.tsx` | A, D, F | Refactor completo (~137→~80) |
| `src/features/configuracion/grados/GradosTab.tsx` | A | scope th, p-6, tooltip, useMemo |
| `src/features/configuracion/grados/GradosTab.tsx` | C | (no change) — consume tipos actualizados |
| `src/features/configuracion/catalogos/CatalogosTab.tsx` | A | scope th, p-6, tooltip, useMemo |
| `src/features/configuracion/catalogos/CatalogosPanel.tsx` | D, F | canManage prop, Promise.allSettled, tipado, icono |
| `src/features/configuracion/usuarios/UsuariosTab.tsx` | A, B | scope th, p-6, edición identidad |
| `src/features/configuracion/usuarios/hooks/useUsuariosTab.ts` | B | handleEditar + handleSubmit + estado |
| `src/features/configuracion/usuarios/components/RoleMatrixCard.tsx` | F | **NUEVO** |
| `src/shared/navigation/TabNavigation.tsx` | A | variant="settings" |
| `src/assets/styles/tabs.css` | A | .tab-navigation-settings classes |
| `src/assets/styles/settings.css` | A | Eliminar |
| `src/shared/tauri/types/catalogo.types.ts` | B, C | Persona + activo/updated_at |
| `src/shared/tauri/types/index.ts` | B | export Persona |
| `src/shared/tauri/configuracion.ts` | B | consultarPersonaDeUsuario + identidad |
| `src/shared/auth/permissions.ts` | D | catalogos.view |

### Backend (15 archivos, 4 nuevos)

| Archivo | Fase | Cambio |
|---------|:----:|--------|
| `src-tauri/src/personas/mod.rs` | B | exportar commands, handlers |
| `src-tauri/src/personas/commands.rs` | B | **NUEVO** — consultar_persona_de_usuario |
| `src-tauri/src/personas/handlers.rs` | B | **NUEVO** — handler Persona consulta |
| `src-tauri/src/usuarios/dto.rs` | B | UpdateUsuarioRequest + identidad Optional |
| `src-tauri/src/usuarios/handlers.rs` | B, D | actualizar identidad + require_permission UsuariosManage |
| `src-tauri/src/usuarios/repository.rs` | B, D | update_usuario + persona update + borrar validar_actor_admin |
| `src-tauri/src/usuarios/dto_tests.rs` | B | +1 test identidad camelCase |
| `src-tauri/src/usuarios/validations_tests.rs` | B | +1 test persona_id preserved |
| `src-tauri/src/catalogos/dto.rs` | C | +CatalogoItemDoc, rename CreateCatalogoRequest |
| `src-tauri/src/catalogos/repository.rs` | C | doc_to_doc + doc_to_model + model_to_dto |
| `src-tauri/src/catalogos/handlers.rs` | D | CatalogosRead + CatalogosManage |
| `src-tauri/src/catalogos/mod.rs` | E | `#[cfg(test)] mod dto_tests;` |
| `src-tauri/src/catalogos/dto_tests.rs` | E | **NUEVO** — 4 tests |
| `src-tauri/src/grados/dto.rs` | C | +GradoAcademicoDoc, rename |
| `src-tauri/src/grados/repository.rs` | C | separación + bug updated_at |
| `src-tauri/src/grados/mod.rs` | E | `#[cfg(test)] mod dto_tests;` |
| `src-tauri/src/grados/dto_tests.rs` | E | **NUEVO** — 4 tests |
| `src-tauri/src/shared/rbac.rs` | D, E | +CatalogosRead +2 tests |
| `src-tauri/src/lib.rs` | B | registrar nuevo comando |

**Total: 30 archivos (4 nuevos backend, 1 nuevo frontend).**

---

## Reglas respetadas (prioridad absoluta)

1. **Tailwind-first** (A.1): las nuevas clases usan `@apply` con utilities. Solo `tabs.css` recibe una extensión donde la repetición de variantes justifica abstracción.
2. **DRY**: `<TabNavigation>` compartido elimina duplicación; `RoleMatrixCard` extrae patrón repetido; `Promise.allSettled` reemplaza 6 awaits serializados.
3. **SRP**: cada archivo del módulo disminuye o se mantiene en tamaño; nuevo `RoleMatrixCard` aísla una única responsabilidad.
4. **KISS**: no se añade state management lib; los hooks siguen el patrón `useState`+custom hook ya usado.
5. **Hexagonal** (C): catálogos y grados adoptan misma separación que usuarios (`*Doc`/`*Dto`/`*Request`).
6. **DDD Value Objects**: `Dni::validate` se reutiliza en `consultar_dni_para_usuario` (no se hadeado aún — pendiente opcional si sobra tiempo).
7. **RBAC invariantes**: el superuser sigue siendo único en `bootstrap_admin`; `desactivar_usuario` sigue rechazándolo; `update_usuario` sigue bloqueando auto-cambio de rol. Nada se weaken.
8. **Cero dead code**: se elimina `settings.css` y (potencialmente) `validar_actor_admin` si el check sube al handler.
9. **AGENTS.md UI rules**: `FormModal` envueltos en `p-6`, prosa > 1 línea → `FieldHelpTooltip`, todos los `<th>` con `scope="col"`, botones con `type="button"`.
10. **Cero tolerancia warnings**: `cargo check --no-default-features` debe dar 0 warnings (objetivo del AGENTS.md).
11. **Seguridad**: no se hardcodean URIs, tokens ni credenciales. El nuevo comando `consultar_persona_de_usuario` expone solo datos de persona del usuario referenciado, previa validación `UsuariosManage`.
12. **Test coverage**: +10 tests backend (de 71 a 81), cubriendo exactamente las superficies de regresión del refactor.

---

## Plan B — Si las fases generan conflictos

Si Fase C (hexagonal) o Fase B (identidad) introducen inestabilidad mayor:

- **Hexagonal**: Si `cargo check` revela dependencias circulares tras
  añadir `CatalogoItemDoc`, revertir a usar `CatalogoItemDto` para BSON y
  solo añadir `#[serde(rename_all = "camelCase")]` a `CreateCatalogoRequest`.
  Costo: no se cumple objetivo de hexagonalidad, pero se elimina riesgo de
  mismatch futuro. Se documenta como pendiente.

- **Identidad**: Si el handler de edición de identidad falla en runtime
  (persona no vinculada para usuarios legacy sin `persona_id`), el handler
  debe **no fallar** — simplemente no actualizar identidad y devolver el
  usuario sin cambios, con un `tracing::warn`. El frontend debe mostrar un
  toast informativo: "Este usuario no tiene persona vinculada; identidad no
  editable".

- **RBAC**: Si `CatalogosRead` causa regresión en algún flujo no cubierto
  por tests, mantener `GradosRead` en `get_catalogos` pero cambiar
  `get_all_catalogos_admin` a `CatalogosManage` (semántica mínima), y dejar
  `CatalogosRead` solo documentado en RBAC sin usar.

---

## Orden de ejecución sugerido

1. **Fase A** (visual crítico) → commit → push. Permite validar UI en `npm run tauri:dev`.
2. **Fase C** (hexagonal backend) → commit. Sin dependencias front.
3. **Fase D** (RBAC) → commit. Toca backend ya refactorizado de C.
4. **Fase E** (tests) → commit. Verifica C+D.
5. **Fase B** (identidad Usuario) → commit. Requiere Fase D (handlers) inconsistencia cero.
6. **Fase F** (performance polish) → commit.
7. **Fase G** (gates + push final).

Reordenar B antes que C si se prefiere entregar el bug-fix funcional
primero. Riesgo: Fase B tiene dependencias con Fase D (handlers usuarios).

---

## Pendiente opcional (no en este plan)

- Validar DNI en `consultar_dni_para_usuario` (commands.rs:27) usando `Dni::validate` antes de llamar a RENIEC. Mejora de robustez, sin impacto UX.
- Migrar `<select>` nativo en `RelatedEntitiesSection.tsx` a `FormSelect`. (Notado por auditoría pasada como Fase 1.3.)
- Reemplazar `.empty-state` raw CSS en `screens.css:262-275` por Tailwind utilities. Fuera de scope (toca modulo global).
- Cifrado de config en disco (`pjvpin.config.json` plaintext). Deuda técnica media ya registrada en AGENTS.md.