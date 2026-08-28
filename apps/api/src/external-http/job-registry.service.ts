/**
 * Registro in-memory de jobs asincronos. Acepta el patron `202 + jobId`
 * del spec §1 sin requerir infraestructura externa (Redis/BullMQ/etc.).
 *
 * **Limitaciones v1 single-instance**: el estado se pierde al reiniciar
 * el proceso. Para multi-replica migrar a Redis antes de escalar Dokploy.
 */

import { Injectable } from "@nestjs/common";

export type JobEstado = "enqueued" | "running" | "completed" | "failed";

export interface JobSnapshot<T = unknown> {
  jobId: string;
  estado: JobEstado;
  progreso: number;
  fechaInicio: number;
  fechaFin: number | null;
  totalUnidades: number;
  unidadesProcesadas: number;
  resultado: T | null;
  error: string | null;
}

@Injectable()
export class JobRegistry {
  private readonly jobs = new Map<string, JobSnapshot>();

  crear<T>(jobId: string, totalUnidades: number): JobSnapshot<T> {
    const snapshot: JobSnapshot<T> = {
      jobId,
      estado: "enqueued",
      progreso: 0,
      fechaInicio: Date.now(),
      fechaFin: null,
      totalUnidades,
      unidadesProcesadas: 0,
      resultado: null,
      error: null,
    };
    this.jobs.set(jobId, snapshot as unknown as JobSnapshot);
    return snapshot;
  }

  enEjecucion(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "running";
  }

  incrementar(jobId: string, cantidad = 1): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.unidadesProcesadas += cantidad;
    job.progreso =
      job.totalUnidades > 0 ? Math.min(1, job.unidadesProcesadas / job.totalUnidades) : 0;
  }

  completar<T>(jobId: string, resultado: T): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "completed";
    job.progreso = 1;
    job.fechaFin = Date.now();
    job.resultado = resultado as unknown as JobSnapshot["resultado"];
  }

  fallar(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.estado = "failed";
    job.fechaFin = Date.now();
    job.error = error;
  }

  obtener(jobId: string): JobSnapshot | undefined {
    return this.jobs.get(jobId);
  }
}
