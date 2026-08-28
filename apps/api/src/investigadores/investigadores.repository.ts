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
  renacyt_id_investigador: string | null;
  renacyt_nivel: string | null;
  renacyt_grupo: string | null;
  renacyt_condicion: string | null;
  renacyt_fecha_informe_calificacion: number | null;
  renacyt_fecha_registro: number | null;
  renacyt_fecha_ultima_revision: number | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
  renacyt_fecha_ultima_sincronizacion: number | null;
  renacyt_ficha_url: string | null;
  renacyt_formaciones_academicas_json: string | null;
  renacyt_cambios_revisados_en: number | null;
  grupo_investigacion_id: string | null;
  orcid: string | null;
  correo_institucional: string | null;
  estado_renacyt: string | null;
  pure_person_id: string | null;
  perucris_uuid: string | null;
  activo: number;
  cambios_renacyt_revisados: number;
}

export type KardexDisparadorDoc = "refresh_individual" | "refresh_masivo" | "importacion_lote";

export interface CambioKardexDoc {
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

export interface FormacionResumenDoc {
  centro: string | null;
  grado: string | null;
  titulo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  puntaje: string | null;
  considerado_para_cc: boolean | null;
  es_calificado: boolean | null;
}

export interface FormacionesDiffDoc {
  agregadas: FormacionResumenDoc[];
  retiradas: FormacionResumenDoc[];
  sin_detalle: boolean;
}

export interface KardexDoc {
  id_kardex: string;
  id_investigador: string;
  id_persona: string;
  fecha_evento: number;
  disparador: KardexDisparadorDoc;
  cambios: CambioKardexDoc[];
  formaciones_diff: FormacionesDiffDoc | null;
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

  async listAllDnisRenacyt(): Promise<Array<{ id_investigador: string; dni: string }>> {
    const docs = await this.inv
      .find(
        { renacyt_codigo_registro: { $ne: null } },
        { projection: { id_investigador: 1, dni: 1 } },
      )
      .toArray();
    return docs.map((d) => ({ id_investigador: d.id_investigador, dni: d.dni }));
  }

  async listKardex(idInvestigador: string): Promise<KardexDoc[]> {
    return this.kardex
      .find({ id_investigador: idInvestigador })
      .sort({ fecha_evento: -1 })
      .toArray();
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
