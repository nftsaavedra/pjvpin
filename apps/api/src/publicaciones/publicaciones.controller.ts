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
import { Audit } from "../audit/audit.decorator";
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
  @Audit({
    action: "publicacion.create",
    targetType: "publicacion",
    targetId: { from: "response", field: "id_publicacion" },
    details: {
      from: "response",
      pick: (response) => {
        const r = response as PublicacionDto | null;
        return r
          ? { titulo: r.titulo, tipo: r.tipo, id_proyecto: r.id_proyecto }
          : undefined;
      },
    },
  })
  async create(@Body() body: CreatePublicacionDto): Promise<PublicacionDto> {
    return this.service.create(body);
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
  @Audit({
    action: "publicacion.update",
    targetType: "publicacion",
    details: { from: "context" },
  })
  async update(
    @Param("id") id: string,
    @Body() body: UpdatePublicacionDto,
  ): Promise<PublicacionDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission(AppPermission.PublicacionesManage)
  @Audit({ action: "publicacion.delete", targetType: "publicacion" })
  async delete(@Param("id") id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.PublicacionesManage)
  @Audit({ action: "publicacion.reactivate", targetType: "publicacion" })
  async reactivate(@Param("id") id: string): Promise<PublicacionDto> {
    return this.service.reactivate(id);
  }

  // ----- Pivot autores -----

  @Post(":id/autores")
  @HttpCode(201)
  @RequirePermission(AppPermission.PublicacionesManage)
  @Audit({
    action: "publicacion.vincular_autor",
    targetType: "publicacion",
    targetId: { from: "response", field: "id_publicacion" },
    details: {
      from: "response",
      pick: (response) => {
        const r = response as PublicacionAutorDto | null;
        return r ? { id_persona: r.id_persona, orden: r.orden } : undefined;
      },
    },
  })
  async attachAutor(
    @Param("id") id: string,
    @Body() body: VincularAutorDto,
  ): Promise<PublicacionAutorDto> {
    return this.service.attachAutor(id, body);
  }

  @Delete(":id/autores/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.PublicacionesManage)
  @Audit({
    action: "publicacion.desvincular_autor",
    targetType: "publicacion",
    details: {
      from: "resolver",
      fn: (ctx) => ({ pivot_id: ctx.params.pivotId }),
    },
  })
  async detachAutor(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
  ): Promise<void> {
    return this.service.detachAutor(id, pivotId);
  }

  @Get(":id/autores")
  @RequirePermission(AppPermission.PublicacionesView)
  async listAutores(@Param("id") id: string): Promise<PublicacionAutorDto[]> {
    return this.service.listAutores(id);
  }
}