/**
 * Store en memoria para resultados de validacion contra PeruCRIS.
 *
 * Aislado en archivo `.ts` (sin JSX) para cumplir la regla
 * `react-refresh/only-export-components` de eslint-plugin-react-refresh.
 * El Provider consume esta clase y los hooks la consultan via Context.
 */
import type { PeruCrisValidationItem, ValidationTipo } from "@/shared/tauri/types/perucris.types";

/** Item cacheado con su timestamp de validacion. */
type CachedValidation = {
  item: PeruCrisValidationItem;
  validatedAt: number;
};

/** Opciones del constructor. */
export interface PeruCrisValidationStoreOptions {
  /** TTL por defecto en ms. Default: 5 minutos. */
  ttlMs?: number;
  /** Tamano maximo del cache (entradas). Default: 1000. */
  maxEntries?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

export class PeruCrisValidationStore {
  private cache: Map<string, CachedValidation> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: PeruCrisValidationStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /**
   * Lookup con TTL check. Devuelve `undefined` si:
   *  - No existe el id.
   *  - La entrada expiro (> ttlMs desde validatedAt).
   */
  get(idLocal: string): PeruCrisValidationItem | undefined {
    const cached = this.cache.get(idLocal);
    if (!cached) return undefined;
    const age = Date.now() - cached.validatedAt;
    if (age > this.ttlMs) {
      this.cache.delete(idLocal);
      return undefined;
    }
    return cached.item;
  }

  /** Indica si la entrada esta fresca (dentro del TTL). */
  isValid(idLocal: string): boolean {
    const cached = this.cache.get(idLocal);
    if (!cached) return false;
    return Date.now() - cached.validatedAt <= this.ttlMs;
  }

  /** Indica si la entrada existe (aunque haya expirado). */
  has(idLocal: string): boolean {
    return this.cache.has(idLocal);
  }

  /** Insert o refresh de una entrada individual. */
  set(idLocal: string, item: PeruCrisValidationItem): void {
    this.evictIfNeeded();
    this.cache.set(idLocal, { item, validatedAt: Date.now() });
  }

  /** Insercion batch desde un PeruCrisValidationReport. */
  setAll(items: PeruCrisValidationItem[]): void {
    for (const item of items) {
      this.set(item.idLocal, item);
    }
  }

  /** Invalida una entrada especifica. */
  invalidate(idLocal: string): void {
    this.cache.delete(idLocal);
  }

  /** Invalida todo el cache. */
  invalidateAll(): void {
    this.cache.clear();
  }

  /** Invalida todas las entradas de un tipo especifico. */
  invalidateByType(tipo: ValidationTipo): void {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.item.tipo === tipo) {
        this.cache.delete(key);
      }
    }
  }

  /** Cantidad de entradas en el cache. */
  size(): number {
    return this.cache.size;
  }

  /** Lista de ids actualmente cacheados (vivos, sin expirar). */
  liveIds(): string[] {
    const result: string[] = [];
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.validatedAt <= this.ttlMs) {
        result.push(key);
      }
    }
    return result;
  }

  /** Politica de eviction: si supera maxEntries, eliminar las mas viejas. */
  private evictIfNeeded(): void {
    if (this.cache.size < this.maxEntries) return;
    const sorted = [...this.cache.entries()].sort(([, a], [, b]) => a.validatedAt - b.validatedAt);
    const toEvict = Math.ceil(this.maxEntries * 0.1);
    for (let i = 0; i < toEvict; i++) {
      this.cache.delete(sorted[i][0]);
    }
  }
}
