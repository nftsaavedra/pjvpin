import { Injectable } from "@nestjs/common";
import { AppError } from "../infra/errors/app-error";
import { OcdeRepository, type EntityOcdeFieldDoc } from "./ocde.repository";
import type { AsignarOcdeRequest, EntityOcdeFieldDto } from "./dto/ocde.dto";

@Injectable()
export class OcdeService {
  constructor(private readonly repo: OcdeRepository) {}

  async list(entityType: string, entityId: string): Promise<EntityOcdeFieldDto[]> {
    const docs = await this.repo.listForEntity(entityType, entityId);
    return docs;
  }

  async assign(req: AsignarOcdeRequest): Promise<EntityOcdeFieldDto> {
    const valid = await this.repo.validateOcdeCodigo(req.ocde_codigo);
    if (!valid) throw AppError.notFound("Codigo OCDE no existe en catalogos.");
    const existing = await this.repo.findOne(req.entity_type, req.entity_id, req.ocde_codigo);
    if (existing) throw AppError.unique("Ese campo OCDE ya esta asignado.");
    const doc: EntityOcdeFieldDoc = {
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      ocde_codigo: req.ocde_codigo,
      created_at: new Date().toISOString(),
    };
    await this.repo.insert(doc);
    return doc;
  }

  async unassign(req: AsignarOcdeRequest): Promise<{ ok: true; removed: boolean }> {
    const removed = await this.repo.delete(req.entity_type, req.entity_id, req.ocde_codigo);
    return { ok: true, removed: removed > 0 };
  }
}