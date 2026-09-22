import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { PureService } from "./pure.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { Audit } from "../audit/audit.decorator";
import { AppError } from "../infra/errors/app-error";
import type { SyncReportDto } from "./pure.service";

interface VerificarDiferenciasRequest {
  id_investigador?: string;
}

@Controller("pure")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PureController {
  constructor(private readonly service: PureService) {}

  @Post("person-ids/sync")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "pure.sync.person_ids",
    targetType: "investigadores",
    targetId: { from: "literal", value: "lote" },
    details: {
      from: "response",
      pick: (response) => {
        const r = response as { fetched: number; matched: number; unmatched: number } | null;
        return r ? { fetched: r.fetched, matched: r.matched, unmatched: r.unmatched } : undefined;
      },
    },
  })
  async sincronizarPersonIds(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.sincronizarPersonIds(actor);
  }

  @Post("verificar-diferencias")
  @RequirePermission(AppPermission.InvestigadoresView)
  @Audit({
    action: "pure.diff",
    targetType: "investigador",
    details: { from: "context" },
  })
  async verificarDiferencias(
    @Body() body: VerificarDiferenciasRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SyncReportDto> {
    const id = body.id_investigador?.trim();
    if (!id) {
      throw AppError.validation("Debe indicar id_investigador en el body.");
    }
    return this.service.verificarDiferencias(id, actor);
  }
}

@Controller("investigadores")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvestigadoresPureController {
  constructor(private readonly service: PureService) {}

  @Post(":id/pure/sync")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "pure.sync.publicaciones",
    targetType: "investigador",
    details: {
      from: "response",
      pick: (response) => {
        const r = response as { fetched: number; upserted: number; skipped: number } | null;
        return r
          ? { fetched: r.fetched, upserted: r.upserted, skipped: r.skipped }
          : undefined;
      },
    },
  })
  async syncPublicaciones(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.syncPublicaciones(id, actor);
  }
}