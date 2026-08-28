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
import { CatalogosService } from "./catalogos.service";
import {
  CreateCatalogoRequest,
  UpdateCatalogoRequest,
  type CatalogoItemDto,
  type EliminarCatalogoResultadoDto,
} from "./dto/catalogos.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

@Controller("catalogos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogosController {
  constructor(private readonly service: CatalogosService) {}

  @Get()
  @RequirePermission(AppPermission.CatalogosRead)
  async list(@Query("tipo") tipo: string): Promise<CatalogoItemDto[]> {
    return this.service.listByTipo(tipo);
  }

  @Get("admin")
  @RequirePermission(AppPermission.CatalogosManage)
  async listAdmin(@Query("tipo") tipo: string): Promise<CatalogoItemDto[]> {
    return this.service.listAllAdminByTipo(tipo);
  }

  @Post()
  @RequirePermission(AppPermission.CatalogosManage)
  async create(
    @Body() body: CreateCatalogoRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CatalogoItemDto> {
    return this.service.create(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.CatalogosManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateCatalogoRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CatalogoItemDto> {
    return this.service.update(id, body, actor);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.CatalogosManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EliminarCatalogoResultadoDto> {
    return this.service.softDelete(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.CatalogosManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CatalogoItemDto> {
    return this.service.reactivate(id, actor);
  }
}
