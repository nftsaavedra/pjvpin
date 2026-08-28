import { Inject, Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AUDIT_LOG_DEFAULT_PATH } from "../config/defaults";

export interface AuditEntry {
  timestamp: string;
  actor_user_id: string;
  actor_username: string;
  actor_role: string;
  action: string;
  target_user_id: string;
  target_username: string;
  target_role: string;
  details?: string;
}

export interface AuditGenericEntry {
  timestamp: string;
  actor_user_id: string;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: string;
}

interface ActorRef {
  id_usuario: string;
  username: string;
  rol: string;
}

interface UserTargetRef extends ActorRef {}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject("AUDIT_LOG_PATH") private readonly filePath: string) {}

  async writeUserAudit(
    actor: ActorRef,
    action: string,
    target: UserTargetRef,
    details?: string,
  ): Promise<void> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      actor_user_id: actor.id_usuario,
      actor_username: actor.username,
      actor_role: actor.rol,
      action,
      target_user_id: target.id_usuario,
      target_username: target.username,
      target_role: target.rol,
      details,
    };
    await this.append(entry);
  }

  async writeGenericAudit(
    actor: ActorRef,
    action: string,
    targetType: string,
    targetId: string,
    details?: string,
  ): Promise<void> {
    const entry: AuditGenericEntry = {
      timestamp: new Date().toISOString(),
      actor_user_id: actor.id_usuario,
      actor_username: actor.username,
      actor_role: actor.rol,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    };
    await this.append(entry);
  }

  private async append(entry: AuditEntry | AuditGenericEntry): Promise<void> {
    const logPath = this.resolvePath();
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (err) {
      this.logger.error(
        `Fallo al escribir auditoria: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private resolvePath(): string {
    if (path.isAbsolute(this.filePath)) return this.filePath;
    return path.resolve(process.cwd(), this.filePath ?? AUDIT_LOG_DEFAULT_PATH);
  }
}
