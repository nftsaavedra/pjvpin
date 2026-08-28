import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { UsuariosRepository } from "./usuarios.repository";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CreateUsuarioRequest, UpdateUsuarioRequest } from "./dto/usuarios.dto";
import type { UsuarioDto } from "../auth/dto/auth.response";
import type { PaginatedUsuarios } from "./dto/usuarios.dto";
import { ReniecClient } from "../infra/http/reniec.client";
import { AppError } from "../infra/errors/app-error";

@Controller("usuarios")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsuariosController {
  constructor(
    private readonly service: UsuariosService,
    private readonly repo: UsuariosRepository,
    private readonly reniec: ReniecClient,
  ) {}

  @Get()
  @RequirePermission(AppPermission.UsuariosManage)
  async list(): Promise<UsuarioDto[]> {
    return this.service.listAll();
  }

  @Get("paginated")
  @RequirePermission(AppPermission.UsuariosManage)
  async listPaginated(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ): Promise<PaginatedUsuarios> {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    return this.service.listPaginated(p, l);
  }

  @Get(":id")
  @RequirePermission(AppPermission.UsuariosManage)
  async findOne(@Param("id") id: string): Promise<UsuarioDto> {
    const user = await this.service.findById(id);
    if (!user) throw AppError.notFound("Usuario no encontrado.");
    return user;
  }

  @Get(":id/persona")
  @RequirePermission(AppPermission.UsuariosManage)
  async findPersona(@Param("id") id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw AppError.notFound("Usuario no encontrado.");
    if (!user.persona_id) throw AppError.notFound("Usuario sin persona asociada.");
    const persona = await this.repo.findPersonaById(user.persona_id);
    if (!persona) throw AppError.notFound("Persona no encontrada.");
    return persona;
  }

  @Post()
  @RequirePermission(AppPermission.UsuariosManage)
  async create(
    @Body() body: CreateUsuarioRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioDto> {
    return this.service.create({
      username: body.username,
      password: body.password,
      rol: body.rol,
      dni: body.dni,
      actor,
    });
  }

  @Post("reniec-dni")
  @RequirePermission(AppPermission.UsuariosManage)
  async consultarReniec(@Body() body: { numero: string }) {
    return this.reniec.consultar(body.numero);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.UsuariosManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateUsuarioRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioDto> {
    return this.service.update(id, body, actor);
  }

  @Patch(":id/desactivar")
  @RequirePermission(AppPermission.UsuariosManage)
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioDto> {
    return this.service.deactivate(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.UsuariosManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioDto> {
    return this.service.reactivate(id, actor);
  }
}
