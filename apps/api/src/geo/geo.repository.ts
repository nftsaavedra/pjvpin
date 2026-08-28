import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface UbigeoDoc {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  nombre: string;
  ubigeo_inei?: string;
}

export interface UbigeoDto {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  nombre: string;
}

@Injectable()
export class GeoRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<UbigeoDoc> {
    return this.db.collection<UbigeoDoc>("ubigeos");
  }

  async listAll(): Promise<UbigeoDoc[]> {
    return this.col.find({}).sort({ departamento: 1, provincia: 1, distrito: 1 }).toArray();
  }

  async listByDepartamento(departamento: string): Promise<UbigeoDoc[]> {
    return this.col.find({ departamento }).sort({ provincia: 1, distrito: 1 }).toArray();
  }

  async search(prefix: string): Promise<UbigeoDoc[]> {
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    return this.col.find({ nombre: re }).limit(50).toArray();
  }
}
