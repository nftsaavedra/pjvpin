import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PersonasService } from "./personas.service";
import { PersonasRepository } from "./personas.repository";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { AppError } from "../infra/errors/app-error";
import type { PersonaDto } from "./dto/personas.dto";

@Controller("usuarios/:id")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonasController {
  constructor(
    private readonly service: PersonasService,
    private readonly repo: PersonasRepository,
  ) {}

  @Get("persona")
  @RequirePermission(AppPermission.UsuariosManage)
  async findForUsuario(@Param("id") id: string): Promise<PersonaDto> {
    const usuario = await this.repo.findUsuarioById(id);
    if (!usuario) throw AppError.notFound("Usuario no encontrado.");
    if (!usuario.persona_id) throw AppError.notFound("Usuario sin persona asociada.");
    const persona = await this.service.findById(usuario.persona_id);
    return persona;
  }
}
