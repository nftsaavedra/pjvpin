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
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { InvestigadoresService } from "./investigadores.service";
import {
  CreateInvestigadorRequest,
  ImportDniRequest,
  UpdateInvestigadorRequest,
  type ImportInvestigadoresResult,
  type InvestigadorDetalleDto,
  type InvestigadorDto,
} from "./dto/investigadores.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";
import { Audit } from "../audit/audit.decorator";
import { AppError } from "../infra/errors/app-error";
import type { KardexEntry } from "../kardex/kardex.logic";

@Controller("investigadores")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvestigadoresController {
  constructor(private readonly service: InvestigadoresService) {}

  @Get()
  @RequirePermission(AppPermission.InvestigadoresView)
  async list(): Promise<InvestigadorDto[]> {
    return this.service.listAll();
  }

  @Get("paginated")
  @RequirePermission(AppPermission.InvestigadoresView)
  async listPaginated(@Query("page") page = "1", @Query("limit") limit = "20") {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    return this.service.listPaginated(p, l);
  }

  @Get("detalle")
  @RequirePermission(AppPermission.InvestigadoresView)
  async detalle(): Promise<InvestigadorDetalleDto[]> {
    return this.service.listAllConProyectos();
  }

  @Get("dni/:dni")
  @RequirePermission(AppPermission.InvestigadoresManage)
  async byDni(@Param("dni") dni: string): Promise<InvestigadorDto> {
    const inv = await this.service.findByDni(dni);
    if (!inv) throw AppError.notFound("Investigador no encontrado.");
    return inv;
  }

  @Get("dni/:dni/renacyt")
  @RequirePermission(AppPermission.InvestigadoresView)
  async byDniRenacyt(@Param("dni") dni: string): Promise<InvestigadorDto | null> {
    return this.service.findByDniConRenacyt(dni);
  }

  @Get(":id")
  @RequirePermission(AppPermission.InvestigadoresView)
  async byId(@Param("id") id: string): Promise<InvestigadorDto> {
    const docs = await this.service.listAll();
    const found = docs.find((d) => d.id_investigador === id);
    if (!found) throw AppError.notFound("Investigador no encontrado.");
    return found;
  }

  @Get(":id/kardex")
  @RequirePermission(AppPermission.InvestigadoresView)
  async kardex(@Param("id") id: string): Promise<KardexEntry[]> {
    return this.service.listKardex(id);
  }

  @Post()
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "investigador.create",
    targetType: "investigador",
    targetId: { from: "response", field: "id_investigador" },
  })
  async create(@Body() body: CreateInvestigadorRequest): Promise<InvestigadorDto> {
    return this.service.create(body);
  }

  @Patch(":id")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({ action: "investigador.update", targetType: "investigador" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateInvestigadorRequest,
  ): Promise<InvestigadorDto> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({ action: "investigador.deactivate", targetType: "investigador" })
  async delete(@Param("id") id: string): Promise<InvestigadorDto> {
    return this.service.deactivate(id);
  }

  @Patch(":id/reactivar")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({ action: "investigador.reactivate", targetType: "investigador" })
  async reactivate(@Param("id") id: string): Promise<InvestigadorDto> {
    return this.service.reactivate(id);
  }

  @Patch(":id/renacyt/cambios-revisados")
  @RequirePermission(AppPermission.InvestigadoresView)
  @Audit({ action: "investigador.renacyt.reviewed", targetType: "investigador" })
  async markReview(@Param("id") id: string): Promise<InvestigadorDto> {
    return this.service.marcarCambiosRenacytRevisados(id);
  }

  @Post(":id/renacyt/formacion/refrescar")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "renacyt.refresh.individual",
    targetType: "investigador",
    details: { from: "context" },
  })
  async refreshFormacion(@Param("id") id: string) {
    return this.service.refrescarFormacionRenacyt(id);
  }

  @Post("renacyt/refrescar-todos")
  @HttpCode(202)
  @RequirePermission(AppPermission.InvestigadoresManage)
  async refreshTodos(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.refreshRenacytTodos(actor);
  }

  @Get(":id/renacyt/constancia")
  @RequirePermission(AppPermission.InvestigadoresView)
  @Audit({
    action: "renacyt.constancia.download",
    targetType: "investigador",
    details: { from: "context" },
  })
  async descargarConstancia(
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.service.descargarConstanciaRenacyt(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="constancia-${id}.pdf"`);
    res.send(buffer);
  }

  @Get("import/plantilla")
  @RequirePermission(AppPermission.InvestigadoresView)
  async plantilla(): Promise<string[]> {
    return this.service.getPlantillaDefault();
  }

  @Post("import")
  @RequirePermission(AppPermission.InvestigadoresManage)
  @Audit({
    action: "investigador.import",
    targetType: "investigador.import",
    targetId: { from: "literal", value: "lote" },
    details: { from: "context" },
    deferToJob: (response) =>
      typeof response === "object" &&
      response !== null &&
      "jobId" in response &&
      "message" in response,
  })
  async importar(
    @Body() body: ImportDniRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ImportInvestigadoresResult | { jobId: string; message: string }> {
    const dnis = body.dnis.split(/[\s,;]+/).filter((s) => /^\d{8}$/.test(s));
    return this.service.importarDnis(dnis.slice(0, 200), actor);
  }
}