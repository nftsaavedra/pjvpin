import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { OcdeRepository, type EntityOcdeFieldDoc } from "./ocde.repository";
import type { AsignarOcdeRequest, EntityOcdeFieldDto } from "./dto/ocde.dto";

@Injectable()
export class OcdeService {
  constructor(
    private readonly repo: OcdeRepository,
    private readonly audit: AuditService,
  ) {}

  async list(entityType: string, entityId: string): Promise<EntityOcdeFieldDto[]> {
    const docs = await this.repo.listForEntity(entityType, entityId);
    return docs;
  }

  async assign(req: AsignarOcdeRequest, actor: AuthenticatedUser): Promise<EntityOcdeFieldDto> {
    const valid = await this.repo.validateOcdeCodigo(req.ocde_codigo);
    if (!valid) throw AppError.internal("Codigo OCDE no existe en catalogos.");
    const existing = await this.repo.findOne(req.entity_type, req.entity_id, req.ocde_codigo);
    if (existing) throw AppError.internal("Ese campo OCDE ya esta asignado.");
    const doc: EntityOcdeFieldDoc = {
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      ocde_codigo: req.ocde_codigo,
      created_at: new Date().toISOString(),
    };
    await this.repo.insert(doc);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "ocde.assign",
      "ocde",
      `${req.entity_type}:${req.entity_id}:${req.ocde_codigo}`,
    );
    return doc;
  }

  async unassign(
    req: AsignarOcdeRequest,
    actor: AuthenticatedUser,
  ): Promise<{ ok: true; removed: boolean }> {
    const removed = await this.repo.delete(req.entity_type, req.entity_id, req.ocde_codigo);
    if (removed > 0) {
      await this.audit.writeGenericAudit(
        { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
        "ocde.unassign",
        "ocde",
        `${req.entity_type}:${req.entity_id}:${req.ocde_codigo}`,
      );
    }
    return { ok: true, removed: removed > 0 };
  }
}
