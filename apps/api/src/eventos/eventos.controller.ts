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
import { Audit } from "../audit/audit.decorator";
import { CreateEventoDto, EventoDto, UpdateEventoDto } from "./dto/evento.dto";
import { EventosService } from "./eventos.service";

@Controller("eventos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventosController {
  constructor(private readonly service: EventosService) {}

  @Post()
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "evento.create",
    targetType: "evento",
    targetId: { from: "response", field: "id_evento" },
    details: {
      from: "response",
      pick: (response) => {
        const r = response as EventoDto | null;
        return r ? { nombre: r.nombre, tipo: r.tipo } : undefined;
      },
    },
  })
  async create(@Body() body: CreateEventoDto): Promise<EventoDto> {
    return this.service.create(body);
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
  @Audit({
    action: "evento.update",
    targetType: "evento",
    details: { from: "context" },
  })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateEventoDto,
  ): Promise<EventoDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({ action: "evento.delete", targetType: "evento" })
  async delete(@Param("id") id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({ action: "evento.reactivate", targetType: "evento" })
  async reactivate(@Param("id") id: string): Promise<EventoDto> {
    return this.service.reactivate(id);
  }
}