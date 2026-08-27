# Escenarios de Migración del Backend — Análisis (NestJS + Dokploy)

> Fecha: 2026-08-27. Complementa a [README.md](./README.md) y responde a la decisión de migración ACTIVADA registrada en `AGENTS.md`.
> Entradas del usuario: multi-usuario institucional confirmado; VPS con soporte Node.js; producción vía **Dokploy** (Docker); **misma BD MongoDB Atlas** y credenciales actuales (`.env` → env vars del servidor); **wizard del desktop reducido a configurar la URL del API REST**.

## 1. Escenarios de estrategia de migración (cómo se llega al target)

### Escenario A — Strangler incremental por módulos ✅ (RECOMENDADO)

El backend NestJS crece módulo a módulo en `apps/api`; el desktop mantiene el backend Rust embebido hasta que cada módulo esté migrado y conmutado. Un flag de configuración (`PJVPIN_API_URL` presente/ausente o granular por módulo) decide si el frontend llama HTTP o IPC.

| Aspecto | Evaluación |
|---|---|
| Riesgo | Bajo-medio. Cada módulo se valida en aislamiento contra la BD real |
| Velocidad de valor | El auth/usuarios migrado primero habilita multi-usuario real de inmediato |
| Complejidad transitoria | Doble capa de transporte en el desktop (adapter `invoke` vs `fetch`) durante N fases |
| Reversibilidad | Alta: si un módulo falla en API, se conmuta de vuelta a IPC |
| Costo | Mantener 2 stacks vivos durante la ventana de migración |

**Clave de viabilidad**: la capa `src/shared/tauri/` ya centraliza TODO el acceso a backend tras 94 wrappers con contratos estables. Sustituir el cuerpo de esos wrappers (`invoke(...)` → `fetch(url, ...)`) es un cambio local; el resto del frontend (hooks, features) no se entera.

### Escenario B — Corte único (big-bang)

Migrar los 155 comandos y recién entonces conmutar el desktop completo.

- ❌ Riesgo máximo: 6 meses+ sin entregable verificable; el switch integra TODO de golpe.
- ❌ Contradice la etapa del proyecto (en construcción activa: el frontend sigue evolucionando sobre IPC).
- ✅ Única ventaja: sin coexistencia de stacks. No compensa.

### Escenario C — Solo reestructurar monorepo (sin migrar dominio aún)

Mover carpetas a `apps/desktop` + crear `apps/api` vacío + `packages/shared`.

- ✅ Cero riesgo funcional; deja la estructura lista.
- ❌ No produce valor de multi-usuario; la deuda se posterga.
- Nota: es exactamente la **Fase 1** del plan del Escenario A — no compite, es subconjunto.

### Escenario D — Backend dual permanente (Rust offline + NestJS web)

Conservar el backend Rust para "modo offline" del desktop y NestJS para web.

- ❌ Duplicación permanente de dominio + RBAC + conectores (2 fuentes de verdad).
- ❌ Hoy el desktop YA depende de MongoDB Atlas en la nube: no existe modo offline real que preservar.
- ❌ Los seeds/índices correrían en dos runtimes contra la misma BD (higiene de datos).
- Descartado.

### Conclusión

**Escenario A** con orden de migración por dependencias (el grafo real documentado en [02-features-dominio.md](./02-features-dominio.md) §8):

```
F1 monorepo → F2 shared → F3 auth+usuarios+RBAC → F4 fundación (catalogos,
vocabularios, geo, grados, grupos, org_units, ocde) → F5 personas+investigadores
+ conectores (RENIEC/RENACYT/Pure/PeruCRIS) → F6 proyectos+recursos+
publicaciones+eventos+pivots → F7 reportes+CERIF+export → F8 switch desktop
total → F9 Dokploy + retirada del backend Rust
```

`seguridad` (fachada de status/wizard) se disuelve en el API (`/health`, `GET /security/status`) y el wizard nuevo del desktop.

## 2. Escenarios de sesión y seguridad

| Escenario | Decisión | Justificación |
|---|---|---|
| Sesión stateless JWT (access 15 min + refresh 7 d rotativo) | ✅ Elegido | Multi-usuario real, sin afinidad de servidor, compatible con Dokploy (réplicas/restarts sin perder sesiones). Reemplaza `SessionStore` en memoria Rust (30 min/4 h, por ventana — no escalable) |
| Sesiones centralizadas Redis | Alternativa descartada por ahora | Añade un servicio al VPS; JWT + refresh rotation cubre el caso actual. Redis queda como opción si se requiere revocación inmediata masiva |
| Rate limiting login | `@nestjs/throttler` (5 intentos/15 min por username+IP) | Replica `LoginRateLimiter` actual |
| Password hashing | Argon2 (`argon2` npm) | Mismo algoritmo que Rust → **los hashes existentes en la colección `usuarios` siguen siendo válidos sin reset de contraseñas** |
| CORS | Allowlist de orígenes: `tauri://localhost` (Windows), `http://localhost:1420` (dev Vite), dominio web futuro | El WebView de Tauri origina desde custom protocol |
| TLS | Terminado en Dokploy (Let's Encrypt automático) | El API detrás no expone puertos directos |
| Secrets | Solo env vars del servidor (Dokploy). Desktop NO recibe jamás Mongo URI/RENIEC/Pure/PeruCRIS | Reducción de superficie de ataque: hoy cada máquina desktop tiene credenciales de BD |
| Auditoría | Interceptor NestJS → mismo JSONL (`PJVPIN_AUDIT_LOG_PATH` en volumen Docker) | Misma salida que `shared/audit.rs`; opcional colección Mongo como evolución |
| Headers | Helmet (HSTS, CSP, no-sniff) | Estándar NestJS |
| `sanitize_external_detail` | Portar como util TS y aplicarla en excepciones de conectores | Evita fugar api-keys en mensajes de error |

**Invariantes RBAC**: enum `AppPermission` (23) + matriz `role_has_permission` se portan 1:1 a NestJS (guard + decorador `@RequirePermission()`). Oportunidad registrada (no bloqueante): reconciliar el desync frontend/backend detectado en el censo (§ hallazgo 1 del README) en la fase de contratos.

## 3. Escenarios del asistente de configuración (wizard) y bootstrap

### 3.1 Desktop nuevo (target)

1. **Paso único de infra**: ingresar `PJVPIN_API_URL` → validar con `GET /health` (200). Sin test de Mongo/RENIEC/Pure/PeruCRIS en el cliente: eso pasa a ser responsabilidad del operador del servidor (Dokploy).
2. **Primer usuario**: el API expone `POST /auth/bootstrap` que SOLO opera si la colección `usuarios` está vacía (mismo contrato e invariantes superuser que `registrar_primer_usuario`: unicidad global, no eliminable, no degradable). El desktop lo invoca desde el wizard.
3. Persistencia local del desktop: solo la URL del API (config local mínima). `pjvpin.config.json` con URI/tokens desaparece del cliente.

### 3.2 API recién desplegada, BD existente con datos

- `GET /health` → `ok` + `bootstrap_required: false` (usuarios > 0).
- El wizard del desktop salta directo a login normal.
- Seeds idempotentes (`if_empty`) + `ensure_indexes` corren en el boot del API sin tocar datos.

### 3.3 API nueva + BD vacía (institución nueva o reset dev)

- `bootstrap_required: true` → el wizard muestra el paso de primer superuser.
- `POST /auth/bootstrap` crea superuser + Persona (RENIEC opcional: el consultor DNI vive en el API con el token del servidor).

### 3.4 Escenario degradado: API caída / URL incorrecta

- El wizard muestra error de conectividad con diagnóstico (timeout/DNS/404) y reintento. El desktop NO tiene modo fallback a backend Rust tras el switch final (F8) — se documenta la dependencia de red como invariante del producto (hoy ya depende de Atlas en la nube, no hay regresión material).

### 3.5 Migración de servidores / cambio de URL

- El desktop permite re-configurar la URL del API (escenario VPS nuevo, staging↔prod). Tokens JWT del servidor anterior dejan de validar → re-login. Aceptable.

## 4. Escenarios de despliegue

### 4.1 Desarrollo local

- `apps/api`: `pnpm --filter api dev` (NestJS en :3000, `.env` local con las credenciales actuales del `.env` raíz — este archivo NO se commitea, sigue gitignored).
- `apps/desktop`: `pnpm --filter desktop dev` (Vite :1420 + Tauri). `PJVPIN_API_URL=http://localhost:3000`.
- BD compartida: la misma MongoDB Atlas (db `pjvpin`). Regla de higiene durante la transición: mientras se prueba un módulo migrado en el API, ese módulo NO se usa simultáneamente vía backend Rust (ver §6.3).

### 4.2 Producción (Dokploy)

- **Dockerfile multi-stage** en `apps/api` (pnpm deploy --filter=api → node:22-alpine, salida dist + pruned node_modules). Dokploy builda la imagen desde el repo.
- **Env vars en Dokploy** (equivalentes 1:1 a las actuales): `PJVPIN_MONGODB_URI`, `PJVPIN_MONGODB_DB`, `PJVPIN_RENIEC_TOKEN`, `PJVPIN_RENACYT_*`, `PJVPIN_PURE_API_BASE_URL`, `PJVPIN_PURE_API_KEY`, `PJVPIN_PERUCRIS_*`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PJVPIN_AUDIT_LOG_PATH` (volumen persistente), `CORS_ORIGINS`.
- **TLS**: dominio del VPS con certificado automático de Dokploy.
- **Escalado**: 1 instancia basta para el tamaño institucional; el diseño stateless (JWT) permite N réplicas detrás del proxy de Dokploy sin cambios.
- **Backups**: Atlas (responsabilidad de la BD sigue en Mongo Atlas, sin cambio).
- **Escenario rollback**: Dokploy permite re-deploy del build anterior de la imagen. Migraciones de esquema NO existen (schemaless + índices idempotentes) → rollback seguro.

### 4.3 CI (opcional, recomendado al cerrar F3)

- GitHub Actions: lint + typecheck + tests (Vitest/Jest) + build de las 3 packages en cada PR; gate de `cargo` eliminado cuando el backend Rust se retire (F9).

## 5. Escenarios operativos

| Escenario actual (Rust) | Contrapartida NestJS | Nota |
|---|---|---|
| `write_export_file` escribe Excel/PDF/CERIF a disco local del desktop | API devuelve bytes (`Content-Disposition`) y el desktop los guarda con el diálogo nativo de Tauri | La generación Excel/PDF sigue en el frontend (`exceljs`, `@react-pdf/renderer`) → el API solo provee los datasets (ya es así hoy) |
| `descargar_constancia_renacyt` (PDF bytes vía IPC) | `GET /investigadores/:id/constancia-renacyt` → stream | El conector RENACYT vive en el API |
| Cache RENIEC TTL 1h en memoria Rust | Cache en memoria del API (o Redis si se añade) con la misma TTL | Un solo cache compartido por todos los usuarios (mejora) |
| Circuit breaker RENIEC (import.rs, 3 fallos) | Portar a un guard/servicio con misma política en el API | Ídem política de concurrencia 5 |
| Importación por DNI (lote 200, pipeline 4 fuentes) | `POST /investigadores/import` async (job en proceso, polling de estado) | En desktop single-user era bloqueante; multi-usuario exige no bloquear el event loop ni la sesión |
| Sync Pure / push PeruCRIS (procesos largos) | Endpoints async con reporte en `sync_reportes` (colección existente) | Reutilizar la colección como historia |
| Reset dev (`PJVPIN_RESET_DEV` dropea 17 colecciones) | `NODE_ENV=development` + env `PJVPIN_RESET_DEV=1` en el boot del API, idéntica lista | Jamás habilitado en producción |
| Rate limit login por proceso | Throttler distribuido por username (y opcional IP) | Ver §2 |
| Auditoría JSONL en CWD | JSONL en volumen Docker persistente | Rotación de logs del contenedor |

## 6. Escenarios de datos

### 6.1 Misma BD, mismo modelo

- 23 colecciones se conservan con nombres, shapes de documentos e índices EXACTOS (incl. `partial_filter_expression` y los 2 sparse de `patente_titulares`). No hay migración de datos: el API apunta a la misma `PJVPIN_MONGODB_URI`.
- Repositorios TS sobre **driver oficial `mongodb`** (no Mongoose completo) para garantizar las opciones de índice idénticas — decisión alineada con la lección E11000.

### 6.2 Seeds

- Los JSON embebidos actuales (`ubigeo_inei.json`, 55 DNIs UNF, vocabularios SKOS, grados, org_units) se mueven a `apps/api/src/**/seed/` y corren `if_empty` en el boot — idéntico comportamiento.

### 6.3 Coexistencia Rust↔NestJS durante la transición (higiene)

- `ensure_indexes` es idempotente (dropea non-_id y recrea) → dos backends NO deben correrlo simultáneamente contra la misma BD. Regla: el `ensure_indexes` del API se habilita con env `PJVPIN_RUN_ENSURE_INDEXES=1` y se usa un único backend "dueño de BD" por momento (durante F3-F7 el dueño sigue siendo Rust; el API se valida con `ensure_indexes` deshabilitado o contra BD de staging).
- Escenario alternativo para validar índices del API: BD de staging separada en el mismo cluster (`pjvpin_staging`).

### 6.4 Contratos

- Fase 1 de migración: los DTOs del API replican los shapes actuales (respuestas snake_case, requests camelCase). El frontend solo cambia transporte. Normalización camelCase unificada: deuda post-migración (documentada).
- `packages/shared` contiene los tipos TS únicos (hoy duplicados implícitos entre Rust serde y `src/shared/tauri/types/`).

## 7. Matriz de riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Deriva de contratos IPC↔HTTP durante strangler | Media | Alto | `packages/shared` como única fuente de tipos + tests de contrato por módulo migrado |
| Índices recreados distinto en NestJS (regresión E11000) | Baja | Alto | Repos con driver oficial + tests de `ensure_indexes` contra bd de staging; revisión par contra `shared/db.rs` |
| Doble escritura accidental Rust+NestJS al mismo módulo | Media | Alto | Switch de transporte por módulo es binario y atómico; regla "un dueño por módulo" |
| Fuga de secrets al desktop o al repo | Baja | Crítico | Desktop solo recibe `PJVPIN_API_URL`; secrets solo en Dokploy; auditoría de literales antes de commit |
| Hashes Argon2 incompatibles | Baja | Alto | Verificar paridad de parámetros Argon2 Rust↔node-argon2 en F3 (test con hash existente) |
| Bloqueo del event loop por import/sync masivos | Media | Medio | Endpoints async + jobs en proceso + polling |
| Ventana de doble stack más larga de lo estimado | Alta | Medio | Fases independientes con gates; cada módulo conmutado entrega valor |
| Dokploy/VPS sin configurar a tiempo | Media | Bajo | El desarrollo transita completo en local; despliegue es fase final (F9) |

## 8. Recomendación ejecutiva

Ejecutar **Escenario A (strangler incremental)** con el orden de fases de §1.3, sesiones **JWT** (§2), wizard reducido a **URL del API + bootstrap** (§3), despliegue final en **Dokploy** (§4), misma **BD Atlas sin migración de datos** (§6). El plan detallado por fases con quality gates se somete a revisión por separado.
