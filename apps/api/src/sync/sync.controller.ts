import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import type { SyncReportDocument } from "./dto/sync-report.dto";
import { SyncService } from "./sync.service";

/**
 * 1 endpoint GET read-only del modulo `sync` (F2b):
 *   - `GET /sync/reportes?tipo=&limit=` lista los reportes de sincronizacion
 *     persistidos en `sync_reportes`, ordenados por `ejecutado_at` desc.
 *
 * Sin logica de negocio: solo delega en `SyncService`. La validacion de
 * `tipo` (400 si desconocido) y el clamp de `limit` viven en el service.
 */
@Controller("sync")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  constructor(private readonly service: SyncService) {}

  @Get("reportes")
  @RequirePermission(AppPermission.InvestigadoresView)
  async listReportes(
    @Query("tipo") tipo?: string,
    @Query("limit") limit?: string,
  ): Promise<SyncReportDocument[]> {
    return this.service.listRecent(tipo, limit);
  }
}
