import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { PeruCrisService } from "./perucris.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

interface ValidarRequest {
  scope?: "all" | "person" | "org" | "publication";
}

@Controller("perucris")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PeruCrisController {
  constructor(private readonly service: PeruCrisService) {}

  @Post("push")
  @RequirePermission(AppPermission.ReportesExport)
  async push(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.pushCerif(actor);
  }

  @Post("validacion")
  @RequirePermission(AppPermission.ReportesView)
  async validar(@Body() body: ValidarRequest, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.validarSincronizacion(body.scope ?? "all", actor);
  }

  @Get("validacion/org-unit/:id")
  @RequirePermission(AppPermission.ReportesView)
  async validarOrgUnit(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.validarOrgUnit(id, actor);
  }

  @Get("validacion/publicacion/:id")
  @RequirePermission(AppPermission.ReportesView)
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
