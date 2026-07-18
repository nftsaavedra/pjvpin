# Plan: Fix login + Catálogos + WCAG 2.2

## Contexto

El usuario reporta bug crítico: tras login exitoso no se renderiza ninguna interfaz (pantalla en blanco). Dos mejoras pendientes: (1) integrar catálogos con dropdowns de recursos y (2) auditoría WCAG 2.2 frontend.

Auditorías en paralelo confirmaron:

- **Bug login (crítico, blocker)**: Mismatch serialización Rust↔TS. `UsuarioDto` Rust aplica `#[serde(rename_all = "camelCase")]`, serializando `nombre_completo` → `nombreCompleto`. La interfaz TS `Usuario` declara `nombre_completo` (snake_case). El JSON llega con `nombreCompleto`, TS accede `usuario.nombre_completo` → `undefined`. En `src/App.tsx:172`: `currentUser.nombre_completo.charAt(0).toUpperCase()` lanza `TypeError` sobre `undefined`. No existe `ErrorBoundary` envolviendo la raíz del App → React desmonta todo el árbol → pantalla blanca. Corroborado: toast en `src/features/auth/AuthScreen.tsx:30` mostraría "Bienvenido undefined" (no crashea porque es interpolación, pero evidencia el mismo bug).
- **Catálogos**: backend + servicio frontend + panel admin ya completos. `useCatalogosProyectos` solo fetchea 4/7 tipos; 3 faltantes (`tipo_patente`, `tipo_producto`, `moneda`) y 4 dropdowns ausentes en `ResourceTabPanel.tsx`. `RelatedEntitiesSection.tsx` usa `<select>` nativo en vez de `FormSelect`.
- **WCAG**: 2 issues críticos (focus trap modales + overlay como div onClick), 4 mayores (contraste Badge warning, disabled solo por opacity, botón sin `type`, ConfirmDialog sin Escape), 5 menores.

Principio ordenador: el bug de login es blocker; las dos mejoras solo pueden verificarse en la ventana Tauri si el login funciona. Por eso la Fase 0 va primero. Las fases restantes son independientes entre sí y podrían paralelizarse, pero se entregan en orden para minimizar fricción de merge.

---

## Fase 0 — Fix crítico: pantalla blanca post-login (BLOCKER)

### 0.1 Alinear tipos Usuario entre Rust y TS (acción mínima)

Archivo foco: `src-tauri/src/usuarios/dto.rs` (líneas del `UsuarioDto`, struct con `#[serde(rename_all = "camelCase")]`).

Decisión ya tomada (alinee Rust hacia el TS existente, no al revés):

- Quitar `#[serde(rename_all = "camelCase")]` del `UsuarioDto` para que serialice en snake_case (consistente con la interfaz TS `Usuario` actual en `src/shared/tauri/types/auth.types.ts`).
- Verificar `AuthStatusDto` (mismo módulo o adyacente): si aplica el mismo atributo y el tipo TS `AuthStatus` correspondiente es snake_case, aplicar la misma corrección; si es camelCase, dejarlo. Explorar antes de tocar.
- Grep exhaustivo en handlers/commands/repositorio para confirmar que ningún otro consumidor frontend espera el JSON en camelCase (grep `nombreCompleto|idUsuario|apellidoPaterno|personaId` en `src/` y `src-tauri/src/` para detectar inconsistencias).

### 0.2 Defensas en el frontend (anti-regresión)

No cambian el contrato, sólo blindan puntos de fallo:

- `src/App.tsx:172` (avatar con inicial):
  - Cambiar `currentUser.nombre_completo.charAt(0).toUpperCase()` → `currentUser.nombre_completo?.charAt(0)?.toUpperCase() ?? "?"`.
  - Revisar todos los accessos a `currentUser.*` en el archivo para aplicar optional chaining donde sean cadenas.
- `src/features/auth/AuthScreen.tsx:30` (toast): `Bienvenido ${usuario.nombre_completo ?? "usuario"}`.
- `src/app/hooks/useAuth.ts:45-47` (catch silencioso en init): añadir `console.error` mínimo para que errores de inicialización no queden invisibles (sin toast, ya que `cargarAuthStatus` ya toastea).

### 0.3 ErrorBoundary en raíz del App

Archivo foco: `src/shared/feedback/ErrorBoundary.tsx` (existe, hoy solo envuelve `TabRenderers`).

- Envolver `<App>` en `main.tsx` con `<ErrorBoundary fallback={<AppFatalFallback/>}>` para evitar pantalla blanca ante cualquier crash futuro en sidebar/dashboard.
- Crear `AppFatalFallback` mínimo (inline en `main.tsx` o en `shared/feedback/`): card con mensaje "Ocurrió un error inesperado. Recarga la ventana." + botón `Reiniciar` que llama `window.location.reload()`. Sin dependencias externas.

### 0.4 Verificación

- `cargo check --no-default-features` → 0 warnings.
- `npm run typecheck && npm run lint && npm run test` → verde.
- Abrir Tauri Dev: `npm run tauri dev`. Hacer login. Debe aparecer sidebar + DashboardTab con avatar mostrando inicial. Toast "Bienvenido <nombre real>".

---

## Fase 1 — Integrar catálogos con dropdowns de recursos

### 1.1 Ampliar hook `useCatalogosProyectos`

Archivo: `src/features/proyectos/hooks/useCatalogosProyectos.ts`.

- Interface `CatalogosProyectos`: añadir 3 props:
  - `tipoPatente: { value: string; label: string }[]`
  - `tipoProducto: { value: string; label: string }[]`
  - `monedas: { value: string; label: string }[]`
- Añadir 3 `getCatalogos("<tipo>")` en el `Promise.all` interno (`tipo_patente`, `tipo_producto`, `moneda`).
- Función `mapItems` ya existe; reusar.

### 1.2 Añadir dropdowns faltantes en `ResourceTabPanel.tsx`

Archivo: `src/features/proyectos/components/ResourceTabPanel.tsx`.

- Pestaña **Patentes**: añadir field `{ name: "tipo", label: "Tipo de Patente", type: "select", options: catalogos.tipoPatente, placeholder: "-- Seleccionar tipo --" }` antes del field existente `estado`.
- Pestaña **Productos**: añadir field `{ name: "tipo", label: "Tipo de Producto", type: "select", options: catalogos.tipoProducto, placeholder: "-- Seleccionar tipo --" }` antes del field existente `etapa`.
- Pestaña **Equipamiento**: añadir field `{ name: "moneda", label: "Moneda", type: "select", options: catalogos.monedas, placeholder: "-- Seleccionar moneda --" }` junto al field `costo` (numérico).
- Pestaña **Financiamiento**: añadir field `{ name: "moneda", label: "Moneda", type: "select", options: catalogos.monedas, placeholder: "-- Seleccionar moneda --" }` junto a `monto`.
- Validar que los DTOs Rust `PatenteDto/ProductoDto/EquipamientoDto/FinanciamientoDto` ya aceptan esos campos como `Option<String>` (auditoría confirma que sí).

### 1.3 Migrar `<select>` nativo a `FormSelect` (opcional, mejora consistencia)

Archivo: `src/features/proyectos/components/RelatedEntitiesSection.tsx:225-239`.

- Sustituir el `<select>` nativo (rama `field.type === "select"`) por `<FormSelect>` (de `@/shared/forms/FormSelect`) manteniendo la firma `{label, value, onChange, options, placeholder, help, disabled}`.
- para los fields `text`/`number` mantener inputs nativos (sin beneficio migrarlos ahora).
- Si por restricciones de layout dentro de la tabla inline el cambio rompe estilos, dejar como `<select>` pero añadir `aria-label={field.label}` y clases de `forms.css` para coherencia visual.

### 1.4 Corrección semántica RBAC (opcional, defensa de futuro)

Archivo: `src-tauri/src/catalogos/handlers.rs:13`.

- Cambiar `GradosRead` → `CatalogosRead` en el handler `get_catalogos` (lectura pública de dropdowns).
- Añadir `CatalogosRead` al enum `Permiso` en `shared/rbac.rs` y asignarlo a TODOS los roles en la matriz (superuser, admin, operador, consulta, responsable_proyecto) — cualquier rol que vea una pantalla con dropdowns necesita catálogos.
- Actualizar `permissions.ts` (mapa análogo en frontend) y los tests de RBAC (Rust + vitest).
- Si el equipo prefiere no tocar RBAC en este ciclo, dejar como nota y cerrar la Fase 1 en 1.3.

### 1.5 Verificación

- `npm run typecheck && npm run lint`.
- `npm run tauri dev`: login > abrir proyecto > pestañas Patentes/Productos/Equipamiento/Financiamiento > crear/editar items > confirmar que los 4 dropdowns nuevos reaccionan, persisten al guardar y se muestran en tabla.

---

## Fase 2 — Correcciones WCAG 2.2 (AA)

Orden por severidad y costo:

### 2.1 Críticos

**C-01 Focus trap en modales**

- `src/shared/forms/FormModal.tsx`:
  - Añadir `useEffect` al montar que guarde `document.activeElement` previo.
  - Enfocar el primer elemento focusable del modal al abrir (`useRef` al container + query `input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])`).
  - `onKeyDown` sobre el container: si Tab/Shift+Tab y focus sale del modal, devolverlo al primero/último.
  - Al cerrar (useEffect cleanup), restaurar foco al elemento guardado.
- `src/shared/overlays/ConfirmDialog.tsx`: aplicar el mismo patrón (reusar un hook `useFocusTrap(ref, isOpen)` extraíble en `src/shared/forms/hooks/useFocusTrap.ts` para DRY).

**C-02 Overlay como elemento interactivo**

- `src/shared/forms/FormModal.tsx:61`: `<div className="modal-overlay" onClick={...}>` → `<button type="button" aria-label="Cerrar diálogo" className="modal-overlay" onClick={...}>`. El `modal-overlay` ya cubre toda la pantalla; como `<button>` es focusable y accesible por teclado (Enter/Space cierran).
- `src/shared/overlays/ConfirmDialog.tsx:27`: mismo cambio.
- Validar que `stopPropagation` en el contenido sigue funcionando (click en contenido NO cierra).

### 2.2 Mayores

**M-01 Badge warning contraste**

- `src/shared/ui/Badge.tsx:14`: `warning: "bg-amber-100 text-amber-600"` → `warning: "bg-amber-100 text-amber-800"`.
- `src/assets/styles/badges.css:4`: `.badge-warning` color del texto a `amber-800` (`#92400e`). Ratio resultante ~5.6:1 (pasa AA con margen).
- Validar que no existan overrides en `App.css` que pisar esto.

**M-02 Estados disabled explícitos**

- `src/assets/styles/table-components.css:19` (`.table-action-button:disabled`): reemplazar `opacity-40` por `text-gray-300` + `bg-gray-100` + `cursor-not-allowed`.
- `src/assets/styles/proyectos.css:15` (`.project-investigadores-trigger:disabled`): `opacity-65` → `text-gray-400` + `cursor-not-allowed` + opcional `bg-gray-50`.
- `src/assets/styles/investigadores.css:14` (`.investigador-chip-remove`): verificar si realmente es un estado disabled; si no, dejar como está.

**M-03 Botón sin tipo en DashboardTab**

- `src/features/dashboard/DashboardTab.tsx:89`: añadir `type="button"`.

**M-04 Escape en ConfirmDialog**

- `src/shared/overlays/ConfirmDialog.tsx`: añadir `useEffect` con `window.addEventListener('keydown', handler)` para llamar `onCancel` al pulsar Escape. Reusar el mismo patrón de `FormModal.tsx:44-48`.

### 2.3 Menores (lotes rápidos)

- `m-01`: `src/assets/styles/forms.css:25` cambiar `:focus` → `:focus-visible` para los `.form-input`. Verificar contraste del ring (aumentar opacidad si se ve tenue).
- `m-03`: tablas afectadas (`DataTable.tsx`, `InvestigadoresTableGrid.tsx:39`, `ProyectosTableGrid.tsx:45`, tablas de configuración): añadir `scope="col"` a `<th>` de encabezado y `scope="row"` donde corresponda.
- `m-02` / `m-05`: vincular `aria-describedby` entre trigger y contenido de tooltip en `FloatingTooltip.tsx` y `FieldHelpTooltip.tsx` (generar id estable via `useId` para el contenido flotante).
- `m-04`: añadir `role="status"` a `StatusChip.tsx` solo cuando comunique estado dinámico (aceptar prop `live?: boolean`, default `false`).

### 2.4 Verificación

- `npm run typecheck && npm run lint`.
- `/dev` Tauri:
  - Navegación 100% por teclado en modales (Tab dentro, Shift+Tab, Enter para confirmar, Escape para cerrar, foco restaurado al botón que abrió).
  - Inspección visual: Badge warning legible, disabled grey/distinto del activo.
  - DevTools Lighthouse (categoría Accessibility) > 95.
- Validar con un subagente `accessibility` skill o audit manual pequeño.

---

## Fase 3 — Quality gates finales

Antes de commit (regla AGENTS.md):

```bash
npm run typecheck         # 0 errores
npm run lint              # 0 errores, 0 warnings
npm run test              # 27/27 vitest
cargo check --no-default-features   # 0 warnings
cargo test --lib          # 64+ tests (pueden aumentar con fix RBAC)
npm run build             # OK
npm run tauri:dev         # verificar login + catálogos + a11y manual
```

## Orden de ejecución y entregables

1. **Fase 0** (fix blocker) → commit `fix(login): alinear serde usuario + error boundary root`.
2. **Fase 1** → commit `feat(recursos): integrar catalogos tipo_patente, tipo_producto, moneda`.
3. **Fase 2** → commit `fix(a11y): focus trap, contraste badge, disabled, escape, scope`.
4. **Fase 3** (verificación global) → `git push`.

Cada fase termina con quality gates verdes antes de la siguiente. Las fases 1 y 2 pueden paralelizarse con subagentes tras la Fase 0 si se desea (no comparten archivos relevantes).

## Fuera de scope (notas)

- Cifrado de config en disco (deuda media): agenda separada.
- Migración integral camelCase en todos los DTOs: se decide en el fix del login por la vía quirúrgica (alinear `UsuarioDto` a snake) para minimizar blast radius; se pivota a migración integral solo si el grep revela conflictos.
- Refactor de `RelatedEntitiesSection` a un componente design-system propre.