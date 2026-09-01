/**
 * Logica pura del dominio `recursos`. Sin acceso a MongoDB ni reloj del sistema:
 * cualquier I/O se inyecta como parametro (`repo`/`usuariosRepo`/`investigadoresRepo`
 * via callbacks) para que los tests unitarios corran sin red ni fixtures.
 *
 * Reglas 1:1 con la implementacion Rust en `apps/desktop/src-tauri/src/recursos/`:
 *  - helper RBAC `requireRecursosManageOrResponsable`: OR entre (a) permiso
 *    RecursosManage (rol del actor) y (b) rol responsable_proyecto + es
 *    responsable del proyecto. **D2**: bypass Rust cuando `proyectoId=null` fue
 *    CERRADO en NestJS — sin proyectoId verificable, responsable_proyecto → 403.
 *  - validacion de tipos de patente, holder exactly-one, orden >= 1, fechas
 *    coherentes del financiamiento, moneda ISO 4217.
 *
 * Ver `docs/backend/07-inventario-rust-bloque-e.md` §2.2-2.3 y §5 D2/D6.
 */

import { AppError } from "../infra/errors/app-error";
import { roleHasPermission } from "../rbac/role-matrix";
import { AppPermission } from "../rbac/permissions.enum";
import {
  ROL_RECURSOS_RESPONSABLE,
  esPatenteTipoValido,
  esTitularHolderTypeValido,
} from "./vocab";

const ISO_4217_REGEX = /^[A-Z]{3}$/;

/** Normaliza moneda: trim + uppercase + valida ISO 4217 (3 letras ASCII). */
export function validarMonedaODefault(moneda: string | null | undefined): string {
  if (moneda == null || moneda.trim().length === 0) return "PEN";
  const up = moneda.trim().toUpperCase();
  if (!ISO_4217_REGEX.test(up)) {
    throw new Error("La moneda debe cumplir ISO 4217 (3 letras ASCII uppercase).");
  }
  return up;
}

/** Valida monto finito y >= 0. Devuelve null si no viene. */
export function validarMontoFinito(monto: number | undefined | null): number | null {
  if (monto === undefined || monto === null) return null;
  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error("El monto debe ser un numero finito >= 0.");
  }
  return monto;
}

/** Valida tipo de patente ∈ {invencion, modelo_utilidad, diseno_industrial}. */
export function validarPatenteTipo(tipo: string | null | undefined): string | null {
  if (tipo == null || tipo.trim().length === 0) return null;
  const t = tipo.trim();
  if (!esPatenteTipoValido(t)) {
    throw new Error(
      `Tipo de patente invalido: ${t}. Valores validos: invencion, modelo_utilidad, diseno_industrial.`,
    );
  }
  return t;
}

/** Fechas en epoch ms. `fechaFin >= fechaInicio` si ambas presentes. */
export function validarFechasFinanciamiento(
  fechaInicio: number | null | undefined,
  fechaFin: number | null | undefined,
): void {
  if (
    fechaInicio != null &&
    fechaFin != null &&
    Number.isFinite(fechaInicio) &&
    Number.isFinite(fechaFin) &&
    fechaFin < fechaInicio
  ) {
    throw new Error("La fecha de fin debe ser >= fecha de inicio.");
  }
}

/** Holder exactly-one: o `idOrgUnit`, o `idPersona`, pero no ambos ni ninguno. */
export function validarTitularHolderExactlyOne(
  holderType: string,
  idOrgUnit: string | null | undefined,
  idPersona: string | null | undefined,
): void {
  if (!esTitularHolderTypeValido(holderType)) {
    throw new Error(`Holder type invalido: ${holderType}.`);
  }
  const hasOrg = !!(idOrgUnit && idOrgUnit.trim().length > 0);
  const hasPer = !!(idPersona && idPersona.trim().length > 0);
  if (hasOrg && hasPer) {
    throw new Error("El titular debe tener exactamente un identificador (org_unit o persona), no ambos.");
  }
  if (!hasOrg && !hasPer) {
    throw new Error("El titular debe tener exactamente un identificador (org_unit o persona).");
  }
  if (holderType === "ORG_UNIT" && !hasOrg) {
    throw new Error("Holder type ORG_UNIT requiere id_org_unit.");
  }
  if (holderType === "PERSON" && !hasPer) {
    throw new Error("Holder type PERSON requiere id_persona.");
  }
}

/** Orden de pivots (inventor / titular) >= 1. */
export function validarOrdenPivot(orden: number | null | undefined): number {
  if (orden == null || !Number.isInteger(orden) || orden < 1) {
    throw new Error("El orden del pivote debe ser un entero >= 1.");
  }
  return orden;
}

/** self-ref de financiamiento.parent_id != self (mismo id). */
export function validarFinanciamientoNoSelfParent(
  idFinanciamiento: string | null,
  parentId: string | null | undefined,
): void {
  if (parentId == null) return;
  const p = parentId.trim();
  if (p.length === 0) return;
  if (idFinanciamiento != null && p === idFinanciamiento) {
    throw new Error("Un financiamiento no puede ser su propio padre.");
  }
}

// ============================================================
// Helper RBAC: requireRecursosManageOrResponsable
// ============================================================

export interface RecursosRbacActor {
  id_usuario: string;
  rol: string;
}

/**
 * Dependencias inyectables para que el helper sea puro y testeable sin Mongo.
 * - `esResponsableDelProyecto(investigadorId, proyectoId)`: cuenta
 *   participaciones con es_responsable=true (1 si > 0, 0 si no).
 * - `resolverInvestigadorIdDelActor(actor)`: usuario.dni → investigadoresRepo.
 *   Devuelve null si el usuario no tiene investigador asociado.
 */
export interface RecursosRbacDeps {
  esResponsableDelProyecto(
    idInvestigador: string,
    idProyecto: string,
  ): Promise<boolean>;
  resolverInvestigadorIdDelActor(
    actor: RecursosRbacActor,
  ): Promise<string | null>;
}

/**
 * Regla del helper (doc 07 §2.1 + D2):
 *  1. Si el actor tiene permiso RecursosManage (superuser/admin/operador) → OK.
 *  2. Si el actor es responsable_proyecto + `proyectoId` es un string no vacio
 *     + el actor es responsable del proyecto → OK.
 *  3. Cualquier otro caso → AppError.forbidden (403).
 *
 * **D2 (bypass Rust CERRADO)**: responsable_proyecto sin `proyectoId` verificable
 * NUNCA tiene acceso. Antes de llamar al service que origina esta validacion
 * (create/update), el proyecto_id debe venir en el body o path param.
 */
export async function requireRecursosManageOrResponsable(
  actor: RecursosRbacActor,
  proyectoId: string | null | undefined,
  deps: RecursosRbacDeps,
): Promise<void> {
  if (roleHasPermission(actor.rol, AppPermission.RecursosManage)) {
    return;
  }
  if (actor.rol !== ROL_RECURSOS_RESPONSABLE) {
    throw AppError.internal("No tiene permisos para realizar esta operacion sobre recursos.");
  }
  const proyectoIdTrim =
    typeof proyectoId === "string" && proyectoId.trim().length > 0
      ? proyectoId.trim()
      : null;
  if (proyectoIdTrim === null) {
    throw AppError.internal(
      "Responsable de proyecto requiere un proyectoId verificable para crear/editar recursos.",
    );
  }
  const investigadorId = await deps.resolverInvestigadorIdDelActor(actor);
  if (investigadorId === null) {
    throw AppError.internal(
      "Usuario responsable_proyecto no tiene un investigador asociado.",
    );
  }
  const esResp = await deps.esResponsableDelProyecto(investigadorId, proyectoIdTrim);
  if (!esResp) {
    throw AppError.internal(
      "No es responsable del proyecto indicado para crear/editar recursos.",
    );
  }
}

/**
 * Variante para operaciones de pivots (inventores/titulares). La patente ya
 * existe y de su `proyecto_id` se obtiene el proyecto a verificar. Si la
 * patente no tiene proyecto, el responsable_proyecto no puede manipular
 * pivots (D2 aplicado: requiere proyecto verificable).
 */
export async function requireRecursosManageOrResponsableForPatente(
  actor: RecursosRbacActor,
  proyectoIdDePatente: string | null | undefined,
  deps: RecursosRbacDeps,
): Promise<void> {
  if (roleHasPermission(actor.rol, AppPermission.RecursosManage)) {
    return;
  }
  if (actor.rol !== ROL_RECURSOS_RESPONSABLE) {
    throw AppError.internal("No tiene permisos para realizar esta operacion sobre pivotes de patentes.");
  }
  const proyectoIdTrim =
    typeof proyectoIdDePatente === "string" && proyectoIdDePatente.trim().length > 0
      ? proyectoIdDePatente.trim()
      : null;
  if (proyectoIdTrim === null) {
    throw AppError.internal(
      "Responsable de proyecto requiere una patente vinculada a un proyecto para manipular pivotes.",
    );
  }
  const investigadorId = await deps.resolverInvestigadorIdDelActor(actor);
  if (investigadorId === null) {
    throw AppError.internal("Usuario responsable_proyecto no tiene un investigador asociado.");
  }
  const esResp = await deps.esResponsableDelProyecto(investigadorId, proyectoIdTrim);
  if (!esResp) {
    throw AppError.internal(
      "No es responsable del proyecto vinculado a la patente para manipular pivotes.",
    );
  }
}
