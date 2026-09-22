import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { GruposService } from "./grupos.service";
import { CreateGrupoRequest, UpdateGrupoRequest, type GrupoDto } from "./dto/grupos.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { Audit } from "../audit/audit.decorator";

@Controller("grupos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GruposController {
  constructor(private readonly service: GruposService) {}

  @Get()
  @RequirePermission(AppPermission.GruposView)
  async list(): Promise<GrupoDto[]> {
    return this.service.listAll();
  }

  @Get(":id")
  @RequirePermission(AppPermission.GruposView)
  async findOne(@Param("id") id: string): Promise<GrupoDto> {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(AppPermission.GruposManage)
  @Audit({
    action: "grupo.create",
    targetType: "grupo",
    targetId: { from: "response", field: "id_grupo" },
  })
  async create(@Body() body: CreateGrupoRequest): Promise<GrupoDto> {
    return this.service.create(body);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.GruposManage)
  @Audit({ action: "grupo.update", targetType: "grupo" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateGrupoRequest,
  ): Promise<GrupoDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.GruposManage)
  @Audit({ action: "grupo.delete", targetType: "grupo" })
  async delete(@Param("id") id: string): Promise<{ ok: true }> {
    return this.service.delete(id);
  }
}