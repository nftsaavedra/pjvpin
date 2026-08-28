import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface EntityOcdeFieldDoc {
  entity_type: string;
  entity_id: string;
  ocde_codigo: string;
  created_at: string;
}

@Injectable()
export class OcdeRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<EntityOcdeFieldDoc> {
    return this.db.collection<EntityOcdeFieldDoc>("entity_ocde_fields");
  }

  async listForEntity(entityType: string, entityId: string): Promise<EntityOcdeFieldDoc[]> {
    return this.col.find({ entity_type: entityType, entity_id: entityId }).toArray();
  }

  async findOne(
    entityType: string,
    entityId: string,
    ocdeCodigo: string,
  ): Promise<EntityOcdeFieldDoc | null> {
    return this.col.findOne({
      entity_type: entityType,
      entity_id: entityId,
      ocde_codigo: ocdeCodigo,
    });
  }

  async insert(doc: EntityOcdeFieldDoc): Promise<void> {
    await this.col.insertOne(doc as unknown as Parameters<typeof this.col.insertOne>[0]);
  }

  async delete(entityType: string, entityId: string, ocdeCodigo: string): Promise<number> {
    const res = await this.col.deleteOne({
      entity_type: entityType,
      entity_id: entityId,
      ocde_codigo: ocdeCodigo,
    });
    return res.deletedCount ?? 0;
  }

  async validateOcdeCodigo(ocdeCodigo: string): Promise<boolean> {
    const exists = await this.db.collection("catalogos").findOne({
      tipo: "area_conocimiento_ocde",
      codigo: ocdeCodigo,
      activo: 1,
    });
    return exists !== null;
  }
}
