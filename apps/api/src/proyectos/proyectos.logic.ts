/**
 * Logica pura del dominio `proyectos`. Sin acceso a MongoDB ni reloj del
 * sistema: cualquier I/O se inyecta como parametro (clock, random) o se
 * resuelve en el repositorio. Asi los tests unitarios (logic.spec.ts) corren
 * sin red ni fixtures.
 *
 * Reglas 1:1 con la implementacion Rust en `apps/desktop/src-tauri/src/proyectos`:
 *  - validarParticipantesPreparados: misma semantica que `validate()` +
 *    `validate_responsable` (dto.rs L191-207 / L52-83).
 *  - generarCodigoAutogenerado: sustituye al codigo obligatorio que el
 *    backend Rust rechaza siempre por un bug pre-existente (ver
 *    `docs/backend/07-inventario-rust-bloque-e.md` D1).
 */

import {
  AUTOGEN_HEX_LENGTH,
  DEFAULT_MONEDA,
  MAX_CODIGO_LENGTH,
  MAX_ROL_LENGTH,
  ORG_ROLES_VALIDOS,
  PROYECTO_CODIGO_AUTOGEN_PREFIX,
  ROLES_PARTICIPACION_VALIDOS,
  esOrgRolValido,
  esRolParticipacionValido,
  isIso4217,
} from "./vocab";

export interface ParticipantesPreparados {
  ids: string[];
  responsable: string | null;
}

const HEX_CHARS = "0123456789abcdef";

/**
 * Normaliza y valida la lista de investigadores + responsable para create/update.
 * Reglas:
 *   - lista vacia + hay responsable => error
 *   - lista no vacia + sin responsable => error (regla Rust original)
 *   - responsable no presente en la lista => error
 *   - deduplica preservando orden de primera aparicion
 */
export function prepararParticipantes(
  idsInput: readonly string[],
  responsableInput: string | undefined,
  opts: { permitirListaVacia?: boolean } = {},
): ParticipantesPreparados {
  const ids = normalizarYDuplicar(idsInput);
  const responsable = responsableInput?.trim() || null;

  if (ids.length === 0 && responsable !== null) {
    throw new Error(
      "Seleccione al menos un investigador para crear el proyecto.",
    );
  }
  if (ids.length === 0 && !opts.permitirListaVacia) {
    throw new Error(
      "Seleccione al menos un investigador para crear el proyecto.",
    );
  }
  if (ids.length > 0 && responsable === null) {
    throw new Error(
      "Seleccione un investigador responsable para el proyecto.",
    );
  }
  if (responsable !== null && !ids.includes(responsable)) {
    throw new Error(
      "El investigador responsable debe estar entre los participantes del proyecto.",
    );
  }
  return { ids, responsable };
}

function normalizarYDuplicar(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Genera un codigo legible unico del estilo `PROJ-2026-7a3c9f`. La entropia
 * del sufijo (24 bits por AUTOGEN_HEX_LENGTH=6) es suficiente en la practica
 * y el UNIQUE index de MongoDB sobre `proyectos.codigo` cubre la colision
 * residual. En E11000 el llamador (service) regenera y reintenta hasta 3.
 *
 * `rand` se inyecta para testabilidad deterministica; en produccion usar
 * `Math.random` por defecto.
 */
export function generarCodigoAutogenerado(
  year: number,
  rand: () => number = Math.random,
): string {
  let hex = "";
  for (let i = 0; i < AUTOGEN_HEX_LENGTH; i += 1) {
    const idx = Math.floor(rand() * HEX_CHARS.length);
    hex += HEX_CHARS[idx];
  }
  return `${PROYECTO_CODIGO_AUTOGEN_PREFIX}-${year}-${hex}`;
}

/**
 * Normaliza el codigo manual: trim + limite de longitud + string vacio => null.
 * El servicio decide si el null dispara autogeneracion o falla segun el caso.
 */
export function normalizarCodigoManual(codigo: string | null | undefined): string | null {
  if (codigo == null) return null;
  const trimmed = codigo.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_CODIGO_LENGTH) {
    throw new Error(`El codigo no debe exceder ${MAX_CODIGO_LENGTH} caracteres.`);
  }
  return trimmed;
}

/**
 * Resuelve el codigo final para create: si el cliente envia uno manual se usa
 * tal cual; si no, se autogenera con el reloj inyectado.
 */
export function resolverCodigoParaCreate(
  codigoManual: string | null | undefined,
  clock: () => Date = () => new Date(),
  rand: () => number = Math.random,
): string {
  const manual = normalizarCodigoManual(codigoManual);
  if (manual !== null) return manual;
  return generarCodigoAutogenerado(clock().getUTCFullYear(), rand);
}

export function validarRolOrg(rol: string): void {
  if (!esOrgRolValido(rol)) {
    throw new Error(`Rol de organizacion invalido: ${rol}.`);
  }
}

export function validarRolParticipacion(rol: string): void {
  if (!esRolParticipacionValido(rol)) {
    throw new Error(`Rol de participacion invalido: ${rol}.`);
  }
}

export function validarMonedaODefault(moneda: string | null | undefined): string {
  if (moneda == null || moneda.trim().length === 0) return DEFAULT_MONEDA;
  const up = moneda.trim().toUpperCase();
  if (!isIso4217(up)) {
    throw new Error("La moneda debe cumplir ISO 4217 (3 letras ASCII uppercase).");
  }
  return up;
}

export function validarMontoAsignado(monto: number | undefined): number | null {
  if (monto === undefined || monto === null) return null;
  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error("El monto asignado debe ser un numero finito >= 0.");
  }
  return monto;
}

export {
  MAX_CODIGO_LENGTH,
  MAX_ROL_LENGTH,
  ORG_ROLES_VALIDOS,
  ROLES_PARTICIPACION_VALIDOS,
};
