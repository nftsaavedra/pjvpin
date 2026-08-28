import { Inject, Injectable } from "@nestjs/common";
import type { Db, Collection } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { AppError } from "../infra/errors/app-error";
import {
  diffRenacyt,
  type CambioKardex,
  type FormacionesDiff,
  type InvestigadorRenacytSnapshot,
  type KardexDisparador,
  type KardexEntry,
  type RenacytLookupLike,
} from "./kardex.logic";

interface KardexDoc {
  id_kardex: string;
  id_investigador: string;
  id_persona: string;
  fecha_evento: number;
  disparador: KardexDisparador;
  cambios: CambioKardex[];
  formaciones_diff: FormacionesDiff | null;
}

interface InvestigadorKardexSnapshotDoc {
  id_investigador: string;
  id_persona: string;
  renacyt_nivel: string | null;
  renacyt_grupo: string | null;
  renacyt_condicion: string | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
  renacyt_fecha_informe_calificacion: number | null;
  renacyt_fecha_ultima_revision: number | null;
  renacyt_formaciones_academicas_json: string | null;
}

function nowMs(): number {
  return Date.now();
}

@Injectable()
export class KardexService {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get kardexCollection(): Collection<KardexDoc> {
    return this.db.collection<KardexDoc>("renacyt_kardex");
  }

  /**
   * Compara el estado actual del investigador contra un lookup RENACYT nuevo
   * y, si hay cambios, persiste una entrada de kardex y devuelve el KardexEntry
   * creado. Retorna `null` si nada cambio.
   */
  async registrarCambioSiAplica(
    idInvestigador: string,
    lookup: RenacytLookupLike,
    disparador: KardexDisparador,
  ): Promise<KardexEntry | null> {
    const snapshot = await this.db
      .collection<InvestigadorKardexSnapshotDoc>("investigadores")
      .findOne({ id_investigador: idInvestigador });
    if (!snapshot) {
      throw AppError.notFound(`Investigador ${idInvestigador} no encontrado.`);
    }
    const investigadorSnapshot: InvestigadorRenacytSnapshot = {
      id_investigador: snapshot.id_investigador,
      persona_id: snapshot.id_persona ?? "",
      renacyt_nivel: snapshot.renacyt_nivel ?? null,
      renacyt_grupo: snapshot.renacyt_grupo ?? null,
      renacyt_condicion: snapshot.renacyt_condicion ?? null,
      renacyt_orcid: snapshot.renacyt_orcid ?? null,
      renacyt_scopus_author_id: snapshot.renacyt_scopus_author_id ?? null,
      renacyt_fecha_informe_calificacion: snapshot.renacyt_fecha_informe_calificacion ?? null,
      renacyt_fecha_ultima_revision: snapshot.renacyt_fecha_ultima_revision ?? null,
      renacyt_formaciones_academicas_json: snapshot.renacyt_formaciones_academicas_json ?? null,
    };
    const entry = diffRenacyt(investigadorSnapshot, lookup, disparador, nowMs());
    if (entry === null) return null;
    const id_kardex = `kardex-${idInvestigador}-${entry.fecha_evento}-${Math.random().toString(36).slice(2, 8)}`;
    const doc: KardexDoc = {
      id_kardex,
      id_investigador: entry.investigador_id,
      id_persona: entry.persona_id,
      fecha_evento: entry.fecha_evento,
      disparador: entry.disparador,
      cambios: entry.cambios,
      formaciones_diff: entry.formaciones_diff,
    };
    await this.kardexCollection.insertOne(
      doc as unknown as Parameters<typeof this.kardexCollection.insertOne>[0],
    );
    return {
      id: id_kardex,
      investigador_id: entry.investigador_id,
      persona_id: entry.persona_id,
      fecha_evento: entry.fecha_evento,
      disparador: entry.disparador,
      cambios: entry.cambios,
      formaciones_diff: entry.formaciones_diff,
    };
  }

  /**
   * Devuelve las entradas del kardex de un investigador ordenadas desc por
   * fecha_evento. Sin paginacion: la timeline raramente supera unos cientos
   * de entradas (RENACYT cambia nivel/grupo unas pocas veces al ano).
   */
  async listarPorInvestigador(idInvestigador: string): Promise<KardexEntry[]> {
    const docs = await this.kardexCollection
      .find({ id_investigador: idInvestigador })
      .sort({ fecha_evento: -1 })
      .toArray();
    return docs.map((d) => ({
      id: d.id_kardex,
      investigador_id: d.id_investigador,
      persona_id: d.id_persona,
      fecha_evento: d.fecha_evento,
      disparador: d.disparador,
      cambios: d.cambios,
      formaciones_diff: d.formaciones_diff,
    }));
  }
}
