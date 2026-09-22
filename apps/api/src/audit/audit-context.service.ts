import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

export interface AuditBuffer {
  targetId?: string;
  detailsJson?: string;
}

/**
 * Carrier declarativo de auditoría mediante AsyncLocalStorage (node:async_hooks).
 *
 * Permite que un servicio contribuya `targetId`/`details` calculados internamente
 * sin invocar AuditService directamente. El AuditInterceptor envuelve la
 * ejecución del handler en `als.run()`; cualquier `set*` dentro del handler
 * (incluidos los `await` intermedios) queda accesible al resolver del interceptor.
 */
@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditBuffer>();

  run<T>(buffer: AuditBuffer, fn: () => T): T {
    return this.storage.run(buffer, fn);
  }

  get(): AuditBuffer | undefined {
    return this.storage.getStore();
  }

  setTargetId(id: string): void {
    const buffer = this.storage.getStore();
    if (buffer) buffer.targetId = id;
  }

  setDetails(json: string): void {
    const buffer = this.storage.getStore();
    if (buffer) buffer.detailsJson = json;
  }
}
