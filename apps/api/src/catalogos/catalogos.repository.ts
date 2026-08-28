import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface CatalogoDoc {
  id: string;
  tipo: string;
  codigo: string;
  codigo_skos?: string;
  nombre: string;
  descripcion?: string;
  editable: number;
  esquema?: string;
  padre_codigo?: string;
  activo?: number;
}

@Injectable()
export class CatalogosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col(): Collection<CatalogoDoc> {
    return this.db.collection<CatalogoDoc>("catalogos");
  }

  async listByTipo(tipo: string, includeInactive = false): Promise<CatalogoDoc[]> {
    const filter: Record<string, unknown> = { tipo };
    if (!includeInactive) filter.activo = 1;
    return this.col.find(filter).toArray();
  }

  async listAllAdminByTipo(tipo: string): Promise<CatalogoDoc[]> {
    return this.col.find({ tipo }).toArray();
  }

  async findById(id: string): Promise<CatalogoDoc | null> {
    return this.col.findOne({ id });
  }

  async findByTipoCodigo(tipo: string, codigo: string): Promise<CatalogoDoc | null> {
    return this.col.findOne({ tipo, codigo, activo: 1 });
  }

  async findByTipoEsquemaCodigo(
    tipo: string,
    esquema: string,
    codigo: string,
  ): Promise<CatalogoDoc | null> {
    return this.col.findOne({ tipo, esquema, codigo_skos: codigo, activo: 1 });
  }

  async insert(doc: CatalogoDoc): Promise<void> {
    await this.col.insertOne({ ...doc, activo: 1 } as unknown as Parameters<
      typeof this.col.insertOne
    >[0]);
  }

  async updateById(id: string, set: Partial<CatalogoDoc>): Promise<void> {
    await this.col.updateOne({ id }, { $set: set });
  }

  async setActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.col.updateOne({ id }, { $set: { activo } });
  }

  async listEsquemasVocabulario(): Promise<string[]> {
    const arr = await this.col.distinct("esquema", {
      esquema: { $exists: true, $ne: null as unknown as string },
    } as Record<string, unknown>);
    return (arr as unknown as string[]).sort();
  }

  async listItemsByEsquema(
    esquema: string,
    padreCodigo: string | undefined,
  ): Promise<CatalogoDoc[]> {
    const filter: Record<string, unknown> = { tipo: "vocabulario", esquema };
    if (padreCodigo) filter.padre_codigo = padreCodigo;
    return this.col.find(filter).sort({ codigo_skos: 1 }).toArray();
  }

  async reimportVocab(esquema: string, items: CatalogoDoc[]): Promise<number> {
    const session = this.db.client.startSession();
    try {
      let count = 0;
      await session.withTransaction(async () => {
        await this.col.deleteMany({ tipo: "vocabulario", esquema } as unknown as object);
        if (items.length > 0) {
          await this.col.insertMany(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items.map((it) => ({ ...it, activo: 1, tipo: "vocabulario" })) as any,
            { ordered: false },
          );
          count = items.length;
        }
      });
      return count;
    } finally {
      await session.endSession();
    }
  }

  async countReferences(id: string, collections: string[]): Promise<number> {
    let total = 0;
    for (const collName of collections) {
      const coll = this.db.collection(collName);
      const totalForColl = await coll.countDocuments({
        $or: [{ id_catalogo: id }, { catalogo_id: id }],
      });
      total += totalForColl;
    }
    return total;
  }
}
