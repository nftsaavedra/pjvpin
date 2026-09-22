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
import { Audit } from "../audit/audit.decorator";
import { CreateProyectoConParticipantesDto } from "./dto/create-proyecto.dto";
import { UpdateProyectoConParticipantesDto } from "./dto/update-proyecto.dto";
import { VincularFinanciamientoDto } from "./dto/pivot-financiamiento.dto";
import { VincularOrgDto } from "./dto/pivot-org.dto";
import { ProyectosService } from "./proyectos.service";

@Controller("proyectos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  // ----- lecturas (orden: rutas especificas antes que genericas) -----

  @Get("detalle")
  @RequirePermission(AppPermission.ProyectosView)
  async listDetalle(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["listAllDetalle"]>>> {
    return this.service.listAllDetalle(actor);
  }

  @Get()
  @RequirePermission(AppPermission.ProyectosView)
  async listPaginated(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["listPaginated"]>>> {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    return this.service.listPaginated(actor, p, l);
  }

  @Get(":id/organizaciones")
  @RequirePermission(AppPermission.ProyectosView)
  async listOrgs(
    @Param("id") id: string,
  ): Promise<Awaited<ReturnType<ProyectosService["listOrgs"]>>> {
    return this.service.listOrgs(id);
  }

  @Get(":id/financiamientos")
  @RequirePermission(AppPermission.ProyectosView)
  async listFins(
    @Param("id") id: string,
  ): Promise<Awaited<ReturnType<ProyectosService["listFins"]>>> {
    return this.service.listFins(id);
  }

  // ----- mutaciones (orden: especificas antes que genericas) -----

  @Post()
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.create",
    targetType: "proyecto",
    targetId: { from: "response", field: "id_proyecto" },
    details: { from: "context" },
  })
  async create(
    @Body() body: CreateProyectoConParticipantesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["create"]>>> {
    return this.service.create(body, actor);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.update",
    targetType: "proyecto",
    details: { from: "context" },
  })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateProyectoConParticipantesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["update"]>>> {
    return this.service.update(id, body, actor);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({ action: "proyecto.reactivate", targetType: "proyecto" })
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["reactivate"]>>> {
    return this.service.reactivate(id, actor);
  }

  @Delete(":id/participaciones/:investigadorId")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.delete_relation",
    targetType: "proyecto",
    details: {
      from: "resolver",
      fn: (ctx) => ({ id_investigador: ctx.params.investigadorId }),
    },
  })
  async eliminarRelacion(
    @Param("id") id: string,
    @Param("investigadorId") investigadorId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.eliminarRelacion(id, investigadorId, actor);
  }

  @Delete(":id/participaciones")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.delete_relations",
    targetType: "proyecto",
    details: { from: "context" },
  })
  async eliminarRelaciones(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.eliminarRelaciones(id, actor);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.delete",
    targetType: "proyecto",
    details: { from: "context" },
  })
  async delete(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Awaited<ReturnType<ProyectosService["delete"]>>> {
    return this.service.delete(id, actor);
  }

  @Post(":id/organizaciones")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.vincular_org",
    targetType: "proyecto",
    details: {
      from: "resolver",
      fn: (ctx) => {
        const body = ctx.body as VincularOrgDto | null;
        return body ? { id_org_unit: body.id_org_unit, rol: body.rol } : undefined;
      },
    },
  })
  async attachOrg(
    @Param("id") id: string,
    @Body() body: VincularOrgDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.attachOrg(id, body, actor);
  }

  @Delete(":id/organizaciones/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.desvincular_org",
    targetType: "proyecto_org",
    targetId: { from: "param", name: "pivotId" },
  })
  async detachOrg(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.detachOrg(id, pivotId, actor);
  }

  @Post(":id/financiamientos")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.vincular_fin",
    targetType: "proyecto",
    details: { from: "context" },
  })
  async attachFin(
    @Param("id") id: string,
    @Body() body: VincularFinanciamientoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.attachFin(id, body, actor);
  }

  @Delete(":id/financiamientos/:pivotId")
  @HttpCode(204)
  @RequirePermission(AppPermission.ProyectosManage)
  @Audit({
    action: "proyecto.desvincular_fin",
    targetType: "proyecto_fin",
    targetId: { from: "param", name: "pivotId" },
  })
  async detachFin(
    @Param("id") id: string,
    @Param("pivotId") pivotId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.service.detachFin(id, pivotId, actor);
  }
}