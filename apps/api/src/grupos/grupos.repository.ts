import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface GrupoDoc {
  id_grupo: string;
  nombre: string;
  coordinador_id: string | null;
  descripcion: string | null;
  activo: number;
}

@Injectable()
export class GruposRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<GrupoDoc> {
    return this.db.collection<GrupoDoc>("grupos_investigacion");
  }

  async listAll(): Promise<GrupoDoc[]> {
    return this.col.find({}).sort({ nombre: 1 }).toArray();
  }

  async findById(id: string): Promise<GrupoDoc | null> {
    return this.col.findOne({ id_grupo: id });
  }

  async findByNombre(nombre: string): Promise<GrupoDoc | null> {
    return this.col.findOne({ nombre });
  }

  async insert(doc: GrupoDoc): Promise<void> {
    await this.col.insertOne(doc as unknown as Parameters<typeof this.col.insertOne>[0]);
  }

  async updateById(id: string, set: Partial<GrupoDoc>): Promise<void> {
    await this.col.updateOne({ id_grupo: id }, { $set: set });
  }

  async setActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.col.updateOne({ id_grupo: id }, { $set: { activo } });
  }

  async softDelete(id: string): Promise<void> {
    await this.col.updateOne({ id_grupo: id }, { $set: { activo: 0 } });
  }
}
