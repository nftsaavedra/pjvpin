import { AppError } from "../infra/errors/app-error";

export type AppRole = "superuser" | "admin" | "operador" | "consulta" | "responsable_proyecto";

interface UsuarioForValidation {
  id_usuario: string;
  rol: string;
  activo: number;
}

const SUPERUSER_ROLE = "superuser";

/**
 * Invariantes superuser 1:1 con src-tauri/src/usuarios/validations.rs del backend Rust.
 * Lanza AppError.internal con mensaje user-facing si viola alguna invariante.
 */

export async function ensureSoloUnicoSuperuser(
  countSuperusersFn: () => Promise<number>,
  _nextIdUsuario: string,
  nextRol: string,
): Promise<void> {
  if (nextRol !== SUPERUSER_ROLE) return;
  const existing = await countSuperusersFn();
  if (existing > 0) {
    throw AppError.internal("Ya existe un superusuario. Solo puede haber uno en el sistema.");
  }
}

export async function noDegradarSuperuser(
  findUsuarioFn: (id: string) => Promise<UsuarioForValidation | null>,
  targetId: string,
  nextRol: string,
): Promise<void> {
  if (nextRol !== SUPERUSER_ROLE) {
    const target = await findUsuarioFn(targetId);
    if (target && target.rol === SUPERUSER_ROLE) {
      throw AppError.internal("El unico superusuario no puede ser degradado a otro rol.");
    }
  }
}

export async function noEscalableASuperuser(
  findUsuarioFn: (id: string) => Promise<UsuarioForValidation | null>,
  targetId: string,
  nextRol: string,
): Promise<void> {
  if (nextRol === SUPERUSER_ROLE) {
    const target = await findUsuarioFn(targetId);
    if (target && target.rol !== SUPERUSER_ROLE) {
      throw AppError.internal(
        "No se puede escalar un usuario a superusuario. Solo el bootstrap lo crea.",
      );
    }
  }
}

export async function noDesactivarSuperuser(
  findUsuarioFn: (id: string) => Promise<UsuarioForValidation | null>,
  targetId: string,
  nextActivo: number,
): Promise<void> {
  if (nextActivo === 0) {
    const target = await findUsuarioFn(targetId);
    if (target && target.rol === SUPERUSER_ROLE) {
      throw AppError.internal("El unico superusuario no puede ser desactivado.");
    }
  }
}

export async function noAutoDegradarse(
  actorId: string,
  targetId: string,
  nextRol: string,
): Promise<void> {
  if (actorId === targetId && nextRol !== SUPERUSER_ROLE) {
    throw AppError.internal("Un usuario no puede cambiar su propio rol.");
  }
}
