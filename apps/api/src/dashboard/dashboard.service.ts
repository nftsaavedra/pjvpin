/**
 * Servicio del módulo `dashboard` (4 endpoints GET read-only).
 *
 * No contiene lógica de negocio: solo orquesta el repository y delega en
 * la lógica pura (`dashboard.logic.ts`). Sin auditoría (consistente con
 * los handlers Rust de dashboard, que solo auditan en `exportar_cerif`).
 */
import { Injectable } from "@nestjs/common";
import {
  InvestigadorProyectosCountDto,
  KpisDashboardDto,
  ProyectosTrendItemDto,
  RenacytDistribucionItemDto,
} from "./dto/dashboard.dto";
import {
  calcularEstadisticas,
  calcularKpis,
  calcularRenacytDistribucion,
  calcularTrend,
} from "./dashboard.logic";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getKpis(): Promise<KpisDashboardDto> {
    const [totalProyectos, investigadores] = await Promise.all([
      this.repo.countProyectosActivos(),
      this.repo.listAllInvestigadores(),
    ]);
    const totalInvestigadores = investigadores.length;
    const stats = await this.loadEstadisticas();
    return calcularKpis(totalProyectos, totalInvestigadores, stats);
  }

  async getEstadisticas(): Promise<InvestigadorProyectosCountDto[]> {
    return this.loadEstadisticas();
  }

  async getProyectosTrend(): Promise<ProyectosTrendItemDto[]> {
    const proyectos = await this.repo.listAllProyectosActivos();
    return calcularTrend(proyectos);
  }

  async getRenacytDistribucion(): Promise<RenacytDistribucionItemDto[]> {
    const [investigadores, proyectos, participaciones] = await Promise.all([
      this.repo.listAllInvestigadores(),
      this.repo.listAllProyectosActivos(),
      this.repo.listAllParticipaciones(),
    ]);
    const proyectosMap = new Map(proyectos.map((p) => [p.id_proyecto, p]));
    return calcularRenacytDistribucion(investigadores, proyectosMap, participaciones);
  }

  // ============================================================
  // Privados
  // ============================================================

  private async loadEstadisticas(): Promise<InvestigadorProyectosCountDto[]> {
    const [investigadores, proyectos, participaciones, personas] =
      await Promise.all([
        this.repo.listAllInvestigadores(),
        this.repo.listAllProyectosActivos(),
        this.repo.listAllParticipaciones(),
        this.repo.listAllPersonas(),
      ]);
    const proyectosMap = new Map(proyectos.map((p) => [p.id_proyecto, p]));
    const personasMap = new Map(personas.map((p) => [p.id_persona, p]));
    return calcularEstadisticas(
      investigadores,
      proyectosMap,
      participaciones,
      personasMap,
    );
  }
}
