import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { OrgUnitsService } from "./org-units.service";
import type { CreateOrgUnitRequest, OrgUnitDto, UpdateOrgUnitRequest } from "./dto/org-units.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

@Controller("org-units")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgUnitsController {
  constructor(private readonly service: OrgUnitsService) {}

  @Get()
  @RequirePermission(AppPermission.OrgUnitsView)
  async list(@Query("parentId") parentId?: string): Promise<OrgUnitDto[]> {
    return this.service.list(parentId);
  }

  @Get(":id")
  @RequirePermission(AppPermission.OrgUnitsView)
  async findOne(@Param("id") id: string): Promise<OrgUnitDto> {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(AppPermission.OrgUnitsManage)
  async create(
    @Body() body: CreateOrgUnitRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<OrgUnitDto> {
    return this.service.create(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.OrgUnitsManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateOrgUnitRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<OrgUnitDto> {
    return this.service.update(id, body, actor);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.OrgUnitsManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    return this.service.delete(id, actor);
  }
}
