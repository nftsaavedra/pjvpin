import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface InvestigadorDoc {
  id_investigador: string;
  dni: string;
  id_persona: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  id_grado: string | null;
  renacyt_codigo_registro: string | null;
  renacyt_orcid: string | null;
  renacyt_nivel: string | null;
  grupo_investigacion_id: string | null;
  orcid: string | null;
  correo_institucional: string | null;
  estado_renacyt: string | null;
  pure_person_id: string | null;
  perucris_uuid: string | null;
  activo: number;
  cambios_renacyt_revisados: number;
}

export interface KardexDoc {
  id_investigador: string;
  fecha_evento: string;
  tipo_evento: string;
  descripcion: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class InvestigadoresRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get inv(): Collection<InvestigadorDoc> {
    return this.db.collection<InvestigadorDoc>("investigadores");
  }

  private get kardex(): Collection<KardexDoc> {
    return this.db.collection<KardexDoc>("renacyt_kardex");
  }

  async listAll(): Promise<InvestigadorDoc[]> {
    return this.inv
      .find({})
      .sort({ apellido_paterno: 1, apellido_materno: 1, nombres: 1 })
      .toArray();
  }

  async listPaginated(
    page: number,
    limit: number,
  ): Promise<{ items: InvestigadorDoc[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;
    const [items, total] = await Promise.all([
      this.inv.find({}).skip(skip).limit(safeLimit).toArray(),
      this.inv.countDocuments({}),
    ]);
    return { items, total };
  }

  async listAllConProyectos(): Promise<InvestigadorDoc[]> {
    return this.inv.find({}).toArray();
  }

  async findById(id: string): Promise<InvestigadorDoc | null> {
    return this.inv.findOne({ id_investigador: id });
  }

  async findByDni(dni: string): Promise<InvestigadorDoc | null> {
    return this.inv.findOne({ dni });
  }

  async insert(doc: InvestigadorDoc): Promise<void> {
    await this.inv.insertOne(doc as unknown as Parameters<typeof this.inv.insertOne>[0]);
  }

  async updateById(id: string, set: Partial<InvestigadorDoc>): Promise<void> {
    await this.inv.updateOne({ id_investigador: id }, { $set: set });
  }

  async setActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.inv.updateOne({ id_investigador: id }, { $set: { activo } });
  }

  async countInvestigadores(): Promise<number> {
    return this.inv.countDocuments({});
  }

  async listKardex(idInvestigador: string): Promise<KardexDoc[]> {
    return this.kardex
      .find({ id_investigador: idInvestigador })
      .sort({ fecha_evento: -1 })
      .toArray();
  }

  async insertKardex(doc: KardexDoc): Promise<void> {
    await this.kardex.insertOne(doc as unknown as Parameters<typeof this.kardex.insertOne>[0]);
  }

  async countProyectosPorInvestigador(id: string): Promise<number> {
    return this.db.collection("participaciones").countDocuments({ id_investigador: id });
  }

  async countPublicacionesPorInvestigador(id: string): Promise<number> {
    return this.db.collection("publicacion_autores").countDocuments({ id_persona: id });
  }

  async countPatentesPorInvestigador(id: string): Promise<number> {
    return this.db.collection("patente_inventores").countDocuments({ id_persona: id });
  }
}
