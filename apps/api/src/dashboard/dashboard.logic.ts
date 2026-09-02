/**
 * Lógica pura del módulo `dashboard` (4 endpoints GET read-only).
 *
 * Sin acceso a MongoDB ni reloj del sistema: cada función recibe los datos
 * ya cargados por `DashboardRepository` (o `countProyectosActivos`). Esto
 * permite testearla sin red ni fixtures, replicando los 4 algoritmos del
 * backend Rust `apps/desktop/src-tauri/src/proyectos/repository_stats.rs`.
 *
 * Convenciones heredadas del Rust:
 *   - Solo se cuentan proyectos con `activo=1` para `estadisticas` / `kpis`
 *     / `trend` / `renacyt.con_proyectos`. Los investigadores con proyectos
 *     inactivos NO se cuentan como "con proyectos".
 *   - `estadisticas` ordena por `cantidad` desc, luego `nombre` asc.
 *   - `trend` agrupa por `(anio, mes)` desde `updated_at` (ms epoch);
 *     descarta proyectos con `updated_at` null/0/inválido; ordena asc.
 *   - `renacyt` agrupa por nivel (case-insensitive asc); `nivel` vacío o
 *     solo whitespace se agrupa como "No registrado".
 */
import {
  InvestigadorProyectosCountDto,
  KpisDashboardDto,
  ProyectosTrendItemDto,
  RenacytDistribucionItemDto,
} from "./dto/dashboard.dto";
import type {
  InvestigadorLiteDoc,
  ParticipacionLiteDoc,
  PersonaLiteDoc,
  ProyectoLiteDoc,
} from "./dashboard.repository";

const NO_REGISTRADO = "No registrado";

/**
 * Resuelve el nivel RENACYT de un investigador (port 1:1 de
 * `shared::data_loader::resolve_renacyt_nivel` del backend Rust). Si el
 * campo está ausente, vacío o solo whitespace, devuelve "No registrado".
 *
 * NOTA: este helper es local al módulo dashboard. Si en el futuro otro
 * módulo lo necesita, mover a `shared/`. Por ahora se mantiene aquí por
 * la regla DRY del plan (≥3 sitios).
 */
export function resolveRenacytNivel(investigador: InvestigadorLiteDoc): string {
  const raw = investigador.renacyt_nivel;
  if (raw == null) return NO_REGISTRADO;
  if (raw.trim().length === 0) return NO_REGISTRADO;
  return raw;
}

/**
 * Conteo de proyectos ACTIVOS por investigador, ordenado por `cantidad`
 * desc + `nombre` asc. Replica `get_estadisticas_proyectos_x_investigador`
 * del backend Rust.
 */
export function calcularEstadisticas(
  investigadores: InvestigadorLiteDoc[],
  proyectosMap: Map<string, ProyectoLiteDoc>,
  participaciones: ParticipacionLiteDoc[],
  personasMap: Map<string, PersonaLiteDoc>,
): InvestigadorProyectosCountDto[] {
  const contador = new Map<string, number>();
  for (const inv of investigadores) {
    contador.set(inv.id_investigador, 0);
  }
  for (const p of participaciones) {
    const proyecto = proyectosMap.get(p.id_proyecto);
    if (!proyecto) continue;
    const current = contador.get(p.id_investigador);
    if (current === undefined) continue;
    contador.set(p.id_investigador, current + 1);
  }

  const stats: InvestigadorProyectosCountDto[] = investigadores.map((inv) => {
    const persona = personasMap.get(inv.id_persona);
    const nombre = persona?.nombre_completo ?? "";
    return {
      nombre,
      cantidad: contador.get(inv.id_investigador) ?? 0,
    };
  });

  stats.sort((a, b) => {
    if (a.cantidad !== b.cantidad) return b.cantidad - a.cantidad;
    return a.nombre.localeCompare(b.nombre);
  });

  return stats;
}

/**
 * Calcula los KPIs del dashboard a partir de los conteos crudos y el
 * detalle de estadísticas. Replica `get_kpis_dashboard` del backend Rust.
 *
 * - `total_proyectos` = proyectos ACTIVOS en la BD
 * - `total_investigadores` = total de investigadores (sin filtro `activo`,
 *   replica comportamiento Rust)
 * - `investigadores_con_1_proyecto` = investigadores cuyo conteo es == 1
 * - `investigadores_multiples_proyectos` = investigadores cuyo conteo es > 1
 */
export function calcularKpis(
  totalProyectos: number,
  totalInvestigadores: number,
  stats: InvestigadorProyectosCountDto[],
): KpisDashboardDto {
  let con1 = 0;
  let multiples = 0;
  for (const item of stats) {
    if (item.cantidad === 1) con1 += 1;
    else if (item.cantidad > 1) multiples += 1;
  }
  return {
    total_proyectos: totalProyectos,
    total_investigadores: totalInvestigadores,
    investigadores_con_1_proyecto: con1,
    investigadores_multiples_proyectos: multiples,
  };
}

/**
 * Agrupa proyectos ACTIVOS por `(anio, mes)` desde `updated_at` (ms epoch).
 * Descarta proyectos con `updated_at` null/0/NaN o fecha no parseable.
 * Ordena ascendente por (anio, mes). Replica `get_proyectos_trend` del
 * backend Rust.
 */
export function calcularTrend(
  proyectosActivos: ProyectoLiteDoc[],
): ProyectosTrendItemDto[] {
  const bucket = new Map<string, number>();
  for (const p of proyectosActivos) {
    const anio = yearFromMillis(p.updated_at);
    if (anio === null) continue;
    const mes = monthFromMillis(p.updated_at);
    if (mes === null) continue;
    const key = `${anio}:${mes}`;
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  const items: ProyectosTrendItemDto[] = [];
  for (const [key, cantidad] of bucket) {
    const [anioStr, mesStr] = key.split(":");
    items.push({
      anio: Number(anioStr),
      mes: Number(mesStr),
      cantidad,
    });
  }
  items.sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mes - b.mes;
  });
  return items;
}

/**
 * Agrupa investigadores por nivel RENACYT, contando cuantos tienen al
 * menos un proyecto ACTIVO (`con_proyectos`) vs cuantos no (`sin_proyectos`).
 * Ordena por nivel ascendente case-insensitive (replica comportamiento
 * Rust). Replica `get_renacyt_distribucion` del backend Rust.
 */
export function calcularRenacytDistribucion(
  investigadores: InvestigadorLiteDoc[],
  proyectosMap: Map<string, ProyectoLiteDoc>,
  participaciones: ParticipacionLiteDoc[],
): RenacytDistribucionItemDto[] {
  const investigadoresConProyectos = new Set<string>();
  for (const p of participaciones) {
    const proyecto = proyectosMap.get(p.id_proyecto);
    if (!proyecto) continue;
    investigadoresConProyectos.add(p.id_investigador);
  }

  const grupos = new Map<string, RenacytDistribucionItemDto>();
  for (const inv of investigadores) {
    const nivel = resolveRenacytNivel(inv);
    const key = nivel.toLowerCase();
    let entry = grupos.get(key);
    if (!entry) {
      entry = {
        nivel,
        cantidad_investigadores: 0,
        con_proyectos: 0,
        sin_proyectos: 0,
      };
      grupos.set(key, entry);
    }
    entry.cantidad_investigadores += 1;
    if (investigadoresConProyectos.has(inv.id_investigador)) {
      entry.con_proyectos += 1;
    } else {
      entry.sin_proyectos += 1;
    }
  }

  const items: RenacytDistribucionItemDto[] = Array.from(grupos.values());
  items.sort((a, b) => a.nivel.toLowerCase().localeCompare(b.nivel.toLowerCase()));
  return items;
}

// ============================================================
// Helpers internos
// ============================================================

function yearFromMillis(millis: number | null | undefined): number | null {
  if (millis == null || millis === 0 || !Number.isFinite(millis)) return null;
  const d = new Date(millis);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

function monthFromMillis(millis: number | null | undefined): number | null {
  if (millis == null || millis === 0 || !Number.isFinite(millis)) return null;
  const d = new Date(millis);
  if (Number.isNaN(d.getTime())) return null;
  // getUTCMonth es 0-based; replicamos contrato del Rust `chrono::Datelike`
  // (1-based) sumando 1.
  return d.getUTCMonth() + 1;
}
