import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { PeruCrisService } from "./perucris.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { Audit } from "../audit/audit.decorator";

interface ValidarRequest {
  scope?: "all" | "person" | "org" | "publication";
}

@Controller("perucris")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PeruCrisController {
  constructor(private readonly service: PeruCrisService) {}

  @Post("push")
  @RequirePermission(AppPermission.ReportesExport)
  @Audit({
    action: "perucris.push",
    targetType: "perucris",
    targetId: { from: "literal", value: "push" },
    details: {
      from: "response",
      pick: (response) => {
        const r = response as
          | {
              httpStatus: number;
              totalOrganizaciones: number;
              totalPersonas: number;
              totalProyectos: number;
              totalPublicaciones: number;
              totalPatentes: number;
            }
          | null;
        return r
          ? {
              httpStatus: r.httpStatus,
              organizaciones: r.totalOrganizaciones,
              personas: r.totalPersonas,
              proyectos: r.totalProyectos,
              publicaciones: r.totalPublicaciones,
              patentes: r.totalPatentes,
            }
          : undefined;
      },
    },
  })
  async push(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.pushCerif(actor);
  }

  @Post("validacion")
  @RequirePermission(AppPermission.ReportesView)
  @Audit({
    action: "perucris.validate",
    targetType: "validacion",
    targetId: { from: "body", path: "scope" },
    details: { from: "context" },
  })
  async validar(@Body() body: ValidarRequest, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.validarSincronizacion(body.scope ?? "all", actor);
  }

  @Get("validacion/org-unit/:id")
  @RequirePermission(AppPermission.ReportesView)
  @Audit({
    action: "perucris.validate.org_unit",
    targetType: "org_unit",
    details: {
      from: "response",
      pick: (response) => {
        const r = response as { clasificacion?: string } | null;
        return r ? { encontrado: r.clasificacion !== "no_encontrado" } : undefined;
      },
    },
  })
  async validarOrgUnit(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.validarOrgUnit(id, actor);
  }

  @Get("validacion/publicacion/:id")
  @RequirePermission(AppPermission.ReportesView)
  @Audit({
    action: "perucris.validate.publication",
    targetType: "publicacion",
    details: {
      from: "response",
      pick: (response) => {
        const r = response as { clasificacion?: string } | null;
        return r ? { encontrado: r.clasificacion !== "no_encontrado" } : undefined;
      },
    },
  })
  async validarPublicacion(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.validarPublicacion(id, actor);
  }

  @Post("import/iniciales")
  @HttpCode(202)
  @RequirePermission(AppPermission.ReportesExport)
  async importIniciales(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.importIniciales(actor);
  }
}