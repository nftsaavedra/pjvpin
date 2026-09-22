/**
 * Registro in-memory de jobs asincronos. Acepta el patron `202 + jobId`
 * del spec §1 sin requerir infraestructura externa (Redis/BullMQ/etc.).
 *
 * Emite eventos via `EventEmitter2` para que el `JobEventsGateway`
 * notifique a los clientes WebSocket conectados.
 *
 * Cada job puede llevar un `JobAuditDescriptor` declarativo: el
 * `AuditJobListener` del módulo de auditoría lo consume en
 * `job.completed` para registrar la auditoría sin que el servicio
 * invoque `AuditService` directamente.
 *
 * **Limitaciones v1 single-instance**: el estado se pierde al reiniciar
 * el proceso. Para multi-replica migrar a Redis antes de escalar Dokploy.
 */

import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export type JobEstado = "enqueued" | "running" | "completed" | "failed";

export interface JobAuditDescriptor {
  actor: { id_usuario: string; username: string; rol: string };
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
}

export interface JobSnapshot<T = unknown> {
  jobId: string;
  id_usuario: string;
  estado: JobEstado;
  progreso: number;
  fecha_inicio: number;
  fecha_fin: number | null;
  totalUnidades: number;
  unidadesProcesadas: number;
  resultado: T | null;
  error: string | null;
  audit?: JobAuditDescriptor;
}

@Injectable()
export class JobRegistry {
  private readonly jobs = new Map<string, JobSnapshot>();

  constructor(private readonly events: EventEmitter2) {}

  crear<T>(
    jobId: string,
    totalUnidades: number,
    id_usuario: string,
    audit?: JobAuditDescriptor,
  ): JobSnapshot<T> {
    const snapshot: JobSnapshot<T> = {
      jobId,
      id_usuario,
      estado: "enqueued",
      progreso: 0,
      fecha_inicio: Date.now(),
      fecha_fin: null,
      totalUnidades,
      unidadesProcesadas: 0,
      resultado: null,
      error: null,
      audit,
    };
    this.jobs.set(jobId, snapshot as unknown as JobSnapshot);
    this.emit("job.progress", snapshot);
    return snapshot;
  }

  enEjecucion(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "running";
    this.emit("job.progress", job);
  }

  incrementar(jobId: string, cantidad = 1): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.unidadesProcesadas += cantidad;
    job.progreso =
      job.totalUnidades > 0 ? Math.min(1, job.unidadesProcesadas / job.totalUnidades) : 0;
    this.emit("job.progress", job);
  }

  completar<T>(jobId: string, resultado: T): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "completed";
    job.progreso = 1;
    job.fecha_fin = Date.now();
    job.resultado = resultado as unknown as JobSnapshot["resultado"];
    this.emit("job.completed", job);
  }

  fallar(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "failed";
    job.fecha_fin = Date.now();
    job.error = error;
    this.emit("job.failed", job);
  }

  obtener(jobId: string): JobSnapshot | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Permite al servicio actualizar el `details` del descriptor antes de
   * `completar`, cuando los totales finales solo se conocen tras el
   * `Promise.all` del job.
   */
  setAuditDetails(jobId: string, detailsJson: string): void {
    const job = this.jobs.get(jobId);
    if (!job?.audit) return;
    job.audit = { ...job.audit, details: detailsJson };
  }

  private emit(event: string, job: JobSnapshot): void {
    void this.events.emit(event, {
      jobId: job.jobId,
      id_usuario: job.id_usuario,
      estado: job.estado,
      progreso: job.progreso,
      unidadesProcesadas: job.unidadesProcesadas,
      totalUnidades: job.totalUnidades,
      error: job.error,
    });
  }
}
