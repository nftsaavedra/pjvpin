import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface GradoDoc {
  id_grado: string;
  nombre: string;
  descripcion?: string;
  nivel?: string;
  activo: number;
}

@Injectable()
export class GradosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<GradoDoc> {
    return this.db.collection<GradoDoc>("grados");
  }

  async listAll(): Promise<GradoDoc[]> {
    return this.col.find({}).sort({ nombre: 1 }).toArray();
  }

  async listPaginated(page: number, limit: number): Promise<{ items: GradoDoc[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;
    const [items, total] = await Promise.all([
      this.col.find({}).skip(skip).limit(safeLimit).toArray(),
      this.col.countDocuments({}),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<GradoDoc | null> {
    return this.col.findOne({ id_grado: id });
  }

  async findByNombre(nombre: string): Promise<GradoDoc | null> {
    return this.col.findOne({ nombre });
  }

  async insert(doc: GradoDoc): Promise<void> {
    await this.col.insertOne(doc as unknown as Parameters<typeof this.col.insertOne>[0]);
  }

  async updateById(id: string, set: Partial<GradoDoc>): Promise<void> {
    await this.col.updateOne({ id_grado: id }, { $set: set });
  }

  async setActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.col.updateOne({ id_grado: id }, { $set: { activo } });
  }

  async countReferencias(id: string): Promise<number> {
    return this.db.collection("investigadores").countDocuments({ id_grado: id });
  }
}
