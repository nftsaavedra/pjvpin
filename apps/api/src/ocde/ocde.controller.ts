import { Body, Controller, Delete, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { OcdeService } from "./ocde.service";
import { AsignarOcdeRequest, type EntityOcdeFieldDto } from "./dto/ocde.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

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
  async assign(
    @Body() body: AsignarOcdeRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EntityOcdeFieldDto> {
    return this.service.assign(body, actor);
  }

  @Delete("campos")
  @HttpCode(200)
  @RequirePermission(AppPermission.OcdeAssignManage)
  async unassign(
    @Body() body: AsignarOcdeRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ ok: true; removed: boolean }> {
    return this.service.unassign(body, actor);
  }
}
