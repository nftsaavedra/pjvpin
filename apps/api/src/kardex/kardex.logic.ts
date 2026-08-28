/**
 * Servicio kardex RENACYT — trazabilidad historica de cambios en el bloque
 * RENACYT de un investigador (nivel, grupo, condicion, fechas oficiales,
 * ORCID, Scopus ID y formaciones academicas).
 *
 * RENACYT no conserva historial de cambios: cada refresh individual
 * sobrescribe el documento del investigador en PJVPI. Sin este kardex,
 * la perdida de informacion es silenciosa.
 *
 * `diffRenacyt` es la funcion pura (testeable sin MongoDB) que compara
 * el estado actual del Investigador contra un `RenacytLookupResult` nuevo
 * y devuelve un `KardexEntry | null`. Las entradas se persisten en la
 * coleccion `renacyt_kardex` (ver `investigadores.repository`).
 */

export type KardexDisparador = "refresh_individual" | "refresh_masivo" | "importacion_lote";

export interface CambioKardex {
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

export interface FormacionResumen {
  centro: string | null;
  grado: string | null;
  titulo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  puntaje: string | null;
  considerado_para_cc: boolean | null;
  es_calificado: boolean | null;
}

export interface FormacionesDiff {
  agregadas: FormacionResumen[];
  retiradas: FormacionResumen[];
  sin_detalle: boolean;
}

export interface KardexEntry {
  id: string;
  investigador_id: string;
  persona_id: string;
  fecha_evento: number;
  disparador: KardexDisparador;
  cambios: CambioKardex[];
  formaciones_diff: FormacionesDiff | null;
}

const CAMPOS_CLASIFICATORIOS: ReadonlySet<string> = new Set([
  "nivel",
  "grupo",
  "condicion",
  "fecha_informe_calificacion",
  "fecha_ultima_revision",
]);

export function tieneCambioClasificatorio(entry: KardexEntry): boolean {
  return entry.cambios.some((c) => CAMPOS_CLASIFICATORIOS.has(c.campo));
}

export interface InvestigadorRenacytSnapshot {
  id_investigador: string;
  persona_id: string;
  renacyt_nivel: string | null;
  renacyt_grupo: string | null;
  renacyt_condicion: string | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
  renacyt_fecha_informe_calificacion: number | null;
  renacyt_fecha_ultima_revision: number | null;
  renacyt_formaciones_academicas_json: string | null;
}

export interface RenacytLookupLike {
  nivel: string | null;
  grupo: string | null;
  condicion: string | null;
  orcid: string | null;
  scopus_author_id: string | null;
  fecha_informe_calificacion: number | null;
  fecha_ultima_revision: number | null;
  formaciones_academicas_json: string | null;
}

function tsToIsoDate(ts: number | null): string | null {
  if (ts == null) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compareOptionalStr(
  campo: string,
  anterior: string | null | undefined,
  nuevo: string | null | undefined,
): CambioKardex | null {
  const a = anterior == null ? null : anterior.trim() || null;
  const n = nuevo == null ? null : nuevo.trim() || null;
  if (a === n) return null;
  return { campo, valor_anterior: a, valor_nuevo: n };
}

function pickStr(v: unknown, keys: readonly string[]): string | null {
  if (!v || typeof v !== "object") return null;
  for (const k of keys) {
    const value = (v as Record<string, unknown>)[k];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function pickBool(v: unknown, keys: readonly string[]): boolean | null {
  if (!v || typeof v !== "object") return null;
  for (const k of keys) {
    const value = (v as Record<string, unknown>)[k];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function pickNumberStr(v: unknown, keys: readonly string[]): string | null {
  if (!v || typeof v !== "object") return null;
  for (const k of keys) {
    const value = (v as Record<string, unknown>)[k];
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function formacionKey(f: FormacionResumen): string {
  return `${f.centro ?? ""}|${f.grado ?? ""}|${f.titulo ?? ""}`;
}

function parseFormaciones(json: string): FormacionResumen[] | null {
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  return arr.map((v) => ({
    centro: pickStr(v, ["centro", "centroEstudios", "institucion"]),
    grado: pickStr(v, ["grado", "gradoAcademico", "nivelFormacion"]),
    titulo: pickStr(v, ["titulo", "tituloProfesional", "carrera"]),
    fecha_inicio: pickNumberStr(v, ["fechaInicio", "fecha_inicio"]),
    fecha_fin: pickNumberStr(v, ["fechaFin", "fecha_fin"]),
    puntaje: pickNumberStr(v, ["puntaje", "score"]),
    considerado_para_cc: pickBool(v, ["consideradoParaCc", "considerado_para_cc"]),
    es_calificado: pickBool(v, ["esCalificado", "es_calificado"]),
  }));
}

function diffFormaciones(
  anteriorJson: string | null,
  nuevoJson: string | null,
): FormacionesDiff | null {
  const aTrim = anteriorJson == null ? null : anteriorJson.trim() || null;
  const nTrim = nuevoJson == null ? null : nuevoJson.trim() || null;
  if (aTrim === nTrim) return null;
  const anteriores = aTrim ? parseFormaciones(aTrim) : null;
  const nuevas = nTrim ? parseFormaciones(nTrim) : null;
  if (anteriores == null || nuevas == null) {
    return { agregadas: [], retiradas: [], sin_detalle: true };
  }
  const keysA = anteriores.map(formacionKey);
  const keysN = nuevas.map(formacionKey);
  return {
    agregadas: nuevas.filter((f) => !keysA.includes(formacionKey(f))),
    retiradas: anteriores.filter((f) => !keysN.includes(formacionKey(f))),
    sin_detalle: false,
  };
}

function collectCambios(
  actual: InvestigadorRenacytSnapshot,
  lookup: RenacytLookupLike,
): CambioKardex[] {
  const cambios: CambioKardex[] = [];
  const pairs: ReadonlyArray<readonly [string, string | null, string | null]> = [
    ["nivel", actual.renacyt_nivel, lookup.nivel],
    ["grupo", actual.renacyt_grupo, lookup.grupo],
    ["condicion", actual.renacyt_condicion, lookup.condicion],
    ["orcid", actual.renacyt_orcid, lookup.orcid],
    ["scopus_author_id", actual.renacyt_scopus_author_id, lookup.scopus_author_id],
    [
      "fecha_informe_calificacion",
      tsToIsoDate(actual.renacyt_fecha_informe_calificacion),
      tsToIsoDate(lookup.fecha_informe_calificacion),
    ],
    [
      "fecha_ultima_revision",
      tsToIsoDate(actual.renacyt_fecha_ultima_revision),
      tsToIsoDate(lookup.fecha_ultima_revision),
    ],
  ];
  for (const [campo, anterior, nuevo] of pairs) {
    const cambio = compareOptionalStr(campo, anterior, nuevo);
    if (cambio) cambios.push(cambio);
  }
  return cambios;
}

/**
 * Compara el estado actual del Investigador contra un lookup nuevo y devuelve
 * una entrada del kardex si hay cambios. Retorna `null` si nada cambio.
 * Funcion pura — sin I/O, sin reloj del sistema.
 */
export function diffRenacyt(
  actual: InvestigadorRenacytSnapshot,
  lookup: RenacytLookupLike,
  disparador: KardexDisparador,
  fechaEvento: number,
): KardexEntry | null {
  const cambios = collectCambios(actual, lookup);
  const formacionesDiff = diffFormaciones(
    actual.renacyt_formaciones_academicas_json,
    lookup.formaciones_academicas_json,
  );
  if (cambios.length === 0 && formacionesDiff === null) return null;
  return {
    id: "",
    investigador_id: actual.id_investigador,
    persona_id: actual.persona_id,
    fecha_evento: fechaEvento,
    disparador,
    cambios,
    formaciones_diff: formacionesDiff,
  };
}
