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
import { CreateEventoDto, EventoDto, UpdateEventoDto } from "./dto/evento.dto";
import { EventosService } from "./eventos.service";

@Controller("eventos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventosController {
  constructor(private readonly service: EventosService) {}

  @Post()
  @RequirePermission(AppPermission.InvestigadoresManage)
  async create(
    @Body() body: CreateEventoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EventoDto> {
    return this.service.create(body, actor);
  }

  @Get()
  @RequirePermission(AppPermission.InvestigadoresView)
  async list(): Promise<EventoDto[]> {
    return this.service.getAll();
  }

  @Get(":id")
  @RequirePermission(AppPermission.InvestigadoresView)
  async getById(@Param("id") id: string): Promise<EventoDto> {
    return this.service.getById(id);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.InvestigadoresManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateEventoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EventoDto> {
    return this.service.update(id, body, actor);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.InvestigadoresManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.delete(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.InvestigadoresManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<EventoDto> {
    return this.service.reactivate(id, actor);
  }
}