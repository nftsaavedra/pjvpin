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
import { Audit } from "../audit/audit.decorator";

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
  @Audit({
    action: "catalogo.create",
    targetType: "catalogo",
    targetId: { from: "response", field: "id" },
    details: { from: "resolver", fn: (ctx) => {
      const body = ctx.body as { tipo?: unknown; codigo?: unknown } | null;
      return body && typeof body.tipo === "string" && typeof body.codigo === "string"
        ? { tipo: body.tipo, codigo: body.codigo }
        : undefined;
    } },
  })
  async create(@Body() body: CreateCatalogoRequest): Promise<CatalogoItemDto> {
    return this.service.create(body);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.CatalogosManage)
  @Audit({ action: "catalogo.update", targetType: "catalogo" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateCatalogoRequest,
  ): Promise<CatalogoItemDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.CatalogosManage)
  @Audit({ action: "catalogo.delete", targetType: "catalogo" })
  async delete(@Param("id") id: string): Promise<EliminarCatalogoResultadoDto> {
    return this.service.softDelete(id);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.CatalogosManage)
  @Audit({ action: "catalogo.reactivate", targetType: "catalogo" })
  async reactivate(@Param("id") id: string): Promise<CatalogoItemDto> {
    return this.service.reactivate(id);
  }
}
