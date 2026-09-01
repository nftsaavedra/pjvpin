import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import type { ProyectoDto } from "./dto/proyecto.dto";
import { ProyectosService } from "./proyectos.service";

@Controller("investigadores/:id/proyectos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvestigadorProyectosController {
  constructor(private readonly service: ProyectosService) {}

  /**
   * GET /investigadores/:id/proyectos
   * Lista los proyectos donde el investigador participa (cualquier rol).
   * Replica 1:1 el comportamiento Rust de `buscar_proyectos_por_investigador`
   * (ver `apps/desktop/src-tauri/src/proyectos/repository_queries.rs:46-83`):
   * query por `participaciones.id_investigador` sin filtro de rol, luego
   * $in sobre proyectos activos ordenados por titulo.
   */
  @Get()
  @RequirePermission(AppPermission.ProyectosView)
  async listByInvestigador(@Param("id") id: string): Promise<ProyectoDto[]> {
    return this.service.findByInvestigador(id);
  }
}
