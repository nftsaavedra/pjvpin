# Inventario Rust — Bloque E (especificación de replicación NestJS)

> Fuente: exploración read-only 2026-09-01 sobre `apps/desktop/src-tauri/` (3 subagentes explore + verificación directa).
> Propósito: especificación autoritativa de shapes/validaciones/índices/RBAC/cascadas para migrar los ~55 endpoints del Bloque E a `apps/api` (doc 06 §6-§9).
> **Principio rector (decisión del usuario 2026-09-01)**: Rust NO es verdad absoluta. Las DISCREPANCIAS se resuelven con la solución profesional anotada en §5. El modelo de datos (colecciones + índices en MongoDB) sí es invariant 1:1 porque la BD es compartida con el desktop Rust hasta la fase H.

---

## 1. Proyectos + participaciones + pivots (15 comandos → 15 REST, doc 06 §6)

### 1.1 Endpoints y RBAC

| Endpoint REST | Permiso | Audit event |
|---|---|---|
| `POST /proyectos` | ProyectosManage | `proyecto.create` |
| `PATCH /proyectos/:id` | ProyectosManage | `proyecto.update` |
| `GET /investigadores/:id/proyectos` | ProyectosView | — |
| `GET /proyectos/detalle` | ProyectosView (filtro responsable) | — |
| `GET /proyectos?page=&limit=` | ProyectosView (filtro responsable) | — |
| `DELETE /proyectos/:id/participaciones/:investigadorId` | ProyectosManage | `proyecto.delete_relation` |
| `DELETE /proyectos/:id/participaciones` | ProyectosManage | `proyecto.delete_relations` |
| `DELETE /proyectos/:id` | ProyectosManage | `proyecto.delete` |
| `PATCH /proyectos/:id/reactivar` | ProyectosManage | `proyecto.reactivate` |
| `POST /proyectos/:id/organizaciones` | ProyectosManage | `proyecto.vincular_org` |
| `DELETE /proyectos/:id/organizaciones/:pivotId` | ProyectosManage | `proyecto.desvincular_org` |
| `GET /proyectos/:id/organizaciones` | ProyectosView | — |
| `POST /proyectos/:id/financiamientos` | ProyectosManage | `proyecto.vincular_fin` |
| `DELETE /proyectos/:id/financiamientos/:pivotId` | ProyectosManage | `proyecto.desvincular_fin` |
| `GET /proyectos/:id/financiamientos` | ProyectosView | — |

### 1.2 Shapes

**`ProyectoDto`** (respuesta, snake_case; source `proyectos/dto.rs` L120-157):
```
id_proyecto, titulo_proyecto, codigo, activo (i64 0/1 en BD), created_at?, updated_at?,
campo_ocde?, programas_relacionados: string[], tipo_actividad_ocde?, ambito_geografico?,
estado_concytec?, tematica_ambiental?, tematica_salud?, perucris_uuid?
```

**`CreateProyectoConParticipantesRequest` / `Update...`** (request, camelCase):
```
{ tituloProyecto: string, investigadoresIds: string[], investigadorResponsableId?: string }
```

**`ParticipacionRecord`** (colección `participaciones`, `_id = "{id_proyecto}:{id_investigador}"`):
```
id, id_proyecto, id_investigador, rol, id_org_unit_afiliacion?, horas_dedicacion_semanal? (f64 >= 0), es_responsable (bool)
```

**Pivot `proyecto_organizaciones`** (`ProyectoOrganizacionDoc`): `_id` (uuid), `id_proyecto`, `id_org_unit`, `rol`.
**Pivot `proyecto_financiamientos`**: `_id` (uuid), `id_proyecto`, `id_financiamiento`, `monto_asignado?`, `moneda` (default `"PEN"`).

### 1.3 Validaciones

- **Create** (`validate()`, dto.rs L191-207): ≥1 investigador → *"Seleccione al menos un investigador para crear el proyecto."*; IDs trim + dedupe (mantiene orden); responsable debe estar en la lista. Si lista no vacía y sin responsable → *"Seleccione un investigador responsable para el proyecto."*
- **Update** (dto.rs L221-231): igual pero SIN exigir ≥1 (puede actualizar solo título). Update solo toca `titulo_proyecto` (NO codigo).
- **Roles de participación** (`vocab_mapper.rs` L27-33): `INVESTIGADOR_PRINCIPAL, CO_INVESTIGADOR, TESISTA, ASISTENTE_INVESTIGACION, ASISTENTE_ADMINISTRATIVO`. `es_responsable` se infiere: `rol === INVESTIGADOR_PRINCIPAL`.
- **Roles org pivot** (L41-46): `EJECUTORA, CO_EJECUTORA, PATROCINADORA, COLABORADORA`.
- **Financiamiento pivot**: `moneda` ISO 4217 (3 letras ASCII uppercase, default PEN); `monto_asignado` finito ≥ 0.
- **Investigadores activos** (repository.rs L168-193): `{ id_investigador: {$in}, activo: 1 }` count == len, si no → *"Uno o más investigadores seleccionados no existen o están inactivos."*

### 1.4 Lógica de handlers

- **Filtro responsable** (get_all_detalle/paginated): si `actor.rol === "responsable_proyecto"` → tomar `usuario.investigador_id` (error si no tiene: *"Usuario responsable_proyecto no tiene un investigador asociado."*); query `participaciones { id_investigador, es_responsable: true }` → `$in ids_proyecto` + `activo: 1`. Otros roles: `{ activo: 1 }`.
- **Create**: transacción MongoDB: insert proyecto + insert participaciones (`_id` compuesto, rol INVESTIGADOR_PRINCIPAL para responsable / CO_INVESTIGADOR resto).
- **Update**: transacción: `$set { titulo_proyecto, updated_at }` + delete_many participaciones del proyecto + re-insert (delete+insert, NO diff).
- **Eliminar** (repository.rs L375-469): guard previo — si participaciones > 0 → 409 *"No se puede eliminar el proyecto porque aún tiene investigadores relacionados..."*; transacción: (1) soft patentes `{proyecto_id}` → `activo: 0`; (2) hard-delete pivots orgs; (3) hard-delete pivots financiamientos; (4) hard-delete `entity_ocde_fields` (ENTITY_TYPE_PROJECT); (5) soft proyecto `activo: 0`. Retorna `{ accion: "desactivado", mensaje }`.
- **Reactivar**: solo `$set { activo: 1, updated_at }` del proyecto (NO restaura patentes/pivots).
- **Vincular org**: `ensure_exists("proyectos")` + `ensure_exists("org_units")` + validar rol → insert pivot (uuid v4).
- **Vincular financiamiento**: `ensure_exists("proyectos")` + `ensure_exists("financiamientos")` + validar monto/moneda → insert.
- **Detalle** (`ProyectoDetalleDto`): join manual en memoria (load_investigadores_map, personas, grados, participaciones): `{ id_proyecto, titulo_proyecto, cantidad_investigadores, investigador_responsable (nombre)?, investigadores ("nombre (grado · nivel) | ..." string)?, participantes_json (JSON string de [{id_investigador, nombre, grado, renacyt_nivel, es_responsable}])?, activo }`. Participantes ordenados: responsables primero, luego nombre asc. Grado default "Sin grado", renacyt default "No registrado".
- **Paginated**: sort `titulo_proyecto: 1`, `{ items, total, page, limit, total_pages }`, `total_pages = ceil(total/limit)`.

### 1.5 Índices (constraint efectivo en BD; NestJS NO los crea — dueño BD = Rust)

- `proyectos`: UNIQUE `{id_proyecto: 1}`; UNIQUE `{codigo: 1}` + partial `{codigo: {$type: "string"}}`.
- `participaciones`: `{id_proyecto}`, `{id_investigador}`, UNIQUE `{id_proyecto, id_investigador}`.
- `proyecto_organizaciones`: UNIQUE `{id_proyecto, id_org_unit, rol}` + `{id_org_unit}`.
- `proyecto_financiamientos`: UNIQUE `{id_proyecto, id_financiamiento}` + `{id_financiamiento}`.

---

## 2. Recursos: patentes/equipamientos/financiamientos + pivots (21 comandos → 21 REST, doc 06 §7)

### 2.1 Endpoints y RBAC

| Endpoint REST | Permiso | Audit event |
|---|---|---|
| `POST /patentes` | RecursosManage **o** responsable (ver §5 D2) | `patente.create` |
| `GET /proyectos/:id/patentes` | ProyectosView | — |
| `PATCH /patentes/:id` | RecursosManage **o** responsable | `patente.update` |
| `DELETE /patentes/:id` | RecursosManage | `patente.delete` |
| `PATCH /patentes/:id/reactivar` | RecursosManage | `patente.reactivate` |
| `POST /equipamientos` | RecursosManage **o** responsable | `equipamiento.create` |
| `GET /proyectos/:id/equipamientos` | ProyectosView (ver §5 D4) | — |
| `PATCH /equipamientos/:id` | RecursosManage **o** responsable | `equipamiento.update` |
| `DELETE /equipamientos/:id` | RecursosManage | `equipamiento.delete` |
| `PATCH /equipamientos/:id/reactivar` | RecursosManage | `equipamiento.reactivate` |
| `POST /financiamientos` | RecursosManage **o** responsable | `financiamiento.create` |
| `GET /proyectos/:id/financiamientos-recursos` | ProyectosView (ver §5 D4) | — |
| `PATCH /financiamientos/:id` | RecursosManage **o** responsable | `financiamiento.update` |
| `DELETE /financiamientos/:id` | RecursosManage | `financiamiento.delete` |
| `PATCH /financiamientos/:id/reactivar` | RecursosManage | `financiamiento.reactivate` |
| `POST /patentes/:id/inventores` | RecursosManage | `patente.vincular_inventor` |
| `DELETE /patentes/:id/inventores/:pivotId` | RecursosManage | `patente.desvincular_inventor` |
| `GET /patentes/:id/inventores` | RecursosManage | — |
| `POST /patentes/:id/titulares` | RecursosManage | `patente.vincular_titular` |
| `DELETE /patentes/:id/titulares/:pivotId` | RecursosManage | `patente.desvincular_titular` |
| `GET /patentes/:id/titulares` | RecursosManage | — |

**Semántica del helper** `require_recursos_manage_or_responsable` (Rust handlers.rs L12-43): OR entre (a) permiso RecursosManage (superuser/admin/operador) y (b) `rol === "responsable_proyecto"` + `es_responsable_del_proyecto(investigador_id, proyecto_id)` (count `participaciones {id_proyecto, id_investigador, es_responsable: true}` > 0). **Rust tiene un bypass: proyecto_id None → OK incondicional (ver §5 D2).**

### 2.2 Shapes

**Patente** (colección `patentes`):
```
id (_id), id_patente, proyecto_id?, titulo (obligatorio), numero_patente?, tipo?, estado?,
fecha_solicitud? (i64), fecha_concesion? (i64), pais?, entidad_concedente?, descripcion?,
clasificacion_ipc?, id_org_unit_concedente?, created_at?, updated_at?, activo (i64, default 1)
```
- Validaciones: `titulo` obligatorio; `tipo` ∈ `["invencion", "modelo_utilidad", "diseno_industrial"]`; trim Options.
- Update: NO permite cambiar `titulo` ni `proyecto_id` (UpdatePatenteRequest no los incluye).

**Equipamiento** (colección `equipamientos`) — `proyecto_id` ELIMINADO (D10):
```
id (_id), id_equipamiento, nombre (obligatorio), descripcion?, especificaciones?, proveedor?,
moneda?, valor_estimado? (f64), fecha_adquisicion?, codigo_institucional? (UNIQUE sparse),
tipo_equipamiento? (vocab concytec_equipamiento), uso_equipamiento? (vocab concytec_uso_equipamiento),
id_org_unit_propietaria? (FK org_units), id_financiamiento? (FK financiamientos), created_at?, updated_at?, activo
```

**Financiamiento** (colección `financiamientos`) — `proyecto_id` ELIMINADO (D10):
```
id (_id), id_financiamiento, codigo (obligatorio en Rust new()), nombre?, modalidad? (vocab concytec_terminos),
id_org_unit_financiadora? (FK org_units), parent_id? (self-ref, != self), tipo?, monto? (f64), moneda? (ISO 4217),
fecha_inicio? (i64), fecha_fin? (i64, >= fecha_inicio), descripcion?, estado_financiero?, created_at?, updated_at?, activo
```

**Pivots**: `patente_inventores` (`_id`, `id_patente`, `id_persona`, `orden` i32 ≥ 1); `patente_titulares` (`_id`, `id_patente`, `holder_type` ∈ `["ORG_UNIT","PERSON"]`, `id_org_unit?`, `id_persona?` exactly-one, `orden` ≥ 1).

### 2.3 Lógica de handlers

- **eliminar_patente**: soft-delete (`activo: 0`) + hard-delete pivots inventores/titulares (delete_for_patente) + hard-delete `entity_ocde_fields` (ENTITY_TYPE_PATENT).
- **FK checks**: vincular_inventor → `ensure_exists("patentes")` + `ensure_exists("personas")`; vincular_titular → patentes + (org_unit si presente) + (persona si presente).
- **Soft-delete/reactivar**: `$set {activo: 0|1, updated_at}`; lecturas filtran `activo: 1`.
- **get_software_by_proyecto**: NO está aquí — vive en publicaciones (ver §3).

### 2.4 Índices (constraint efectivo; NO crear en NestJS)

- `patentes`: `{proyecto_id: 1}`; UNIQUE `{numero_patente: 1}` partial `{numero_patente: {$type: "string"}}`.
- `equipamientos`: `{proyecto_id: 1}` (muerto); UNIQUE `{codigo_institucional: 1}` partial `{$type: "string"}`.
- `financiamientos`: `{proyecto_id: 1}` (muerto). ⚠️ Sin UNIQUE sobre `codigo` (Rust no lo enforce en BD).
- `patente_inventores`: UNIQUE `{id_patente, id_persona}` + `{id_persona}`.
- `patente_titulares`: UNIQUE `{id_patente, holder_type, id_org_unit}` sparse + UNIQUE `{id_patente, holder_type, id_persona}` sparse (specs db.rs; la macro Rust genera spec distinto — ver §5 D6).

---

## 3. Publicaciones (12) + Eventos (7) (doc 06 §8-§9)

### 3.1 Endpoints y RBAC

| Endpoint REST | Permiso | Audit event |
|---|---|---|
| `POST /publicaciones` | PublicacionesManage | `publicacion.create` |
| `GET /publicaciones` | PublicacionesView (query `?anio=`) | — |
| `GET /publicaciones/:id` | PublicacionesView | — |
| `GET /investigadores/:id/publicaciones` | PublicacionesView | — |
| `GET /proyectos/:id/software` | **ProyectosView** | — |
| `PATCH /publicaciones/:id` | PublicacionesManage | `publicacion.update` |
| `DELETE /publicaciones/:id` | PublicacionesManage | `publicacion.delete` |
| `PATCH /publicaciones/:id/reactivar` | PublicacionesManage | `publicacion.reactivate` |
| `POST /publicaciones/:id/autores` | PublicacionesManage | `publicacion.vincular_autor` |
| `DELETE /publicaciones/:id/autores/:pivotId` | PublicacionesManage | `publicacion.desvincular_autor` |
| `GET /publicaciones/:id/autores` | PublicacionesView | — |
| `POST /eventos` | InvestigadoresManage | `evento.create` |
| `GET /eventos` | InvestigadoresView | — |
| `GET /eventos/:id` | InvestigadoresView | — |
| `GET /investigadores/:id/eventos` | InvestigadoresView | — |
| `PATCH /eventos/:id` | InvestigadoresManage | `evento.update` |
| `DELETE /eventos/:id` | InvestigadoresManage | `evento.delete` |
| `PATCH /eventos/:id/reactivar` | InvestigadoresManage | `evento.reactivate` |

### 3.2 `PublicacionCientifica` (colección `publicaciones_cientificas`; respuesta snake_case)

```
id (_id), id_publicacion, titulo (obligatorio), doi?, issn?, anio? (i32), cuartil?, tipo (obligatorio),
resumen?, palabras_clave: string[], created_at?, updated_at?, activo (i64 default 1), handle_url?,
fecha_publicacion?, editorial?, id_org_unit_editora?, revista_titulo?, isbn?, scimago_cuartil?,
wos_cuartil?, es_revisado_por_pares (bool default true), acceso_abierto?, idioma?, volumen?,
numero_issue?, paginas?, dominio_origen (default "MANUAL"), pure_uuid?, estado_publicacion?,
id_proyecto? (FK desnormalizada D5a, SIN check de existencia en Rust), perucris_uuid?
```

**Validaciones** (`new()`, models.rs L68-180):
- `tipo` ∈ vocabulario: `articulo, articulo_revista, articulo_conferencia, carta, resena, comunicacion_congreso, libro, capitulo_libro, software, tesis, journal article, conference paper, letter, review` (los últimos 4 legacy EN — mantener aceptados para lectura, ver §5 D3).
- `doi`: VO `Doi` — trim, ≤255, prefijo `10.`, separador `/`, registrante solo dígitos, sufijo no vacío/sin espacios.
- `idioma`: ISO 639-1 (2 letras lowercase).
- `scimago_cuartil`/`wos_cuartil`: `Q1..Q4`.
- `acceso_abierto`: `acceso_abierto | solo_metadatos | embargado`.
- `dominio_origen`: `MANUAL | PURE | PERUCRIS`.

**Pivot `publicacion_autores`**: `_id`, `id_publicacion`, `id_persona` (obligatoria — sin null, §5 D3), `id_org_unit_afiliacion?`, `orden` (i32 ≥ 1), `es_autor_correspondiente` (bool default false).

**Eventos** (colección `eventos_academicos` — nombre difiere de la feature dir): participantes EMBEBIDOS (no pivot):
```
id (_id), id_evento, nombre (obligatorio), tipo (obligatorio, sin vocab), fecha_inicio?, fecha_fin?,
lugar?, descripcion?, participantes: [{ investigador_id, rol }], created_at?, updated_at?, activo
```
`get_eventos_by_investigador`: find `{"participantes.investigador_id": id, activo: 1}` (índice multikey).

### 3.3 Lógica

- **crear_publicacion**: `PublicacionCientifica::new(uuid, req)` — sin FK check de id_proyecto (Rust). Insert con `id` = `id_publicacion` = uuid v4.
- **eliminar**: soft-delete + hard-delete pivot autores (cascade delete_for_publicacion).
- **vincular_autor**: `ensure_exists` publicaciones_cientificas + personas + (org_units si afiliación). Unicidad via índice UNIQUE `{id_publicacion, id_persona}` → E11000 → 409.
- **get_by_investigador**: vía pivot — resolver `persona_id` del investigador (investigadores map), find pivot `{id_persona}`, luego `{id_publicacion: {$in}, activo: 1}`. Sin persona_id → [].
- **get_software_by_proyecto**: `{id_proyecto, tipo: "software", activo: 1}`.
- **update**: `$set` parcial + `updated_at`; Rust NO re-valida vocabulario en update (NestJS sí valida lo que recibe — ver §5 D7).
- **Eventos**: CRUD soft-delete; sin FK checks de participantes (Rust).

### 3.4 Índices (constraint efectivo; NO crear en NestJS)

- `publicaciones_cientificas`: UNIQUE `{id_publicacion}`; `{anio}`; UNIQUE `{doi}` partial `{$type: "string"}`; UNIQUE `{pure_uuid}` partial `{$type: "string"}`.
- `publicacion_autores`: UNIQUE `{id_publicacion, id_persona}` (no sparse) + `{id_persona}` + `{id_org_unit_afiliacion}`.
- `eventos_academicos`: UNIQUE `{id_evento}` + `{participantes.investigador_id}`.

---

## 4. Vocabularios compartidos (trasladar a const TS en el módulo que corresponda)

- Roles participación: ver §1.3. Roles org: ver §1.3.
- Tipos patente: §2.2. Holder types: §2.2.
- Tipos publicación (unión es + legacy): §3.2. Cuartiles Q1-Q4. Acceso abierto: 3 valores. Dominios origen: 3 valores.
- ISO 4217 (moneda): 3 letras ASCII uppercase. ISO 639-1 (idioma): 2 letras lowercase.

## 5. Discrepancias y resoluciones APROBADAS (usuario, 2026-09-01)

| # | Discrepancia hallada en Rust/sync | Resolución profesional aprobada |
|---|---|---|
| **D1** | `crear_proyecto_con_participantes` pasa `codigo: None` pero `Proyecto::new` exige código → create manual Rust falla SIEMPRE (models.rs L44-48 vs repository.rs L211, verificado). | `codigo` = atributo de negocio de la entidad, NO el ID del registro. Contrato REST: `codigo?` opcional (ingreso manual, trim, ≤64). Si ausente → **autogenerado** `PROJ-{YYYY}-{6 hex}` (uuid v4 recortado; colisión despreciable; UNIQUE partial protege). Manual duplicado → 409. Autogenerado en E11000 → retry con nuevo sufijo (máx 3). PATCH no edita codigo (como Rust). |
| **D2** | Bypass RBAC: `require_recursos_manage_or_responsable` retorna OK sin verificar cuando `proyecto_id=None` → responsable_proyecto puede crear/editar equipamientos/financiamientos sin check. | **Bypass CERRADO**. Helper NestJS: RecursosManage → ok; responsable_proyecto + proyectoId verificable (es_responsable_del_proyecto) → ok; responsable sin proyectoId → **403**. Regla permanente: jamás replicar un bug de seguridad. |
| **D3** | `pure.service.ts` (Bloque D) diverge: `journal_titulo` (campo inexistente; canónico es `revista_titulo`), `mapPureTipo` produce tipos fuera de vocabulario (`conferencia`, `dataset`, `working_paper`, `otros`), persiste `autores_json` (fuera del modelo), inserta pivotes con `id_persona: null` → E11000 contra UNIQUE no-sparse al 2º autor sin match. | **Fix pre-existente en E3.0** (tipo da2a138): `revista_titulo`; mapPureTipo → vocabulario canónico §3.2 (mapear conference paper→articulo_conferencia, dataset→software NO — dataset→omitir/otros→resena según semántica Pure; decidir en implementación con tabla de mapeo explícita); pivot SOLO inserta autores con persona resuelta (omitiendo no-resueltos, como Rust); eliminar `autores_json` del doc. Vocabulario canónico = unión es + legacy EN (lectura tolerante, escritura validada). |
| **D4** | `get_equipamientos_proyecto` / `get_financiamientos_proyecto` son no-ops en Rust (filtran `proyecto_id`, campo eliminado D10 → siempre []). | **Resolver de verdad**: `GET /proyectos/:id/financiamientos-recursos` → ids del pivot `proyecto_financiamientos` → `financiamientos.find({id_financiamiento: {$in}, activo: 1})`. `GET /proyectos/:id/equipamientos` → pivots financiamientos del proyecto → `equipamientos.find({id_financiamiento: {$in}, activo: 1})`. 404 si el proyecto no existe. |
| **D5** | db.rs Rust crea índices de pivots DOS veces (manual + macro, specs distintos en patente_titulares). | NestJS NO crea índices (dueño BD = Rust hasta fase H). Documentar specs efectivos §2.4. Deuda de dedup de índices se reporta para fase H. |
| **D6** | `financiamientos.codigo` sin UNIQUE en BD pese a ser obligatorio en modelo. | Mantener constraint como en BD (sin UNIQUE). Validar codigo obligatorio + no vacío en servicio (400). Deuda BD reportada. |
| **D7** | Rust no re-valida vocabulario en update de publicaciones; CRUD no valida FK id_proyecto. | NestJS valida TODO input con class-validator (tipos, DOI, cuartiles, idioma, acceso) en create Y update. FK id_proyecto: `ensure_exists` en create/update si viene (404) — validación de entrada estricta es práctica profesional; NO rompe no-regresión (Rust aceptaba menos, no más). |
| **D8** | Sync Pure NestJS usa id_publicacion `pub-pure-{uuid}` vs Rust uuid v4 puro. | Mantener `pub-pure-{uuid}` (NestJS ya migrado, trazable). El CRUD manual usa uuid v4. Ambos conviven (UNIQUE id_publicacion protege). |

## 6. Notas de implementación NestJS

- Requests camelCase + class-validator en TODO endpoint; respuestas snake_case 1:1 con DTOs Rust.
- Guards: `JwtAuth` + `Permissions` + `RequirePermission` como en los módulos B-D.
- Audit JSONL interceptor en cada mutación (eventos §1.1/§2.1/§3.1).
- Transacciones MongoDB (driver nativo `startSession`/`withTransaction`) en: crear/actualizar/eliminar proyecto.
- Rutas anidadas `GET /investigadores/:id/{proyectos,publicaciones,eventos}`: idiomático NestJS = controller dedicado por recurso dueño (p.ej. `InvestigadorProyectosController @Controller('investigadores/:id/proyectos')`).
- Soft-delete: lecturas SIEMPRE `activo: 1` (excepto reactivar que lo setea).
- Timestamps epoch ms (`Date.now()`).
- `_id` compuesto participaciones `{id_proyecto}:{id_investigador}`; pivots con `_id` uuid v4; recursos con `id_*` uuid v4 además del `_id`.
