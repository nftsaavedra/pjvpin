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
import { CreateEquipamientoDto, EquipamientoDto, UpdateEquipamientoDto } from "./dto/equipamiento.dto";
import { RecursosService } from "./recursos.service";

@Controller("equipamientos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EquipamientosController {
  constructor(private readonly service: RecursosService) {}

  // POST/PATCH/DELETE/REACTIVAR: RecursosManage-only (D2 aplicado — ver
  // comentario en recursos.service.ts sobre ausencia de proyectoId en body).
  // El GET anidado por proyecto vive en proyectos-recursos.controller.ts
  // con ProyectosView (D4 — no-op legacy, ahora resuelto de verdad via pivots).

  @Post()
  @RequirePermission(AppPermission.RecursosManage)
  async create(
    @Body() body: CreateEquipamientoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EquipamientoDto> {
    return this.service.createEquipamiento(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.RecursosManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateEquipamientoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EquipamientoDto> {
    return this.service.updateEquipamiento(id, body, actor);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.RecursosManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.deleteEquipamiento(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.RecursosManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EquipamientoDto> {
    return this.service.reactivateEquipamiento(id, actor);
  }
}
