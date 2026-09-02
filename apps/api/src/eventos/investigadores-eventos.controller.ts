import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { EventoDto } from "./dto/evento.dto";
import { EventosService } from "./eventos.service";

@Controller("investigadores/:id/eventos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvestigadoresEventosController {
  constructor(private readonly service: EventosService) {}

  @Get()
  @RequirePermission(AppPermission.InvestigadoresView)
  async listByInvestigador(@Param("id") id: string): Promise<EventoDto[]> {
    return this.service.getByInvestigador(id);
  }
}