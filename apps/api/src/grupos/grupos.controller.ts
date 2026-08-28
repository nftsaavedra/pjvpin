import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { GruposService } from "./grupos.service";
import { CreateGrupoRequest, UpdateGrupoRequest, type GrupoDto } from "./dto/grupos.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

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
  async create(
    @Body() body: CreateGrupoRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<GrupoDto> {
    return this.service.create(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.GruposManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateGrupoRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<GrupoDto> {
    return this.service.update(id, body, actor);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.GruposManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    return this.service.delete(id, actor);
  }
}
