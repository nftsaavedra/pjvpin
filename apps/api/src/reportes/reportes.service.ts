/**
 * Service del modulo `reportes`. Orquesta los dos repositorios
 * (`ReportesExportRepository` para los 6 datasets, `ReportesIntegralRepository`
 * para los 3 integrales) y delega toda transformacion a `reportes.logic.ts`.
 *
 * Sin auditoria: los 9 endpoints son GET read-only (consistente con los
 * handlers Rust de reportes, que solo auditan `exportar_cerif`).
 */
import { Injectable } from "@nestjs/common";
import type { CatalogoMap } from "./catalogo.helper";
import type {
  ExportDataConProjectosDto,
  ExportDataDto,
  ExportDataGrupoDto,
  ExportDataInvestigadorPerfilDto,
  ExportDataProyectoAreaDto,
  ExportDataRecursoDto,
} from "./dto/export.dto";
import type { PureMasterlistData } from "./dto/masterlist.dto";
import type {
  RecursosProyectoResumen,
  ReporteInvestigadorIntegral,
  ReporteProyectoIntegral,
} from "./dto/integral.dto";
import {
  assertInvestigadorEncontrado,
  assertProyectoEncontrado,
  buildMasterlistData,
  buildReporteInvestigadorIntegral,
  buildReporteProyectoIntegral,
  buildReportesInvestigadoresIntegral,
  indexById,
  proyectarAgrupadaInvestigador,
  proyectarGrupos,
  proyectarInvestigadoresPerfil,
  proyectarPlana,
  proyectarProyectosArea,
  proyectarRecursos,
  type ReporteInvestigadorInput,
} from "./reportes.logic";
import type {
  GradoReporteDoc,
  GrupoReporteDoc,
  InvestigadorReporteDoc,
  ParticipacionReporteDoc,
  PersonaReporteDoc,
  ProyectoReporteDoc,
} from "./reportes.docs";
import { ReportesExportRepository } from "./repository-export";
import { ReportesIntegralRepository } from "./repository-integral";
import { ReportesMasterlistRepository } from "./repository-masterlist";
import { CerifService } from "../cerif/cerif.service";
import { parseScope } from "../cerif/cerif.logic";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { AuditService } from "../audit/audit.service";

/**
 * Maestros compartidos por los reportes integrales. Se cargan una sola vez
 * por request (incluido el endpoint de lote, que los reutiliza para los N
 * investigadores).
 */
interface MaestrosIntegral {
  catalogoMap: CatalogoMap;
  grados: Map<string, GradoReporteDoc>;
  grupos: Map<string, GrupoReporteDoc>;
  personas: Map<string, PersonaReporteDoc>;
  investigadores: Map<string, InvestigadorReporteDoc>;
  proyectos: Map<string, ProyectoReporteDoc>;
  participaciones: ParticipacionReporteDoc[];
}

@Injectable()
export class ReportesService {
  constructor(
    private readonly exportRepo: ReportesExportRepository,
    private readonly integralRepo: ReportesIntegralRepository,
    private readonly masterlistRepo: ReportesMasterlistRepository,
    private readonly cerif: CerifService,
    private readonly audit: AuditService,
  ) {}

  // ===============================================================
  // Datasets de exportacion
  // ===============================================================

  async getExportPlana(): Promise<ExportDataDto[]> {
    const [grados, investigadores, personas, proyectos, participaciones] =
      await Promise.all([
        this.exportRepo.loadGradosMap(),
        this.exportRepo.loadInvestigadoresMap(),
        this.exportRepo.loadPersonasMap(),
        this.exportRepo.loadProyectosMap(),
        this.exportRepo.listParticipaciones(),
      ]);
    return proyectarPlana({ grados, investigadores, personas, proyectos, participaciones });
  }

  async getExportAgrupada(): Promise<ExportDataConProjectosDto[]> {
    const [grados, grupos, investigadoresActivos, personas, proyectos, participaciones] =
      await Promise.all([
        this.exportRepo.loadGradosMap(),
        this.exportRepo.loadGruposMap(),
        this.exportRepo.listInvestigadoresActivos(),
        this.exportRepo.loadPersonasMap(),
        this.exportRepo.loadProyectosMap(),
        this.exportRepo.listParticipaciones(),
      ]);
    return proyectarAgrupadaInvestigador({
      grados,
      grupos,
      investigadoresActivos,
      personas,
      proyectos,
      participaciones,
    });
  }

  async getExportGrupos(): Promise<ExportDataGrupoDto[]> {
    const [grupos, investigadores, personas, proyectos, participaciones] =
      await Promise.all([
        this.exportRepo.listGrupos(),
        this.exportRepo.loadInvestigadoresMap(),
        this.exportRepo.loadPersonasMap(),
        this.exportRepo.loadProyectosMap(),
        this.exportRepo.listParticipaciones(),
      ]);
    return proyectarGrupos({ grupos, investigadores, personas, proyectos, participaciones });
  }

  async getExportRecursos(): Promise<ExportDataRecursoDto[]> {
    const [
      catalogoMap,
      investigadores,
      personas,
      proyectos,
      patentes,
      softwarePublicaciones,
      equipamientos,
      financiamientos,
      patenteInventores,
      orgUnits,
      proyectoFinanciamientos,
    ] = await Promise.all([
      this.exportRepo.loadCatalogoMap(),
      this.exportRepo.loadInvestigadoresMap(),
      this.exportRepo.loadPersonasMap(),
      this.exportRepo.loadProyectosMap(),
      this.exportRepo.listPatentes(),
      this.exportRepo.listSoftwarePublicaciones(),
      this.exportRepo.listEquipamientos(),
      this.exportRepo.listFinanciamientos(),
      this.exportRepo.listPatenteInventores(),
      this.exportRepo.listOrgUnits(),
      this.exportRepo.listProyectoFinanciamientos(),
    ]);
    return proyectarRecursos({
      catalogoMap,
      investigadores,
      personas,
      proyectos,
      patentes,
      softwarePublicaciones,
      equipamientos,
      financiamientos,
      patenteInventores,
      orgUnits,
      proyectoFinanciamientos,
    });
  }

  async getExportInvestigadoresPerfil(): Promise<ExportDataInvestigadorPerfilDto[]> {
    const [
      grados,
      grupos,
      investigadores,
      personas,
      proyectos,
      participaciones,
      publicacionAutores,
    ] = await Promise.all([
      this.exportRepo.loadGradosMap(),
      this.exportRepo.loadGruposMap(),
      this.exportRepo.listInvestigadores(),
      this.exportRepo.loadPersonasMap(),
      this.exportRepo.loadProyectosMap(),
      this.exportRepo.listParticipaciones(),
      this.exportRepo.listPublicacionAutores(),
    ]);
    return proyectarInvestigadoresPerfil({
      grados,
      grupos,
      investigadores,
      personas,
      proyectos,
      participaciones,
      publicacionAutores,
    });
  }

  async getExportProyectosArea(): Promise<ExportDataProyectoAreaDto[]> {
    const [proyectosActivos, participaciones] = await Promise.all([
      this.exportRepo.listProyectosActivos(),
      this.exportRepo.listParticipaciones(),
    ]);
    return proyectarProyectosArea({ proyectosActivos, participaciones });
  }

  // ===============================================================
  // Pure Master List (V8)
  // ===============================================================

  /**
   * Genera el payload del master list V8 de Pure (Persons + Staffrelations +
   * Summary). `pureRemoteTotal` opcional se popula desde el panel de sync
   * si el caller conoce el total remoto; si no, el summary emite 0.
   */
  async getMasterlist(pureRemoteTotal?: number): Promise<PureMasterlistData> {
    const [investigadoresActivos, personas] = await Promise.all([
      this.masterlistRepo.listInvestigadoresActivos(),
      this.masterlistRepo.loadPersonasMap(),
    ]);
    return buildMasterlistData({ investigadoresActivos, personas, pureRemoteTotal });
  }

  // ===============================================================
  // Exportador CERIF (JSON)
  // ===============================================================

  /**
   * Construye el documento CERIF, lo serializa a JSON pretty y audita.
   * Devuelve el buffer + filename para que el controller setee headers.
   *
   * Port de `reportes/handlers.rs::exportar_cerif`.
   */
  async exportarCerif(
    rawEntidad: string | null | undefined,
    actor: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; filename: string; scope: string }> {
    const scope = parseScope(rawEntidad);
    const doc = await this.cerif.buildCerifDocument(scope);
    const json = JSON.stringify(doc, null, 2);
    const buffer = Buffer.from(json, "utf-8");
    const entidad = scope === "todo" ? "todo" : scope;
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "reportes.export",
      "cerif",
      entidad,
      JSON.stringify({
        bytes: buffer.length,
        organizaciones: doc.organizaciones.length,
        personas: doc.personas.length,
        proyectos: doc.proyectos.length,
        publicaciones: doc.publicaciones.length,
        patentes: doc.patentes.length,
      }),
    );
    return { buffer, filename: `cerif-${entidad}.json`, scope: entidad };
  }

  // ===============================================================
  // Reportes integrales
  // ===============================================================

  async getReporteProyecto(idProyecto: string): Promise<ReporteProyectoIntegral> {
    const proyecto = assertProyectoEncontrado(
      await this.integralRepo.findProyecto(idProyecto),
    );

    const [catalogoMap, grados, grupos, personas, participaciones] = await Promise.all([
      this.exportRepo.loadCatalogoMap(),
      this.exportRepo.loadGradosMap(),
      this.exportRepo.loadGruposMap(),
      this.exportRepo.loadPersonasMap(),
      this.integralRepo.listParticipacionesByProyecto(idProyecto),
    ]);

    const investigadoresPorId = indexById(
      await this.integralRepo.listInvestigadoresByIds(
        participaciones.map((p) => p.id_investigador),
      ),
      (i) => i.id_investigador,
    );
    const publicacionesCountPorPersona = await this.loadPublicacionesCount(
      Array.from(investigadoresPorId.values()).map((i) => i.id_persona),
    );

    const idsFinanciamiento = await this.integralRepo.listFinanciamientoIdsByProyectos([
      idProyecto,
    ]);
    const [patentes, software, equipamientos, financiamientos] = await Promise.all([
      this.integralRepo.listPatentesByProyecto(idProyecto),
      this.integralRepo.listSoftwareByProyecto(idProyecto),
      this.integralRepo.listEquipamientosByFinanciamientos(idsFinanciamiento),
      this.integralRepo.listFinanciamientosByIds(idsFinanciamiento),
    ]);

    return buildReporteProyectoIntegral({
      proyecto,
      participaciones,
      investigadoresPorId,
      publicacionesCountPorPersona,
      grados,
      grupos,
      personas,
      catalogoMap,
      patentes,
      software,
      equipamientos,
      financiamientos,
    });
  }

  async getReporteInvestigador(
    idInvestigador: string,
  ): Promise<ReporteInvestigadorIntegral> {
    const investigador = assertInvestigadorEncontrado(
      await this.integralRepo.findInvestigador(idInvestigador),
    );
    const maestros = await this.loadMaestrosIntegral();
    const input = await this.buildInvestigadorInput(maestros, investigador);
    return buildReporteInvestigadorIntegral(input);
  }

  async getReportesInvestigadores(): Promise<ReporteInvestigadorIntegral[]> {
    const [maestros, investigadoresActivos] = await Promise.all([
      this.loadMaestrosIntegral(),
      this.exportRepo.listInvestigadoresActivos(),
    ]);

    const inputs: ReporteInvestigadorInput[] = [];
    for (const investigador of investigadoresActivos) {
      inputs.push(await this.buildInvestigadorInput(maestros, investigador));
    }
    return buildReportesInvestigadoresIntegral(inputs);
  }

  // ===============================================================
  // Privados
  // ===============================================================

  private async loadMaestrosIntegral(): Promise<MaestrosIntegral> {
    const [catalogoMap, grados, grupos, personas, investigadores, proyectos, participaciones] =
      await Promise.all([
        this.exportRepo.loadCatalogoMap(),
        this.exportRepo.loadGradosMap(),
        this.exportRepo.loadGruposMap(),
        this.exportRepo.loadPersonasMap(),
        this.exportRepo.loadInvestigadoresMap(),
        this.exportRepo.loadProyectosMap(),
        this.exportRepo.listParticipaciones(),
      ]);
    return {
      catalogoMap,
      grados,
      grupos,
      personas,
      investigadores,
      proyectos,
      participaciones,
    };
  }

  private async loadPublicacionesCount(
    idsPersona: string[],
  ): Promise<Map<string, number>> {
    const unicos = Array.from(new Set(idsPersona));
    const counts = await Promise.all(
      unicos.map((id) => this.integralRepo.countPublicacionesByPersona(id)),
    );
    return new Map(unicos.map((id, idx) => [id, counts[idx] ?? 0]));
  }

  /**
   * Carga los datos especificos de un investigador para su reporte integral.
   * Los maestros llegan precargados para que el endpoint de lote no repita
   * las 7 queries compartidas por cada investigador.
   */
  private async buildInvestigadorInput(
    maestros: MaestrosIntegral,
    investigador: InvestigadorReporteDoc,
  ): Promise<ReporteInvestigadorInput> {
    const idInvestigador = investigador.id_investigador;
    const idPersona = investigador.id_persona;

    const proyectoIds = maestros.participaciones
      .filter((p) => p.id_investigador === idInvestigador)
      .map((p) => p.id_proyecto);

    const [idsPatente, idsPublicacion, idsFinanciamiento] = await Promise.all([
      this.integralRepo.listPatenteIdsByPersona(idPersona),
      this.integralRepo.listPublicacionIdsByPersona(idPersona),
      this.integralRepo.listFinanciamientoIdsByProyectos(proyectoIds),
    ]);

    const [patentes, software, publicaciones, equipamientos] = await Promise.all([
      this.integralRepo.listPatentesActivasByIds(idsPatente),
      this.integralRepo.listSoftwareByIds(idsPublicacion),
      this.integralRepo.listPublicacionesActivasByIds(idsPublicacion),
      this.integralRepo.listEquipamientosByFinanciamientos(idsFinanciamiento),
    ]);

    const recursosPorProyecto = await this.loadRecursosPorProyecto(
      proyectoIds.filter((id) => maestros.proyectos.has(id)),
    );

    return {
      investigador,
      grados: maestros.grados,
      grupos: maestros.grupos,
      personas: maestros.personas,
      catalogoMap: maestros.catalogoMap,
      investigadores: maestros.investigadores,
      proyectos: maestros.proyectos,
      todasParticipaciones: maestros.participaciones,
      recursosPorProyecto,
      patentes,
      software,
      equipamientos,
      publicaciones,
    };
  }

  private async loadRecursosPorProyecto(
    idsProyecto: string[],
  ): Promise<Map<string, RecursosProyectoResumen>> {
    const unicos = Array.from(new Set(idsProyecto));
    const resumenes = await Promise.all(
      unicos.map(async (id): Promise<RecursosProyectoResumen> => {
        const [patentes, software, equipamientos, financiamientos] = await Promise.all([
          this.integralRepo.countPatentesByProyecto(id),
          this.integralRepo.countSoftwareByProyecto(id),
          this.integralRepo.countEquipamientosByProyecto(id),
          this.integralRepo.countFinanciamientosByProyecto(id),
        ]);
        return { patentes, software, equipamientos, financiamientos };
      }),
    );
    const map = new Map<string, RecursosProyectoResumen>();
    unicos.forEach((id, idx) => {
      const resumen = resumenes[idx];
      if (resumen) map.set(id, resumen);
    });
    return map;
  }
}
