import { Body, Controller, Delete, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { OcdeService } from "./ocde.service";
import { AsignarOcdeRequest, type EntityOcdeFieldDto } from "./dto/ocde.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { Audit } from "../audit/audit.decorator";

@Controller("ocde")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OcdeController {
  constructor(private readonly service: OcdeService) {}

  @Get("campos")
  @RequirePermission(AppPermission.VocabulariosRead)
  async list(
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
  ): Promise<EntityOcdeFieldDto[]> {
    return this.service.list(entityType, entityId);
  }

  @Post("campos")
  @RequirePermission(AppPermission.OcdeAssignManage)
  @Audit({
    action: "ocde.assign",
    targetType: "ocde",
    targetId: {
      from: "compose",
      fn: (ctx) => {
        const body = ctx.body as AsignarOcdeRequest | null;
        return body
          ? `${body.entity_type}:${body.entity_id}:${body.ocde_codigo}`
          : "";
      },
    },
  })
  async assign(@Body() body: AsignarOcdeRequest): Promise<EntityOcdeFieldDto> {
    return this.service.assign(body);
  }

  @Delete("campos")
  @HttpCode(200)
  @RequirePermission(AppPermission.OcdeAssignManage)
  @Audit({
    action: "ocde.unassign",
    targetType: "ocde",
    targetId: {
      from: "compose",
      fn: (ctx) => {
        const body = ctx.body as AsignarOcdeRequest | null;
        return body
          ? `${body.entity_type}:${body.entity_id}:${body.ocde_codigo}`
          : "";
      },
    },
  })
  async unassign(@Body() body: AsignarOcdeRequest): Promise<{ ok: true; removed: boolean }> {
    return this.service.unassign(body);
  }
}