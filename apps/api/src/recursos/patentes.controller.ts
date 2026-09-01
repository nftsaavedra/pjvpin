import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreatePatenteDto, PatenteDto, UpdatePatenteDto } from "./dto/patente.dto";
import {
  PatenteInventorDto,
  PatenteTitularDto,
  VincularInventorDto,
  VincularTitularDto,
} from "./dto/pivot-patente.dto";
import { RecursosService } from "./recursos.service";

@Controller("patentes")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatentesController {
  constructor(private readonly service: RecursosService) {}

  // ----- CRUD patentes -----

  @Post()
  @RequirePermission(AppPermission.RecursosManage)
  async create(
    @Body() body: CreatePatenteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatenteDto> {
    return this.service.createPatente(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.RecursosManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdatePatenteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatenteDto> {
    return this.service.updatePatente(id, body, actor);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.RecursosManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.deletePatente(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.RecursosManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatenteDto> {
    return this.service.reactivatePatente(id, actor);
  }

  // ----- Pivots inventores (RecursosManage-only) -----

  @Post(":id/inventores")
  @HttpCode(201)
  @RequirePermission(AppPermission.RecursosManage)
  async attachInventor(
    @Param("id") id: string,
    @Body() body: VincularInventorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatenteInventorDto> {
    return this.service.attachInventor(id, body, actor);
  }

  @Delete(":id/inventores/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.RecursosManage)
  async detachInventor(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.detachInventor(id, pivotId, actor);
  }

  @Get(":id/inventores")
  @RequirePermission(AppPermission.RecursosManage)
  async listInventores(
    @Param("id") id: string,
  ): Promise<PatenteInventorDto[]> {
    return this.service.listInventores(id);
  }

  // ----- Pivots titulares (RecursosManage-only) -----

  @Post(":id/titulares")
  @HttpCode(201)
  @RequirePermission(AppPermission.RecursosManage)
  async attachTitular(
    @Param("id") id: string,
    @Body() body: VincularTitularDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatenteTitularDto> {
    return this.service.attachTitular(id, body, actor);
  }

  @Delete(":id/titulares/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.RecursosManage)
  async detachTitular(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.detachTitular(id, pivotId, actor);
  }

  @Get(":id/titulares")
  @RequirePermission(AppPermission.RecursosManage)
  async listTitulares(
    @Param("id") id: string,
  ): Promise<PatenteTitularDto[]> {
    return this.service.listTitulares(id);
  }
}
