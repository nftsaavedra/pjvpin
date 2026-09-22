import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { JobRegistry } from "../external-http/job-registry.service";
import { AuditService } from "./audit.service";

/**
 * Listener declarativo que escribe la auditoría de los jobs asincronos al
 * completarse exitosamente. El servicio registra un `JobAuditDescriptor` en
 * `JobRegistry.crear(...)`; este listener lo consume en `job.completed` y
 * delega a `AuditService`. Los jobs fallidos no se auditan (mismo criterio
 * que el código actual, que solo escribe auditoría tras éxito).
 */
@Injectable()
export class AuditJobListener {
  private readonly logger = new Logger(AuditJobListener.name);

  constructor(
    private readonly jobs: JobRegistry,
    private readonly audit: AuditService,
  ) {}

  @OnEvent("job.completed")
  async handleJobCompleted(payload: { jobId: string }): Promise<void> {
    const snapshot = this.jobs.obtener(payload.jobId);
    if (!snapshot?.audit) return;
    const { actor, action, targetType, targetId, details } = snapshot.audit;
    try {
      await this.audit.writeGenericAudit(
        { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
        action,
        targetType,
        targetId,
        details,
      );
    } catch (err) {
      this.logger.error(
        `Fallo al escribir auditoría del job ${payload.jobId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
