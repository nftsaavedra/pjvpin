import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { EquipamientoDto } from "./dto/equipamiento.dto";
import { FinanciamientoDto } from "./dto/financiamiento.dto";
import { PatenteDto } from "./dto/patente.dto";
import { RecursosService } from "./recursos.service";

/**
 * Controller con rutas anidadas `GET /proyectos/:id/{patentes,equipamientos,
 * /financiamientos-recursos}`. Permiso ProyectosView (doc 07 §2.1).
 *
 *  - patentes: query directa por `proyecto_id`.
 *  - equipamientos: D4 — pivots proyecto_financiamientos → financiamiento →
 *    equipamiento por `id_financiamiento`.
 *  - financiamientos-recursos: D4 — pivots proyecto_financiamientos → ids →
 *    financiamientos.
 */
@Controller("proyectos/:id")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProyectosRecursosController {
  constructor(private readonly service: RecursosService) {}

  @Get("patentes")
  @RequirePermission(AppPermission.ProyectosView)
  async listPatentes(@Param("id") id: string): Promise<PatenteDto[]> {
    return this.service.listPatentesByProyecto(id);
  }

  @Get("equipamientos")
  @RequirePermission(AppPermission.ProyectosView)
  async listEquipamientos(@Param("id") id: string): Promise<EquipamientoDto[]> {
    return this.service.listEquipamientosByProyecto(id);
  }

  @Get("financiamientos-recursos")
  @RequirePermission(AppPermission.ProyectosView)
  async listFinanciamientos(
    @Param("id") id: string,
  ): Promise<FinanciamientoDto[]> {
    return this.service.listFinanciamientosByProyecto(id);
  }
}
