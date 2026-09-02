import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { DashboardService } from "./dashboard.service";
import {
  InvestigadorProyectosCountDto,
  KpisDashboardDto,
  ProyectosTrendItemDto,
  RenacytDistribucionItemDto,
} from "./dto/dashboard.dto";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("kpis")
  @RequirePermission(AppPermission.DashboardView)
  async getKpis(): Promise<KpisDashboardDto> {
    return this.service.getKpis();
  }

  @Get("estadisticas-proyectos-investigador")
  @RequirePermission(AppPermission.DashboardView)
  async getEstadisticas(): Promise<InvestigadorProyectosCountDto[]> {
    return this.service.getEstadisticas();
  }

  @Get("proyectos-trend")
  @RequirePermission(AppPermission.DashboardView)
  async getProyectosTrend(): Promise<ProyectosTrendItemDto[]> {
    return this.service.getProyectosTrend();
  }

  @Get("renacyt-distribucion")
  @RequirePermission(AppPermission.DashboardView)
  async getRenacytDistribucion(): Promise<RenacytDistribucionItemDto[]> {
    return this.service.getRenacytDistribucion();
  }
}
