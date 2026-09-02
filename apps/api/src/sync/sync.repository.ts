/**
 * Repositorio del modulo `sync` - `GET /sync/reportes`.
 *
 * Lee la coleccion `sync_reportes` (poblada por `pure.service.ts` con tipo
 * `pure_diff` y por `perucris.service.ts` con tipo `perucris_validacion`).
 *
 * Indice esperado (replicado del backend Rust):
 *   `{ tipo: 1, ejecutado_at: -1 }` (compuesto) - historial por subsistema
 *   con los mas recientes primero.
 *
 * Sort aplicado en la query: `ejecutado_at` desc (replica `list_recent`).
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import type { SyncReportDocument } from "./dto/sync-report.dto";

@Injectable()
export class SyncRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get collection(): Collection<SyncReportDocument> {
    return this.db.collection<SyncReportDocument>("sync_reportes");
  }

  /**
   * Lista los reportes mas recientes, opcionalmente filtrados por tipo.
   * Port de `sync_reportes::list_recent`.
   */
  async listRecent(
    tipo: string | null,
    limit: number,
  ): Promise<SyncReportDocument[]> {
    const filter: Record<string, unknown> =
      tipo == null ? {} : { tipo };
    return this.collection
      .find(filter)
      .sort({ ejecutado_at: -1 })
      .limit(limit)
      .toArray();
  }
}
