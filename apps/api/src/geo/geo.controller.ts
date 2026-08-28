import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { GeoService } from "./geo.service";
import type { UbigeoDto } from "./geo.repository";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";

@Controller("geo/ubigeos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GeoController {
  constructor(private readonly service: GeoService) {}

  @Get()
  @RequirePermission(AppPermission.GeoRead)
  async list(
    @Query("departamento") departamento?: string,
    @Query("prefix") prefix?: string,
  ): Promise<UbigeoDto[]> {
    if (departamento) return this.service.listByDepartamento(departamento);
    if (prefix) return this.service.search(prefix);
    return this.service.listAll();
  }
}
