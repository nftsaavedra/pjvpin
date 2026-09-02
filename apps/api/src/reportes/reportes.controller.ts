import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppPermission } from "../rbac/permissions.enum";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import {
  ExportDataConProjectosDto,
  ExportDataDto,
  ExportDataGrupoDto,
  ExportDataInvestigadorPerfilDto,
  ExportDataProyectoAreaDto,
  ExportDataRecursoDto,
} from "./dto/export.dto";
import {
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
} from "./dto/integral.dto";
import { ReportesService } from "./reportes.service";

/**
 * 9 endpoints GET read-only del modulo `reportes` (F2a):
 *   - 6 datasets de exportacion (`export/*`)
 *   - 3 reportes integrales (`integral/*`)
 *
 * Sin logica de negocio: solo delega en `ReportesService`.
 */
@Controller("reportes")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  // ---------------------------------------------------------------
  // Datasets de exportacion
  // ---------------------------------------------------------------

  @Get("export/plana")
  @RequirePermission(AppPermission.ReportesExport)
  async getExportPlana(): Promise<ExportDataDto[]> {
    return this.service.getExportPlana();
  }

  @Get("export/agrupada")
  @RequirePermission(AppPermission.ReportesView)
  async getExportAgrupada(): Promise<ExportDataConProjectosDto[]> {
    return this.service.getExportAgrupada();
  }

  @Get("export/grupos")
  @RequirePermission(AppPermission.ReportesView)
  async getExportGrupos(): Promise<ExportDataGrupoDto[]> {
    return this.service.getExportGrupos();
  }

  @Get("export/recursos")
  @RequirePermission(AppPermission.ReportesView)
  async getExportRecursos(): Promise<ExportDataRecursoDto[]> {
    return this.service.getExportRecursos();
  }

  @Get("export/investigadores-perfil")
  @RequirePermission(AppPermission.ReportesView)
  async getExportInvestigadoresPerfil(): Promise<ExportDataInvestigadorPerfilDto[]> {
    return this.service.getExportInvestigadoresPerfil();
  }

  @Get("export/proyectos-area")
  @RequirePermission(AppPermission.ReportesView)
  async getExportProyectosArea(): Promise<ExportDataProyectoAreaDto[]> {
    return this.service.getExportProyectosArea();
  }

  // ---------------------------------------------------------------
  // Reportes integrales
  // ---------------------------------------------------------------

  /**
   * Declarado ANTES de `integral/investigador/:id` no es necesario (los
   * segmentos difieren), pero se mantiene el orden del contrato Rust.
   */
  @Get("integral/investigadores")
  @RequirePermission(AppPermission.ReportesExport)
  async getReportesInvestigadores(): Promise<ReporteInvestigadorIntegral[]> {
    return this.service.getReportesInvestigadores();
  }

  @Get("integral/proyecto/:id")
  @RequirePermission(AppPermission.ReportesExport)
  async getReporteProyecto(@Param("id") id: string): Promise<ReporteProyectoIntegral> {
    return this.service.getReporteProyecto(id);
  }

  @Get("integral/investigador/:id")
  @RequirePermission(AppPermission.ReportesExport)
  async getReporteInvestigador(
    @Param("id") id: string,
  ): Promise<ReporteInvestigadorIntegral> {
    return this.service.getReporteInvestigador(id);
  }
}
