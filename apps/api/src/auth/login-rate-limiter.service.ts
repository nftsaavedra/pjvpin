import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

interface Bucket {
  intentos: number;
  ventanaInicioMs: number;
}

/**
 * Limiter por username con semantica equivalente al `LoginRateLimiter`
 * del backend Rust legacy (`shared/state.rs`). 5 intentos por username
 * en una ventana de 15 min; `clear()` se invoca en login exitoso.
 * Mantenido en memoria por proceso: la migracion a Redis sera necesaria
 * para Dokploy multi-replica (misma deuda que `JobRegistry`).
 */
@Injectable()
export class LoginRateLimiterService {
  private readonly buckets = new Map<string, Bucket>();

  checkAndRecord(username: string): void {
    const normalized = username.trim().toLowerCase();
    const now = Date.now();
    const existing = this.buckets.get(normalized);
    if (!existing || now - existing.ventanaInicioMs >= VENTANA_MS) {
      this.buckets.set(normalized, { intentos: 1, ventanaInicioMs: now });
      return;
    }
    if (existing.intentos >= MAX_INTENTOS) {
      const segundosRestantes = Math.max(
        1,
        Math.ceil((VENTANA_MS - (now - existing.ventanaInicioMs)) / 1000),
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Demasiados intentos fallidos. Intente nuevamente en ${segundosRestantes} segundos.`,
          error: "TooManyRequests",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    existing.intentos += 1;
  }

  clear(username: string): void {
    this.buckets.delete(username.trim().toLowerCase());
  }
}
