/**
 * Service del modulo `sync`. Orquesta el repository y aplica la validacion
 * pura (`sync.logic.ts`). Sin auditoria: el endpoint es GET read-only
 * (consistente con los handlers Rust de reportes, que solo auditan
 * `exportar_cerif`).
 */
import { Injectable } from "@nestjs/common";
import type { SyncReportDocument } from "./dto/sync-report.dto";
import { clampLimit, parseTipo } from "./sync.logic";
import { SyncRepository } from "./sync.repository";

@Injectable()
export class SyncService {
  constructor(private readonly repo: SyncRepository) {}

  /**
   * Lista los reportes mas recientes. `tipo` (opcional) filtra por
   * subsistema; `limit` se clampa a [1, 100] con default 10.
   *
   * Lanza `AppError.validation` si `tipo` no es uno de los discriminantes
   * canonicos (`pure_diff` | `perucris_validacion`).
   */
  async listRecent(
    rawTipo: string | null | undefined,
    rawLimit: string | number | null | undefined,
  ): Promise<SyncReportDocument[]> {
    const tipo = parseTipo(rawTipo);
    const limit = clampLimit(rawLimit);
    return this.repo.listRecent(tipo, limit);
  }
}
