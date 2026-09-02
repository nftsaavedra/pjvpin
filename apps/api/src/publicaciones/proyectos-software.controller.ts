import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { PublicacionDto } from "./dto/publicacion.dto";
import { PublicacionesService } from "./publicaciones.service";

@Controller("proyectos/:id/software")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProyectosSoftwareController {
  constructor(private readonly service: PublicacionesService) {}

  @Get()
  @RequirePermission(AppPermission.ProyectosView)
  async list(@Param("id") id: string): Promise<PublicacionDto[]> {
    return this.service.getSoftwareByProyecto(id);
  }
}