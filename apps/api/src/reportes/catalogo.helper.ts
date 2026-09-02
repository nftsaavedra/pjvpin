/**
 * Resolucion de etiquetas de catalogo para el modulo `reportes` (DRY).
 *
 * Replica el patron Rust `catalogo_map: HashMap<(String, String), CatalogoItem>`
 * (`shared::data_loader::load_catalogos_map`) y los lookups `from_*` de
 * `reportes/dto.rs`: dado un `tipo` de catalogo y un `codigo`, devuelve el
 * `nombre` legible o `null` cuando el catalogo no tiene el item (catalogos sin
 * seed toleran `null`, igual que el `Option` del Rust).
 *
 * Los 5 resolvers concretos (`tipo_patente`, `estado_patente`, `moneda`,
 * `tipo_financiamiento`, `estado_financiero`) se consumen desde los 3 reportes
 * integrales y desde el dataset de recursos, por lo que viven centralizados
 * aqui en lugar de dispersos por repositorio.
 */
import type { Db } from "mongodb";
import type { CatalogoReporteDoc } from "./reportes.docs";

/** Tipos de catalogo usados por reportes (single source of truth del modulo). */
export const CATALOGO_TIPO_PATENTE = "tipo_patente";
export const CATALOGO_ESTADO_PATENTE = "estado_patente";
export const CATALOGO_MONEDA = "moneda";
export const CATALOGO_TIPO_FINANCIAMIENTO = "tipo_financiamiento";
export const CATALOGO_ESTADO_FINANCIERO = "estado_financiero";

/**
 * Mapa `"{tipo}\u0000{codigo}" -> nombre`. El separador NUL evita colisiones
 * de clave con tipos/codigos que contengan `:` o `|`.
 */
export type CatalogoMap = Map<string, string>;

export function catalogoKey(tipo: string, codigo: string): string {
  return `${tipo}\u0000${codigo}`;
}

export function buildCatalogoMap(docs: CatalogoReporteDoc[]): CatalogoMap {
  const map: CatalogoMap = new Map();
  for (const doc of docs) {
    map.set(catalogoKey(doc.tipo, doc.codigo), doc.nombre);
  }
  return map;
}

/**
 * Carga los items de catalogo ACTIVOS y los indexa por `(tipo, codigo)`.
 * Port de `catalogos::repository::load_all_map` (filtro `activo = 1`).
 */
export async function loadCatalogoMap(db: Db): Promise<CatalogoMap> {
  const docs = await db
    .collection<CatalogoReporteDoc>("catalogos")
    .find({ activo: 1 })
    .toArray();
  return buildCatalogoMap(docs);
}

export function resolveCatalogoNombre(
  map: CatalogoMap,
  tipo: string,
  codigo: string | null | undefined,
): string | null {
  if (codigo == null) return null;
  return map.get(catalogoKey(tipo, codigo)) ?? null;
}

export function resolveTipoPatenteNombre(
  map: CatalogoMap,
  codigo: string | null | undefined,
): string | null {
  return resolveCatalogoNombre(map, CATALOGO_TIPO_PATENTE, codigo);
}

export function resolveEstadoPatenteNombre(
  map: CatalogoMap,
  codigo: string | null | undefined,
): string | null {
  return resolveCatalogoNombre(map, CATALOGO_ESTADO_PATENTE, codigo);
}

export function resolveMonedaNombre(
  map: CatalogoMap,
  codigo: string | null | undefined,
): string | null {
  return resolveCatalogoNombre(map, CATALOGO_MONEDA, codigo);
}

export function resolveTipoFinanciamientoNombre(
  map: CatalogoMap,
  codigo: string | null | undefined,
): string | null {
  return resolveCatalogoNombre(map, CATALOGO_TIPO_FINANCIAMIENTO, codigo);
}

export function resolveEstadoFinancieroNombre(
  map: CatalogoMap,
  codigo: string | null | undefined,
): string | null {
  return resolveCatalogoNombre(map, CATALOGO_ESTADO_FINANCIERO, codigo);
}
