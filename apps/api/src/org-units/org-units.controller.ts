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
import { Audit } from "../audit/audit.decorator";

@Controller("org-units")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgUnitsController {
  constructor(private readonly service: OrgUnitsService) {}

  @Get()
  @RequirePermission(AppPermission.OrgUnitsView)
  async list(@Query("parent_id") parent_id?: string): Promise<OrgUnitDto[]> {
    return this.service.list(parent_id);
  }

  @Get(":id")
  @RequirePermission(AppPermission.OrgUnitsView)
  async findOne(@Param("id") id: string): Promise<OrgUnitDto> {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(AppPermission.OrgUnitsManage)
  @Audit({
    action: "org_unit.create",
    targetType: "org_unit",
    targetId: { from: "response", field: "id_org_unit" },
  })
  async create(@Body() body: CreateOrgUnitRequest): Promise<OrgUnitDto> {
    return this.service.create(body);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.OrgUnitsManage)
  @Audit({ action: "org_unit.update", targetType: "org_unit" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateOrgUnitRequest,
  ): Promise<OrgUnitDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.OrgUnitsManage)
  @Audit({ action: "org_unit.delete", targetType: "org_unit" })
  async delete(@Param("id") id: string): Promise<{ ok: true }> {
    return this.service.delete(id);
  }
}