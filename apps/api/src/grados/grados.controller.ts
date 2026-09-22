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
import { GradosService } from "./grados.service";
import {
  CreateGradoRequest,
  UpdateGradoRequest,
  type EliminarGradoResultadoDto,
  type GradoDto,
} from "./dto/grados.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { Audit } from "../audit/audit.decorator";

@Controller("grados")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GradosController {
  constructor(private readonly service: GradosService) {}

  @Get()
  @RequirePermission(AppPermission.GradosRead)
  async list(): Promise<GradoDto[]> {
    return this.service.listAll();
  }

  @Get("paginated")
  @RequirePermission(AppPermission.GradosRead)
  async listPaginated(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ): Promise<{
    items: GradoDto[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    return this.service.listPaginated(p, l);
  }

  @Post()
  @RequirePermission(AppPermission.GradosManage)
  @Audit({
    action: "grado.create",
    targetType: "grado",
    targetId: { from: "response", field: "id_grado" },
  })
  async create(@Body() body: CreateGradoRequest): Promise<GradoDto> {
    return this.service.create(body);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.GradosManage)
  @Audit({ action: "grado.update", targetType: "grado" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateGradoRequest,
  ): Promise<GradoDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.GradosManage)
  @Audit({ action: "grado.delete", targetType: "grado" })
  async delete(@Param("id") id: string): Promise<EliminarGradoResultadoDto> {
    return this.service.softDelete(id);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.GradosManage)
  @Audit({ action: "grado.reactivate", targetType: "grado" })
  async reactivate(@Param("id") id: string): Promise<GradoDto> {
    return this.service.reactivate(id);
  }
}