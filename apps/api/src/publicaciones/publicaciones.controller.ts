import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { PublicacionAutorDto, VincularAutorDto } from "./dto/pivot-autor.dto";
import {
  CreatePublicacionDto,
  PublicacionDto,
  UpdatePublicacionDto,
} from "./dto/publicacion.dto";
import { PublicacionesService } from "./publicaciones.service";

@Controller("publicaciones")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PublicacionesController {
  constructor(private readonly service: PublicacionesService) {}

  // ----- CRUD -----

  @Post()
  @RequirePermission(AppPermission.PublicacionesManage)
  async create(
    @Body() body: CreatePublicacionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PublicacionDto> {
    return this.service.create(body, actor);
  }

  @Get()
  @RequirePermission(AppPermission.PublicacionesView)
  async list(@Query("anio") anioStr?: string): Promise<PublicacionDto[]> {
    const anio = anioStr != null && anioStr !== "" ? Number(anioStr) : undefined;
    if (anioStr && anioStr !== "" && Number.isNaN(anio)) {
      return this.service.getAll(undefined);
    }
    return this.service.getAll(anio);
  }

  @Get(":id")
  @RequirePermission(AppPermission.PublicacionesView)
  async getById(@Param("id") id: string): Promise<PublicacionDto> {
    return this.service.getById(id);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.PublicacionesManage)
  async update(
    @Param("id") id: string,
    @Body() body: UpdatePublicacionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PublicacionDto> {
    return this.service.update(id, body, actor);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.PublicacionesManage)
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.delete(id, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.PublicacionesManage)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PublicacionDto> {
    return this.service.reactivate(id, actor);
  }

  // ----- Pivot autores -----

  @Post(":id/autores")
  @HttpCode(201)
  @RequirePermission(AppPermission.PublicacionesManage)
  async attachAutor(
    @Param("id") id: string,
    @Body() body: VincularAutorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PublicacionAutorDto> {
    return this.service.attachAutor(id, body, actor);
  }

  @Delete(":id/autores/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.PublicacionesManage)
  async detachAutor(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.detachAutor(id, pivotId, actor);
  }

@Get(":id/autores")
  @RequirePermission(AppPermission.PublicacionesView)
  async listAutores(@Param("id") id: string): Promise<PublicacionAutorDto[]> {
    return this.service.listAutores(id);
  }
}