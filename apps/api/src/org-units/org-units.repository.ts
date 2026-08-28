import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface OrgUnitDoc {
  id_org_unit: string;
  nombre: string;
  tipo: string;
  ruc: string | null;
  ror_id: string | null;
  ubigeo_codigo: string | null;
  sunedu_licenciamiento: string | null;
  parent_id: string | null;
  descripcion: string | null;
  perucris_uuid: string | null;
  perucris_handle: string | null;
  activo: number;
}

@Injectable()
export class OrgUnitsRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<OrgUnitDoc> {
    return this.db.collection<OrgUnitDoc>("org_units");
  }

  async listAll(): Promise<OrgUnitDoc[]> {
    return this.col.find({}).sort({ nombre: 1 }).toArray();
  }

  async listByParent(parentId: string | undefined): Promise<OrgUnitDoc[]> {
    return this.col
      .find(parentId ? { parent_id: parentId } : { parent_id: null })
      .sort({ nombre: 1 })
      .toArray();
  }

  async findById(id: string): Promise<OrgUnitDoc | null> {
    return this.col.findOne({ id_org_unit: id });
  }

  async findByRuc(ruc: string): Promise<OrgUnitDoc | null> {
    return this.col.findOne({ ruc });
  }

  async insert(doc: OrgUnitDoc): Promise<void> {
    await this.col.insertOne(doc as unknown as Parameters<typeof this.col.insertOne>[0]);
  }

  async updateById(id: string, set: Partial<OrgUnitDoc>): Promise<void> {
    await this.col.updateOne({ id_org_unit: id }, { $set: set });
  }

  async delete(id: string): Promise<void> {
    await this.col.deleteOne({ id_org_unit: id });
  }

  async countChildReferences(parentId: string): Promise<number> {
    return this.col.countDocuments({ parent_id: parentId });
  }

  async hasCycle(parentId: string, childId: string): Promise<boolean> {
    let current: string | null = parentId;
    const seen = new Set<string>([childId]);
    while (current) {
      if (seen.has(current)) return true;
      seen.add(current);
      const parent: OrgUnitDoc | null = await this.col.findOne({ id_org_unit: current });
      current = parent?.parent_id ?? null;
    }
    return false;
  }
}
