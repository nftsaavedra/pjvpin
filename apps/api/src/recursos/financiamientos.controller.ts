import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { CreateFinanciamientoDto, FinanciamientoDto, UpdateFinanciamientoDto } from "./dto/financiamiento.dto";
import { RecursosService } from "./recursos.service";

@Controller("financiamientos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanciamientosController {
  constructor(private readonly service: RecursosService) {}

  // POST/PATCH/DELETE/REACTIVAR: RecursosManage-only (D2 aplicado — mismo
  // motivo que equipamiento: el body no expone proyectoId, asi que el helper
  // RBAC cierra el bypass a responsable_proyecto. El GET anidado por
  // proyecto vive en proyectos-recursos.controller.ts con ProyectosView,
  // resolviendo via pivots proyecto_financiamientos (D4).

  @Post()
  @RequirePermission(AppPermission.RecursosManage)
  async create(
    @Body() body: CreateFinanciamientoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<FinanciamientoDto> {
    return this.service.createFinanciamiento(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.RecursosManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateFinanciamientoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<FinanciamientoDto> {
    return this.service.updateFinanciamiento(id, body, actor);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.RecursosManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.deleteFinanciamiento(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.RecursosManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<FinanciamientoDto> {
    return this.service.reactivateFinanciamiento(id, actor);
  }
}
