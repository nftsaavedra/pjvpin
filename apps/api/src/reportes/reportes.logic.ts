/**
 * Logica pura del modulo `reportes` (9 endpoints GET read-only).
 *
 * Sin acceso a MongoDB: cada funcion recibe los documentos ya cargados por
 * `ReportesExportRepository` / `ReportesIntegralRepository`. Esto permite
 * testear los 6 datasets y los 3 builders integrales sin red ni fixtures de BD.
 *
 * Ports:
 *   - Datasets:   `apps/desktop/src-tauri/src/proyectos/export_queries.rs`
 *   - Integrales: `apps/desktop/src-tauri/src/reportes/repository_proyecto.rs`,
 *                 `repository_investigador.rs`, `repository_export.rs`
 *   - Etiquetado: helpers `from_*` de `apps/desktop/src-tauri/src/reportes/dto.rs`
 *
 * Convenciones heredadas del Rust:
 *   - `resolve_grado_nombre` -> "Sin grado" cuando el grado no existe.
 *   - `resolve_renacyt_nivel` -> "No registrado" cuando el nivel es null/blank.
 *   - `join_or_none` -> `null` cuando la lista esta vacia (nunca "").
 *   - `activo` se compara contra `1` (representacion numerica en BD).
 */
import { AppError } from "../infra/errors/app-error";
import {
  resolveEstadoFinancieroNombre,
  resolveEstadoPatenteNombre,
  resolveMonedaNombre,
  resolveTipoFinanciamientoNombre,
  resolveTipoPatenteNombre,
  type CatalogoMap,
} from "./catalogo.helper";
import type {
  EquipamientoReporteDoc,
  FinanciamientoReporteDoc,
  GradoReporteDoc,
  GrupoReporteDoc,
  InvestigadorReporteDoc,
  OrgUnitReporteDoc,
  ParticipacionReporteDoc,
  PatenteInventorReporteDoc,
  PatenteReporteDoc,
  PersonaReporteDoc,
  ProyectoFinanciamientoReporteDoc,
  ProyectoReporteDoc,
  PublicacionAutorReporteDoc,
  PublicacionReporteDoc,
} from "./reportes.docs";
import type {
  ExportDataConProjectosDto,
  ExportDataDto,
  ExportDataGrupoDto,
  ExportDataInvestigadorPerfilDto,
  ExportDataProyectoAreaDto,
  ExportDataRecursoDto,
} from "./dto/export.dto";
import type {
  EstadoDesglose,
  MonedaDesglose,
  ResumenFinanciero,
} from "./dto/moneda-desglose.dto";
import type {
  ColegaProyecto,
  EquipamientoConEtiquetas,
  FinanciamientoConEtiquetas,
  MiembroProyectoReporte,
  PatenteConEtiquetas,
  ProyectoInvestigadorDetalle,
  PublicacionConEtiquetas,
  RecursosProyectoResumen,
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
  SoftwareConEtiquetas,
} from "./dto/integral.dto";

export const SIN_GRADO = "Sin grado";
export const RENACYT_NO_REGISTRADO = "No registrado";
export const SIN_AREA_OCDE = "Sin area OCDE";
export const SEPARADOR_LISTA = " | ";

export const TIPO_RECURSO_PATENTE = "Patente";
export const TIPO_RECURSO_SOFTWARE = "Software";
export const TIPO_RECURSO_EQUIPAMIENTO = "Equipamiento";
export const TIPO_RECURSO_FINANCIAMIENTO = "Financiamiento";

/**
 * Discriminante D5a: los "productos" del modelo legacy son publicaciones con
 * `tipo = "software"`. Valor canonico del vocabulario de publicaciones
 * (`publicaciones/vocab.ts` -> `TIPOS_PUBLICACION_VALIDOS`) y del Rust
 * `shared::vocab_mapper::PUBLICACION_TIPO_SOFTWARE`.
 */
export const PUBLICACION_TIPO_SOFTWARE = "software";

// ═══════════════════════════════════════════════════════════════════
// Helpers de resolucion (port de `shared::data_loader`)
// ═══════════════════════════════════════════════════════════════════

export function resolveGradoNombre(
  grados: Map<string, GradoReporteDoc>,
  idGrado: string | null,
): string {
  if (idGrado == null) return SIN_GRADO;
  return grados.get(idGrado)?.nombre ?? SIN_GRADO;
}

export function resolveRenacytNivel(investigador: InvestigadorReporteDoc): string {
  const raw = investigador.renacyt_nivel;
  if (raw == null || raw.trim().length === 0) return RENACYT_NO_REGISTRADO;
  return raw;
}

export function joinOrNone(items: string[], separator: string): string | null {
  if (items.length === 0) return null;
  return items.join(separator);
}

/**
 * Nombre completo del investigador. Prioriza la `Persona` referenciada (unica
 * fuente en el port Rust) y cae al campo desnormalizado de la coleccion
 * `investigadores` que escribe el API NestJS.
 */
export function resolveNombreCompleto(
  personas: Map<string, PersonaReporteDoc>,
  investigador: InvestigadorReporteDoc,
): string {
  return (
    personas.get(investigador.id_persona)?.nombre_completo ??
    investigador.nombre_completo ??
    ""
  );
}

export function resolveDni(
  personas: Map<string, PersonaReporteDoc>,
  investigador: InvestigadorReporteDoc,
): string {
  return personas.get(investigador.id_persona)?.dni ?? investigador.dni ?? "";
}

function resolveNombres(
  personas: Map<string, PersonaReporteDoc>,
  investigador: InvestigadorReporteDoc,
): string | null {
  const persona = personas.get(investigador.id_persona);
  if (persona) return persona.nombres ?? null;
  return investigador.nombres ?? null;
}

function resolveApellidoPaterno(
  personas: Map<string, PersonaReporteDoc>,
  investigador: InvestigadorReporteDoc,
): string | null {
  const persona = personas.get(investigador.id_persona);
  if (persona) return persona.apellido_paterno ?? null;
  return investigador.apellido_paterno ?? null;
}

function resolveApellidoMaterno(
  personas: Map<string, PersonaReporteDoc>,
  investigador: InvestigadorReporteDoc,
): string | null {
  const persona = personas.get(investigador.id_persona);
  if (persona) return persona.apellido_materno ?? null;
  return investigador.apellido_materno ?? null;
}

function resolveGrupo(
  grupos: Map<string, GrupoReporteDoc>,
  investigador: InvestigadorReporteDoc,
): { nombre: string | null; id: string | null } {
  const gid = investigador.grupo_investigacion_id;
  if (gid == null) return { nombre: null, id: null };
  const grupo = grupos.get(gid);
  if (!grupo) return { nombre: null, id: null };
  return { nombre: grupo.nombre, id: grupo.id_grupo };
}

function programasRelacionados(proyecto: ProyectoReporteDoc): string[] {
  return proyecto.programas_relacionados ?? [];
}

function esActivo(activo: number | null | undefined): boolean {
  return activo === 1;
}

/**
 * Normaliza `undefined` a `null`. Los documentos legacy pueden no traer un
 * campo opcional; sin esta normalizacion `JSON.stringify` lo OMITE de la
 * respuesta, mientras el contrato Rust (`Option<T>`) siempre emite `null`.
 */
function orNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// Indices derivados (reutilizados por varios datasets)
// ═══════════════════════════════════════════════════════════════════

export function indexById<T>(items: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(key(item), item);
  return map;
}

/**
 * Primer inventor registrado por patente. Replica el `entry().or_insert()` del
 * Rust: gana el PRIMER documento del pivot en orden de lectura.
 */
export function buildPrimerInventorMap(
  inventores: PatenteInventorReporteDoc[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const inv of inventores) {
    if (!map.has(inv.id_patente)) map.set(inv.id_patente, inv.id_persona);
  }
  return map;
}

/** `id_financiamiento -> id_proyecto[]` desde el pivot `proyecto_financiamientos`. */
export function buildFinanciamientoProyectosMap(
  pivots: ProyectoFinanciamientoReporteDoc[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const pivot of pivots) {
    const bucket = map.get(pivot.id_financiamiento);
    if (bucket) bucket.push(pivot.id_proyecto);
    else map.set(pivot.id_financiamiento, [pivot.id_proyecto]);
  }
  return map;
}

/** `id_persona -> cantidad de publicaciones` desde el pivot `publicacion_autores`. */
export function buildPublicacionesPorPersona(
  autores: PublicacionAutorReporteDoc[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const autor of autores) {
    map.set(autor.id_persona, (map.get(autor.id_persona) ?? 0) + 1);
  }
  return map;
}

function buildProyectosPorInvestigador(
  participaciones: ParticipacionReporteDoc[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of participaciones) {
    const bucket = map.get(part.id_investigador);
    if (bucket) bucket.push(part.id_proyecto);
    else map.set(part.id_investigador, [part.id_proyecto]);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 1 — exportacion plana
// ═══════════════════════════════════════════════════════════════════

export interface DatasetPlanaInput {
  grados: Map<string, GradoReporteDoc>;
  investigadores: Map<string, InvestigadorReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  participaciones: ParticipacionReporteDoc[];
}

export function proyectarPlana(input: DatasetPlanaInput): ExportDataDto[] {
  const data: ExportDataDto[] = [];
  for (const part of input.participaciones) {
    const proyecto = input.proyectos.get(part.id_proyecto);
    if (!proyecto) continue;
    const investigador = input.investigadores.get(part.id_investigador);
    if (!investigador) continue;
    if (!esActivo(proyecto.activo) || !esActivo(investigador.activo)) continue;

    data.push({
      proyecto: proyecto.titulo_proyecto,
      grado: resolveGradoNombre(input.grados, investigador.id_grado),
      renacyt_nivel: resolveRenacytNivel(investigador),
      investigador: resolveNombreCompleto(input.personas, investigador),
      dni: resolveDni(input.personas, investigador),
    });
  }

  data.sort((a, b) => {
    const byProyecto = compareStrings(a.proyecto, b.proyecto);
    if (byProyecto !== 0) return byProyecto;
    return compareStrings(a.investigador, b.investigador);
  });
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 2 — exportacion agrupada por investigador
// ═══════════════════════════════════════════════════════════════════

export interface DatasetAgrupadaInput {
  grados: Map<string, GradoReporteDoc>;
  grupos: Map<string, GrupoReporteDoc>;
  /** Investigadores ACTIVOS (port de `get_all_investigadores`). */
  investigadoresActivos: InvestigadorReporteDoc[];
  personas: Map<string, PersonaReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  participaciones: ParticipacionReporteDoc[];
}

export function proyectarAgrupadaInvestigador(
  input: DatasetAgrupadaInput,
): ExportDataConProjectosDto[] {
  const activos = new Set(input.investigadoresActivos.map((i) => i.id_investigador));
  const proyectosPorInvestigador = new Map<string, string[]>();

  for (const part of input.participaciones) {
    if (!activos.has(part.id_investigador)) continue;
    const proyecto = input.proyectos.get(part.id_proyecto);
    if (!proyecto || !esActivo(proyecto.activo)) continue;
    const bucket = proyectosPorInvestigador.get(part.id_investigador);
    if (bucket) bucket.push(proyecto.titulo_proyecto);
    else proyectosPorInvestigador.set(part.id_investigador, [proyecto.titulo_proyecto]);
  }

  const data: ExportDataConProjectosDto[] = input.investigadoresActivos.map(
    (investigador) => {
      const titulos = proyectosPorInvestigador.get(investigador.id_investigador) ?? [];
      return {
        investigador: resolveNombreCompleto(input.personas, investigador),
        dni: resolveDni(input.personas, investigador),
        grado: resolveGradoNombre(input.grados, investigador.id_grado),
        renacyt_nivel: resolveRenacytNivel(investigador),
        grupo_investigacion: resolveGrupo(input.grupos, investigador).nombre,
        cantidad_proyectos: titulos.length,
        proyectos: joinOrNone(titulos, SEPARADOR_LISTA),
      };
    },
  );

  data.sort((a, b) => compareStrings(a.investigador, b.investigador));
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 3 — exportacion por grupo de investigacion
// ═══════════════════════════════════════════════════════════════════

export interface DatasetGruposInput {
  grupos: GrupoReporteDoc[];
  investigadores: Map<string, InvestigadorReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  participaciones: ParticipacionReporteDoc[];
}

export function proyectarGrupos(input: DatasetGruposInput): ExportDataGrupoDto[] {
  const proyectosPorInvestigador = new Map<string, Set<string>>();
  for (const part of input.participaciones) {
    const bucket = proyectosPorInvestigador.get(part.id_investigador);
    if (bucket) bucket.add(part.id_proyecto);
    else proyectosPorInvestigador.set(part.id_investigador, new Set([part.id_proyecto]));
  }

  const data: ExportDataGrupoDto[] = [];
  for (const grupo of input.grupos) {
    const miembros = Array.from(input.investigadores.values()).filter(
      (i) => i.grupo_investigacion_id === grupo.id_grupo,
    );
    const miembrosNombres = miembros.map((m) => resolveNombreCompleto(input.personas, m));

    const coordinadorId = grupo.coordinador_id;
    const coordinadorInv = coordinadorId ? input.investigadores.get(coordinadorId) : undefined;
    const coordinador = coordinadorInv
      ? (input.personas.get(coordinadorInv.id_persona)?.nombre_completo ??
        coordinadorInv.nombre_completo ??
        null)
      : null;

    const proyectoIds = new Set<string>();
    for (const miembro of miembros) {
      const ids = proyectosPorInvestigador.get(miembro.id_investigador);
      if (!ids) continue;
      for (const id of ids) proyectoIds.add(id);
    }

    const proyectoTitles: string[] = [];
    for (const id of proyectoIds) {
      const proyecto = input.proyectos.get(id);
      if (!proyecto || !esActivo(proyecto.activo)) continue;
      proyectoTitles.push(proyecto.titulo_proyecto);
    }
    proyectoTitles.sort(compareStrings);

    data.push({
      grupo: grupo.nombre,
      descripcion: grupo.descripcion ?? null,
      coordinador,
      cantidad_miembros: miembros.length,
      miembros: joinOrNone(miembrosNombres, SEPARADOR_LISTA),
      lineas_investigacion: grupo.lineas_investigacion ?? [],
      cantidad_proyectos: proyectoTitles.length,
      proyectos: joinOrNone(proyectoTitles, SEPARADOR_LISTA),
    });
  }

  data.sort((a, b) => compareStrings(a.grupo, b.grupo));
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 4 — exportacion de recursos
// ═══════════════════════════════════════════════════════════════════

export interface DatasetRecursosInput {
  catalogoMap: CatalogoMap;
  investigadores: Map<string, InvestigadorReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  patentes: PatenteReporteDoc[];
  softwarePublicaciones: PublicacionReporteDoc[];
  equipamientos: EquipamientoReporteDoc[];
  financiamientos: FinanciamientoReporteDoc[];
  patenteInventores: PatenteInventorReporteDoc[];
  orgUnits: OrgUnitReporteDoc[];
  proyectoFinanciamientos: ProyectoFinanciamientoReporteDoc[];
}

export function proyectarRecursos(input: DatasetRecursosInput): ExportDataRecursoDto[] {
  const primerInventor = buildPrimerInventorMap(input.patenteInventores);
  const orgUnitsMap = indexById(input.orgUnits, (o) => o.id_org_unit);
  const finProyectos = buildFinanciamientoProyectosMap(input.proyectoFinanciamientos);
  const investigadoresPorPersona = indexById(
    Array.from(input.investigadores.values()),
    (i) => i.id_persona,
  );

  const equipProyectos = new Map<string, string[]>();
  for (const equipamiento of input.equipamientos) {
    const idFin = equipamiento.id_financiamiento;
    if (idFin == null) continue;
    const proyectos = finProyectos.get(idFin);
    if (proyectos) equipProyectos.set(equipamiento.id_equipamiento, proyectos);
  }

  const tituloProyecto = (idProyecto: string | null | undefined): string | null => {
    if (idProyecto == null) return null;
    return input.proyectos.get(idProyecto)?.titulo_proyecto ?? null;
  };
  const primerProyectoTitulo = (ids: string[] | undefined): string | null => {
    const first = ids?.[0];
    if (first == null) return null;
    return tituloProyecto(first);
  };

  const data: ExportDataRecursoDto[] = [];

  for (const patente of input.patentes) {
    const idPersona = primerInventor.get(patente.id_patente);
    const investigador = idPersona ? investigadoresPorPersona.get(idPersona) : undefined;
    data.push({
      tipo_recurso: TIPO_RECURSO_PATENTE,
      titulo_o_nombre: patente.titulo,
      proyecto: tituloProyecto(patente.proyecto_id),
      investigador: investigador
        ? resolveNombreCompleto(input.personas, investigador)
        : null,
      tipo: resolveTipoPatenteNombre(input.catalogoMap, patente.tipo),
      estado: resolveEstadoPatenteNombre(input.catalogoMap, patente.estado),
      moneda: null,
      monto: null,
    });
  }

  for (const publicacion of input.softwarePublicaciones) {
    data.push({
      tipo_recurso: TIPO_RECURSO_SOFTWARE,
      titulo_o_nombre: publicacion.titulo,
      proyecto: tituloProyecto(publicacion.id_proyecto),
      investigador: null,
      tipo: publicacion.tipo,
      estado: null,
      moneda: null,
      monto: null,
    });
  }

  for (const equipamiento of input.equipamientos) {
    data.push({
      tipo_recurso: TIPO_RECURSO_EQUIPAMIENTO,
      titulo_o_nombre: equipamiento.nombre,
      proyecto: primerProyectoTitulo(equipProyectos.get(equipamiento.id_equipamiento)),
      investigador: null,
      tipo: null,
      estado: null,
      moneda: resolveMonedaNombre(input.catalogoMap, equipamiento.moneda),
      monto: orNull(equipamiento.valor_estimado),
    });
  }

  for (const financiamiento of input.financiamientos) {
    const orgNombre = financiamiento.id_org_unit_financiadora
      ? orgUnitsMap.get(financiamiento.id_org_unit_financiadora)?.nombre
      : undefined;
    data.push({
      tipo_recurso: TIPO_RECURSO_FINANCIAMIENTO,
      titulo_o_nombre: orgNombre ?? financiamiento.nombre ?? "",
      proyecto: primerProyectoTitulo(
        finProyectos.get(financiamiento.id_financiamiento),
      ),
      investigador: null,
      tipo: resolveTipoFinanciamientoNombre(input.catalogoMap, financiamiento.tipo),
      estado: resolveEstadoFinancieroNombre(
        input.catalogoMap,
        financiamiento.estado_financiero,
      ),
      moneda: resolveMonedaNombre(input.catalogoMap, financiamiento.moneda),
      monto: orNull(financiamiento.monto),
    });
  }

  data.sort((a, b) => {
    const byTipo = compareStrings(a.tipo_recurso, b.tipo_recurso);
    if (byTipo !== 0) return byTipo;
    return compareStrings(
      a.titulo_o_nombre.toLowerCase(),
      b.titulo_o_nombre.toLowerCase(),
    );
  });
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 5 — perfil de investigadores
// ═══════════════════════════════════════════════════════════════════

export interface DatasetInvestigadoresPerfilInput {
  grados: Map<string, GradoReporteDoc>;
  grupos: Map<string, GrupoReporteDoc>;
  /** TODOS los investigadores (sin filtro `activo`; port de `load_investigadores_map`). */
  investigadores: InvestigadorReporteDoc[];
  personas: Map<string, PersonaReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  participaciones: ParticipacionReporteDoc[];
  publicacionAutores: PublicacionAutorReporteDoc[];
}

export function proyectarInvestigadoresPerfil(
  input: DatasetInvestigadoresPerfilInput,
): ExportDataInvestigadorPerfilDto[] {
  const ordenados = [...input.investigadores].sort((a, b) =>
    compareStrings(
      resolveNombreCompleto(input.personas, a).toLowerCase(),
      resolveNombreCompleto(input.personas, b).toLowerCase(),
    ),
  );
  const proyectosPorInvestigador = buildProyectosPorInvestigador(input.participaciones);
  const publicacionesPorPersona = buildPublicacionesPorPersona(input.publicacionAutores);

  return ordenados.map((investigador) => {
    const ids = proyectosPorInvestigador.get(investigador.id_investigador) ?? [];
    const titulos: string[] = [];
    for (const id of ids) {
      const proyecto = input.proyectos.get(id);
      if (!proyecto || !esActivo(proyecto.activo)) continue;
      titulos.push(proyecto.titulo_proyecto);
    }
    titulos.sort(compareStrings);

    return {
      dni: resolveDni(input.personas, investigador),
      nombres_apellidos: resolveNombreCompleto(input.personas, investigador),
      grado: resolveGradoNombre(input.grados, investigador.id_grado),
      renacyt_nivel: orNull(investigador.renacyt_nivel),
      renacyt_grupo: orNull(investigador.renacyt_grupo),
      renacyt_condicion: orNull(investigador.renacyt_condicion),
      renacyt_orcid: orNull(investigador.renacyt_orcid),
      grupo_investigacion: resolveGrupo(input.grupos, investigador).nombre,
      cantidad_proyectos: titulos.length,
      cantidad_publicaciones: publicacionesPorPersona.get(investigador.id_persona) ?? 0,
      proyectos: joinOrNone(titulos, SEPARADOR_LISTA),
      activo: esActivo(investigador.activo),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// Dataset 6 — proyectos por area OCDE
// ═══════════════════════════════════════════════════════════════════

export interface DatasetProyectosAreaInput {
  /** Proyectos ACTIVOS (el Rust filtra `activo = 1` en la query). */
  proyectosActivos: ProyectoReporteDoc[];
  participaciones: ParticipacionReporteDoc[];
}

export function proyectarProyectosArea(
  input: DatasetProyectosAreaInput,
): ExportDataProyectoAreaDto[] {
  const ordenados = [...input.proyectosActivos].sort((a, b) =>
    compareStrings(a.titulo_proyecto.toLowerCase(), b.titulo_proyecto.toLowerCase()),
  );

  const investigadoresPorProyecto = new Map<string, Set<string>>();
  for (const part of input.participaciones) {
    const bucket = investigadoresPorProyecto.get(part.id_proyecto);
    if (bucket) bucket.add(part.id_investigador);
    else
      investigadoresPorProyecto.set(part.id_proyecto, new Set([part.id_investigador]));
  }

  const areas = new Map<string, { titulos: string[]; investigadores: Set<string> }>();
  for (const proyecto of ordenados) {
    const key = proyecto.campo_ocde ?? SIN_AREA_OCDE;
    let entry = areas.get(key);
    if (!entry) {
      entry = { titulos: [], investigadores: new Set<string>() };
      areas.set(key, entry);
    }
    entry.titulos.push(proyecto.titulo_proyecto);
    const investigadores = investigadoresPorProyecto.get(proyecto.id_proyecto);
    if (investigadores) {
      for (const id of investigadores) entry.investigadores.add(id);
    }
  }

  const data: ExportDataProyectoAreaDto[] = Array.from(areas.entries()).map(
    ([area, entry]) => ({
      area,
      cantidad_proyectos: entry.titulos.length,
      proyectos: joinOrNone(entry.titulos, SEPARADOR_LISTA),
      cantidad_investigadores: entry.investigadores.size,
    }),
  );

  data.sort((a, b) => compareStrings(a.area, b.area));
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// Mappers de etiquetado (port de los `from_*` de `reportes/dto.rs`)
// ═══════════════════════════════════════════════════════════════════

export function mapPatenteConEtiquetas(
  patente: PatenteReporteDoc,
  catalogoMap: CatalogoMap,
): PatenteConEtiquetas {
  return {
    id_patente: patente.id_patente,
    titulo: patente.titulo,
    numero_patente: orNull(patente.numero_patente),
    tipo_codigo: orNull(patente.tipo),
    tipo_nombre: resolveTipoPatenteNombre(catalogoMap, patente.tipo),
    estado_codigo: orNull(patente.estado),
    estado_nombre: resolveEstadoPatenteNombre(catalogoMap, patente.estado),
    fecha_solicitud: orNull(patente.fecha_solicitud),
    fecha_concesion: orNull(patente.fecha_concesion),
    pais: orNull(patente.pais),
    entidad_concedente: orNull(patente.entidad_concedente),
    descripcion: orNull(patente.descripcion),
  };
}

export function mapSoftwareConEtiquetas(
  publicacion: PublicacionReporteDoc,
): SoftwareConEtiquetas {
  return {
    id_publicacion: publicacion.id_publicacion,
    titulo: publicacion.titulo,
    tipo: publicacion.tipo,
    doi: orNull(publicacion.doi),
    fecha_publicacion: orNull(publicacion.fecha_publicacion),
    descripcion: orNull(publicacion.resumen),
    idioma: orNull(publicacion.idioma),
    acceso_abierto: orNull(publicacion.acceso_abierto),
    pure_uuid: orNull(publicacion.pure_uuid),
  };
}

export function mapPublicacionConEtiquetas(
  publicacion: PublicacionReporteDoc,
): PublicacionConEtiquetas {
  return {
    id_publicacion: publicacion.id_publicacion,
    titulo: publicacion.titulo,
    tipo: publicacion.tipo,
    doi: orNull(publicacion.doi),
    anio: orNull(publicacion.anio),
    revista_titulo: orNull(publicacion.revista_titulo),
    issn: orNull(publicacion.issn),
    estado_publicacion: orNull(publicacion.estado_publicacion),
    pure_uuid: orNull(publicacion.pure_uuid),
    dominio_origen: publicacion.dominio_origen,
    es_revisado_por_pares: publicacion.es_revisado_por_pares === true,
  };
}

export function mapEquipamientoConEtiquetas(
  equipamiento: EquipamientoReporteDoc,
  catalogoMap: CatalogoMap,
): EquipamientoConEtiquetas {
  return {
    id_equipamiento: equipamiento.id_equipamiento,
    nombre: equipamiento.nombre,
    descripcion: orNull(equipamiento.descripcion),
    especificaciones: orNull(equipamiento.especificaciones),
    valor_estimado: orNull(equipamiento.valor_estimado),
    moneda_codigo: orNull(equipamiento.moneda),
    moneda_nombre: resolveMonedaNombre(catalogoMap, equipamiento.moneda),
    proveedor: orNull(equipamiento.proveedor),
    fecha_adquisicion: orNull(equipamiento.fecha_adquisicion),
  };
}

export function mapFinanciamientoConEtiquetas(
  financiamiento: FinanciamientoReporteDoc,
  catalogoMap: CatalogoMap,
): FinanciamientoConEtiquetas {
  return {
    id_financiamiento: financiamiento.id_financiamiento,
    // D10: el campo legacy `entidad_financiadora` fue eliminado; el nombre
    // visible del fondo vive en `Financiamiento.nombre`.
    entidad_financiadora: financiamiento.nombre ?? "",
    tipo_codigo: orNull(financiamiento.tipo),
    tipo_nombre: resolveTipoFinanciamientoNombre(catalogoMap, financiamiento.tipo),
    monto: orNull(financiamiento.monto),
    moneda_codigo: orNull(financiamiento.moneda),
    moneda_nombre: resolveMonedaNombre(catalogoMap, financiamiento.moneda),
    fecha_inicio: orNull(financiamiento.fecha_inicio),
    fecha_fin: orNull(financiamiento.fecha_fin),
    descripcion: orNull(financiamiento.descripcion),
    estado_financiero_codigo: orNull(financiamiento.estado_financiero),
    estado_financiero_nombre: resolveEstadoFinancieroNombre(
      catalogoMap,
      financiamiento.estado_financiero,
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Resumen financiero
// ═══════════════════════════════════════════════════════════════════

export const SIN_MONEDA_CODIGO = "sin_moneda";
export const SIN_MONEDA_NOMBRE = "Sin moneda";
export const SIN_ESTADO_CODIGO = "sin_estado";
export const SIN_ESTADO_NOMBRE = "Sin estado";

export function buildResumenFinanciero(
  financiamientos: FinanciamientoConEtiquetas[],
  catalogoMap: CatalogoMap,
): ResumenFinanciero {
  const monedaGroups = new Map<string, MonedaDesglose>();
  const estadoGroups = new Map<string, EstadoDesglose>();

  for (const f of financiamientos) {
    const monedaKey = f.moneda_codigo ?? SIN_MONEDA_CODIGO;
    const monedaNombre =
      f.moneda_nombre ??
      resolveMonedaNombre(catalogoMap, f.moneda_codigo) ??
      SIN_MONEDA_NOMBRE;

    let moneda = monedaGroups.get(monedaKey);
    if (!moneda) {
      moneda = {
        moneda_codigo: monedaKey,
        moneda_nombre: monedaNombre,
        cantidad: 0,
        monto_total: 0,
      };
      monedaGroups.set(monedaKey, moneda);
    }
    moneda.cantidad += 1;
    moneda.monto_total += f.monto ?? 0;

    const estadoKey = f.estado_financiero_codigo ?? SIN_ESTADO_CODIGO;
    const estadoNombre =
      f.estado_financiero_nombre ??
      resolveEstadoFinancieroNombre(catalogoMap, f.estado_financiero_codigo) ??
      SIN_ESTADO_NOMBRE;

    let estado = estadoGroups.get(estadoKey);
    if (!estado) {
      estado = {
        estado_codigo: estadoKey,
        estado_nombre: estadoNombre,
        cantidad: 0,
      };
      estadoGroups.set(estadoKey, estado);
    }
    estado.cantidad += 1;
  }

  const desglosePorMoneda = Array.from(monedaGroups.values()).sort((a, b) =>
    compareStrings(a.moneda_codigo, b.moneda_codigo),
  );
  const desglosePorEstado = Array.from(estadoGroups.values()).sort((a, b) =>
    compareStrings(a.estado_codigo, b.estado_codigo),
  );

  return {
    total_financiamientos: financiamientos.length,
    desglose_por_moneda: desglosePorMoneda,
    desglose_por_estado: desglosePorEstado,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Guards de existencia (404)
// ═══════════════════════════════════════════════════════════════════

/**
 * Unico punto donde se emite el 404 del reporte integral de proyecto.
 * Lo usan el builder puro y el service (para no lanzar queries inutiles).
 */
export function assertProyectoEncontrado(
  proyecto: ProyectoReporteDoc | null,
): ProyectoReporteDoc {
  if (proyecto === null) throw AppError.notFound("Proyecto no encontrado.");
  return proyecto;
}

/** Unico punto donde se emite el 404 del reporte integral de investigador. */
export function assertInvestigadorEncontrado(
  investigador: InvestigadorReporteDoc | null,
): InvestigadorReporteDoc {
  if (investigador === null) throw AppError.notFound("Investigador no encontrado.");
  return investigador;
}

// ═══════════════════════════════════════════════════════════════════
// Integral 1 — reporte de proyecto
// ═══════════════════════════════════════════════════════════════════

export interface ReporteProyectoInput {
  /** `null` cuando el `id_proyecto` no existe -> 404. */
  proyecto: ProyectoReporteDoc | null;
  participaciones: ParticipacionReporteDoc[];
  /** Investigadores de las participaciones, indexados por `id_investigador`. */
  investigadoresPorId: Map<string, InvestigadorReporteDoc>;
  /** `id_persona -> publicaciones_count` (pivot `publicacion_autores`). */
  publicacionesCountPorPersona: Map<string, number>;
  grados: Map<string, GradoReporteDoc>;
  grupos: Map<string, GrupoReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  catalogoMap: CatalogoMap;
  patentes: PatenteReporteDoc[];
  software: PublicacionReporteDoc[];
  equipamientos: EquipamientoReporteDoc[];
  financiamientos: FinanciamientoReporteDoc[];
}

export function buildReporteProyectoIntegral(
  input: ReporteProyectoInput,
): ReporteProyectoIntegral {
  const proyecto = assertProyectoEncontrado(input.proyecto);

  const equipo: MiembroProyectoReporte[] = input.participaciones.map((part) => {
    const investigador = input.investigadoresPorId.get(part.id_investigador);
    if (!investigador) {
      throw AppError.notFound("Investigador no encontrado.");
    }
    const grupo = resolveGrupo(input.grupos, investigador);
    return {
      id_investigador: investigador.id_investigador,
      dni: resolveDni(input.personas, investigador),
      nombres_apellidos: resolveNombreCompleto(input.personas, investigador),
      nombres: resolveNombres(input.personas, investigador),
      apellido_paterno: resolveApellidoPaterno(input.personas, investigador),
      apellido_materno: resolveApellidoMaterno(input.personas, investigador),
      grado_nombre: investigador.id_grado
        ? (input.grados.get(investigador.id_grado)?.nombre ?? "")
        : "",
      grado_id: investigador.id_grado ?? "",
      es_responsable: part.es_responsable === true,
      renacyt_codigo_registro: orNull(investigador.renacyt_codigo_registro),
      renacyt_nivel: orNull(investigador.renacyt_nivel),
      renacyt_grupo: orNull(investigador.renacyt_grupo),
      renacyt_condicion: orNull(investigador.renacyt_condicion),
      renacyt_orcid: orNull(investigador.renacyt_orcid),
      renacyt_scopus_author_id: orNull(investigador.renacyt_scopus_author_id),
      grupo_nombre: grupo.nombre,
      grupo_id: grupo.id,
      publicaciones_count:
        input.publicacionesCountPorPersona.get(investigador.id_persona) ?? 0,
    };
  });

  const patentes = input.patentes.map((p) =>
    mapPatenteConEtiquetas(p, input.catalogoMap),
  );
  const softwarePublicaciones = input.software.map(mapSoftwareConEtiquetas);
  const equipamientos = input.equipamientos.map((e) =>
    mapEquipamientoConEtiquetas(e, input.catalogoMap),
  );
  const financiamientos = input.financiamientos.map((f) =>
    mapFinanciamientoConEtiquetas(f, input.catalogoMap),
  );

  return {
    cabecera: {
      id_proyecto: proyecto.id_proyecto,
      titulo_proyecto: proyecto.titulo_proyecto,
      activo: esActivo(proyecto.activo),
      campo_ocde: orNull(proyecto.campo_ocde),
      programas_relacionados: programasRelacionados(proyecto),
      // El port Rust deja `fecha_creacion` en `None` (no se expone `created_at`).
      fecha_creacion: null,
      fecha_actualizacion:
        proyecto.updated_at == null ? null : String(proyecto.updated_at),
    },
    equipo,
    total_investigadores: equipo.length,
    patentes,
    total_patentes: patentes.length,
    software_publicaciones: softwarePublicaciones,
    total_software: softwarePublicaciones.length,
    equipamientos,
    total_equipamientos: equipamientos.length,
    financiamientos,
    total_financiamientos: financiamientos.length,
    resumen_financiero: buildResumenFinanciero(financiamientos, input.catalogoMap),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Integral 2/3 — reporte de investigador (individual y lote)
// ═══════════════════════════════════════════════════════════════════

export interface ReporteInvestigadorInput {
  /** `null` cuando el `id_investigador` no existe -> 404. */
  investigador: InvestigadorReporteDoc | null;
  grados: Map<string, GradoReporteDoc>;
  grupos: Map<string, GrupoReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  catalogoMap: CatalogoMap;
  investigadores: Map<string, InvestigadorReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  todasParticipaciones: ParticipacionReporteDoc[];
  /** `id_proyecto -> conteos de recursos` precalculados por el repositorio. */
  recursosPorProyecto: Map<string, RecursosProyectoResumen>;
  patentes: PatenteReporteDoc[];
  software: PublicacionReporteDoc[];
  equipamientos: EquipamientoReporteDoc[];
  publicaciones: PublicacionReporteDoc[];
}

const RECURSOS_VACIOS: RecursosProyectoResumen = {
  patentes: 0,
  software: 0,
  equipamientos: 0,
  financiamientos: 0,
};

export function buildReporteInvestigadorIntegral(
  input: ReporteInvestigadorInput,
): ReporteInvestigadorIntegral {
  const investigador = assertInvestigadorEncontrado(input.investigador);
  const idInvestigador = investigador.id_investigador;
  const grupo = resolveGrupo(input.grupos, investigador);

  const misParticipaciones = input.todasParticipaciones.filter(
    (p) => p.id_investigador === idInvestigador,
  );

  const proyectosDetalle: ProyectoInvestigadorDetalle[] = [];
  for (const participacion of misParticipaciones) {
    const proyecto = input.proyectos.get(participacion.id_proyecto);
    if (!proyecto) continue;

    const colegas: ColegaProyecto[] = [];
    for (const otra of input.todasParticipaciones) {
      if (otra.id_proyecto !== participacion.id_proyecto) continue;
      if (otra.id_investigador === idInvestigador) continue;
      const colega = input.investigadores.get(otra.id_investigador);
      if (!colega) continue;
      colegas.push({
        id_investigador: colega.id_investigador,
        nombres_apellidos: resolveNombreCompleto(input.personas, colega),
        grado_nombre: colega.id_grado
          ? (input.grados.get(colega.id_grado)?.nombre ?? "")
          : "",
        es_responsable: otra.es_responsable === true,
      });
    }

    proyectosDetalle.push({
      id_proyecto: proyecto.id_proyecto,
      titulo_proyecto: proyecto.titulo_proyecto,
      es_responsable: participacion.es_responsable === true,
      activo: esActivo(proyecto.activo),
      campo_ocde: orNull(proyecto.campo_ocde),
      programas_relacionados: programasRelacionados(proyecto),
      colegas,
      recursos_en_proyecto:
        input.recursosPorProyecto.get(proyecto.id_proyecto) ?? RECURSOS_VACIOS,
    });
  }

  const patentes = input.patentes.map((p) =>
    mapPatenteConEtiquetas(p, input.catalogoMap),
  );
  const software = input.software.map(mapSoftwareConEtiquetas);
  const equipamientos = input.equipamientos.map((e) =>
    mapEquipamientoConEtiquetas(e, input.catalogoMap),
  );
  const publicaciones = input.publicaciones.map(mapPublicacionConEtiquetas);

  return {
    perfil: {
      id_investigador: idInvestigador,
      dni: resolveDni(input.personas, investigador),
      nombres_apellidos: resolveNombreCompleto(input.personas, investigador),
      nombres: resolveNombres(input.personas, investigador),
      apellido_paterno: resolveApellidoPaterno(input.personas, investigador),
      apellido_materno: resolveApellidoMaterno(input.personas, investigador),
      grado_nombre: investigador.id_grado
        ? (input.grados.get(investigador.id_grado)?.nombre ?? "")
        : "",
      grado_id: investigador.id_grado ?? "",
      renacyt_codigo_registro: orNull(investigador.renacyt_codigo_registro),
      renacyt_id_investigador: orNull(investigador.renacyt_id_investigador),
      renacyt_nivel: orNull(investigador.renacyt_nivel),
      renacyt_grupo: orNull(investigador.renacyt_grupo),
      renacyt_condicion: orNull(investigador.renacyt_condicion),
      renacyt_fecha_informe_calificacion: orNull(
        investigador.renacyt_fecha_informe_calificacion,
      ),
      renacyt_fecha_registro: orNull(investigador.renacyt_fecha_registro),
      renacyt_fecha_ultima_revision: orNull(investigador.renacyt_fecha_ultima_revision),
      renacyt_orcid: orNull(investigador.renacyt_orcid),
      renacyt_scopus_author_id: orNull(investigador.renacyt_scopus_author_id),
      renacyt_ficha_url: orNull(investigador.renacyt_ficha_url),
      renacyt_formaciones_academicas_json: orNull(
        investigador.renacyt_formaciones_academicas_json,
      ),
      grupo_nombre: grupo.nombre,
      grupo_id: grupo.id,
    },
    proyectos: proyectosDetalle,
    total_proyectos: proyectosDetalle.length,
    recursos: {
      patentes,
      software,
      equipamientos,
      total_patentes: patentes.length,
      total_software: software.length,
      total_equipamientos: equipamientos.length,
    },
    publicaciones,
    total_publicaciones: publicaciones.length,
    trazabilidad: {
      updated_at: orNull(investigador.updated_at),
      fecha_ultima_sincronizacion_renacyt: orNull(
        investigador.renacyt_fecha_ultima_sincronizacion,
      ),
      // El port Rust no persiste la marca de sync Pure por investigador.
      fecha_ultima_sincronizacion_pure: null,
    },
  };
}

export function buildReportesInvestigadoresIntegral(
  inputs: ReporteInvestigadorInput[],
): ReporteInvestigadorIntegral[] {
  return inputs.map(buildReporteInvestigadorIntegral);
}

// ═══════════════════════════════════════════════════════════════════
// Comparadores
// ═══════════════════════════════════════════════════════════════════

/**
 * Comparacion lexicografica por code unit, equivalente a `String::cmp` de Rust.
 * NO se usa `localeCompare` para no alterar el orden del contrato existente.
 */
export function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
// Pure Master List (V8) - `GET /reportes/pure/masterlist`
// ═══════════════════════════════════════════════════════════════════

import {
  PURE_MASTERLIST_DEFAULT_EMPLOYED_AS,
  PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH,
  PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID,
  PURE_MASTERLIST_DEFAULT_STAFF_TYPE,
  PURE_MASTERLIST_DEFAULT_START_DATE,
  PURE_MASTERLIST_DEFAULT_VISIBILITY,
} from "../config/defaults";
import type {
  PureMasterlistData,
  PureMasterlistPersonRow,
  PureMasterlistStaffRow,
  PureMasterlistSummary,
} from "./dto/masterlist.dto";
import type {
  InvestigadorMasterlistDoc,
  PersonaMasterlistDoc,
} from "./repository-masterlist";

/**
 * Prefijo para PersonIDs de altas nuevas (alta en Pure). Distinto de `PER`
 * (reservado para los PersonIDs institucionales ya cargados) para evitar
 * colisiones. Coincide con `shared::defaults::PURE_MASTERLIST_NEW_PERSON_PREFIX`
 * del Rust.
 */
export const PURE_MASTERLIST_NEW_PERSON_PREFIX = "PJV-";

/**
 * Genera un PersonID deterministico para un investigador nuevo (no presente
 * en Pure). Formato: `PJV-{dni}`. Vacio si el DNI es vacio.
 *
 * Port 1:1 de `shared::defaults::pure_masterlist_new_person_id`.
 */
export function pureMasterlistNewPersonId(dni: string): string {
  const trimmed = dni.trim();
  if (trimmed.length === 0) return "";
  return `${PURE_MASTERLIST_NEW_PERSON_PREFIX}${trimmed}`;
}

/**
 * Constantes del V8 template: el master list SIEMPRE emite estos valores para
 * los campos con defaults del template institucional. Se acceden via
 * `apps/api/src/config/defaults.ts` (single source of truth con el Rust).
 */
export const PURE_MASTERLIST_PROFILED = "no";
export const PURE_MASTERLIST_PRIMARY = "yes";

/**
 * Mapea `persona.sexo` (M / Masculino / Male / F / Femenino / Female / etc.)
 * a los valores canonicos del Lists tab de Pure (`male` / `female` / `unknown`).
 * Devuelve `unknown` para valores no reconocidos o ausentes (Pure lo acepta).
 *
 * Port 1:1 de `repository_pure_masterlist::map_gender`.
 */
export function mapGender(sexo: string | null | undefined): "male" | "female" | "unknown" {
  if (!sexo) return "unknown";
  const trimmed = sexo.trim().toLowerCase();
  switch (trimmed) {
    case "m":
    case "male":
    case "masculino":
    case "masc":
    case "hombre":
    case "man":
      return "male";
    case "f":
    case "female":
    case "femenino":
    case "fem":
    case "mujer":
    case "woman":
      return "female";
    default:
      return "unknown";
  }
}

/**
 * Une apellido paterno y materno con un espacio. Si ambos son vacios,
 * devuelve `null` para no emitir una celda con un unico espacio.
 *
 * Port 1:1 de `repository_pure_masterlist::join_apellidos`.
 */
function joinApellidos(
  paterno: string | null | undefined,
  materno: string | null | undefined,
): string | null {
  const p = paterno?.trim() ?? "";
  const m = materno?.trim() ?? "";
  if (p.length === 0 && m.length === 0) return null;
  if (m.length === 0) return p;
  if (p.length === 0) return m;
  return `${p} ${m}`;
}

export interface BuildMasterlistInput {
  investigadoresActivos: InvestigadorMasterlistDoc[];
  personas: Map<string, PersonaMasterlistDoc>;
  /** Total de personas en el portal Pure remoto (opcional, viene del panel). */
  pureRemoteTotal?: number;
}

/**
 * Construye el payload completo (Persons + Staffrelations + Summary) del
 * master list V8 a partir de los investigadores activos y las personas.
 *
 * Reglas (port 1:1 del Rust `build_pure_masterlist_data`):
 *   - Solo se procesan investigadores cuya `Persona` referenciada existe.
 *   - `person_id` = `pure_person_id` si existe, o `PJV-{dni}` para altas
 *     nuevas (namespace propio, sin colision con los `PERxxx` institucionales).
 *   - `gender` se mapea via `mapGender` a `male` / `female` / `unknown`.
 *   - `correo` y `orcid` se trimean y se descartan si quedan vacios.
 *   - Defaults del V8 template (UNF001, public, academic, yes, 2025-06-02) en
 *     `apps/api/src/config/defaults.ts`.
 */
export function buildMasterlistData(input: BuildMasterlistInput): PureMasterlistData {
  const persons: PureMasterlistPersonRow[] = [];
  const staffRelations: PureMasterlistStaffRow[] = [];

  let actualizacionesPure = 0;
  let altasNuevas = 0;
  let sinCorreo = 0;
  let sinOrcid = 0;

  for (const inv of input.investigadoresActivos) {
    const persona = input.personas.get(inv.id_persona);
    if (!persona) continue;

    const hasPureId =
      inv.pure_person_id != null && inv.pure_person_id.trim().length > 0;
    const personId = hasPureId
      ? (inv.pure_person_id as string).trim()
      : pureMasterlistNewPersonId(persona.dni);
    if (hasPureId) {
      actualizacionesPure += 1;
    } else {
      altasNuevas += 1;
    }

    const correoTrim = persona.correo?.trim() ?? "";
    const emailValue = correoTrim.length > 0 ? correoTrim : null;
    if (emailValue === null) sinCorreo += 1;

    const orcidTrim = inv.renacyt_orcid?.trim() ?? "";
    const orcidValue = orcidTrim.length > 0 ? orcidTrim : null;
    if (orcidValue === null) sinOrcid += 1;

    const lastname = joinApellidos(persona.apellido_paterno, persona.apellido_materno);
    const scopusTrim = inv.renacyt_scopus_author_id?.trim() ?? "";
    const clientId2 = scopusTrim.length > 0 ? scopusTrim : null;

    persons.push({
      person_id: personId,
      profiled: PURE_MASTERLIST_PROFILED,
      username: emailValue,
      email: emailValue,
      title: null,
      title_translated: null,
      post_nominals: null,
      firstname: persona.nombres,
      lastname,
      firstname_translated: null,
      lastname_translated: null,
      first_name_known_as: null,
      last_name_known_as: null,
      first_name_sorting: null,
      last_name_sorting: null,
      former_last_name: null,
      prior_affiliations: null,
      nationality: null,
      gender: mapGender(persona.sexo),
      visibility: PURE_MASTERLIST_DEFAULT_VISIBILITY,
      orcid: orcidValue,
      profile_photo: null,
      client_id_1: null,
      client_id_2: clientId2,
      client_id_3: persona.dni,
      externally_authenticated: PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH,
    });

    staffRelations.push({
      person_id: personId,
      organisation_id: PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID,
      contract_type: null,
      job_title: null,
      job_description: null,
      job_description_translated: null,
      employed_as: PURE_MASTERLIST_DEFAULT_EMPLOYED_AS,
      fte: null,
      start_date: PURE_MASTERLIST_DEFAULT_START_DATE,
      end_date: null,
      direct_phone_nr: null,
      mobile_phone_nr: null,
      fax_nr: null,
      email: emailValue,
      website_url_en: null,
      website_url_translated: null,
      primary: PURE_MASTERLIST_PRIMARY,
      staff_type: PURE_MASTERLIST_DEFAULT_STAFF_TYPE,
    });
  }

  const summary: PureMasterlistSummary = {
    total: persons.length,
    actualizaciones_pure: actualizacionesPure,
    altas_nuevas: altasNuevas,
    sin_correo: sinCorreo,
    sin_orcid: sinOrcid,
    pure_remoto_total: input.pureRemoteTotal ?? 0,
  };

  return {
    persons,
    staff_relations: staffRelations,
    summary,
  };
}
