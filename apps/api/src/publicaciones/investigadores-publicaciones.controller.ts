import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { PublicacionDto } from "./dto/publicacion.dto";
import { PublicacionesService } from "./publicaciones.service";

@Controller("investigadores/:id/publicaciones")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvestigadoresPublicacionesController {
  constructor(private readonly service: PublicacionesService) {}

  @Get()
  @RequirePermission(AppPermission.PublicacionesView)
  async listByInvestigador(@Param("id") id: string): Promise<PublicacionDto[]> {
    return this.service.getByInvestigador(id);
  }
}