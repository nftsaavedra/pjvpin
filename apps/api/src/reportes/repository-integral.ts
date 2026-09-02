/**
 * Repositorio de los 3 reportes integrales (`GET /reportes/integral/*`).
 *
 * Port de `apps/desktop/src-tauri/src/reportes/repository_proyecto.rs`,
 * `repository_investigador.rs` y `repository_export.rs`. Solo acceso a datos:
 * el armado de los DTOs anidados vive en `reportes.logic.ts` (SRP).
 *
 * Cadenas 3NF/CERIF replicadas del Rust:
 *   - patentes de un proyecto      -> `patentes.proyecto_id` (FK conservada, D10)
 *   - patentes de un investigador  -> pivot `patente_inventores` (`activo = 1`)
 *   - software de un proyecto      -> `publicaciones_cientificas.id_proyecto`
 *   - software de un investigador  -> pivot `publicacion_autores`
 *   - equipamientos de un proyecto -> `proyecto_financiamientos` ->
 *                                     `financiamientos` -> `id_financiamiento`
 *   - financiamientos de un proyecto -> pivot `proyecto_financiamientos`
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { PUBLICACION_TIPO_SOFTWARE } from "./reportes.logic";
import type {
  EquipamientoReporteDoc,
  FinanciamientoReporteDoc,
  InvestigadorReporteDoc,
  ParticipacionReporteDoc,
  PatenteReporteDoc,
  ProyectoReporteDoc,
  PublicacionReporteDoc,
} from "./reportes.docs";

@Injectable()
export class ReportesIntegralRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get proyectos(): Collection<ProyectoReporteDoc> {
    return this.db.collection<ProyectoReporteDoc>("proyectos");
  }
  private get participaciones(): Collection<ParticipacionReporteDoc> {
    return this.db.collection<ParticipacionReporteDoc>("participaciones");
  }
  private get investigadores(): Collection<InvestigadorReporteDoc> {
    return this.db.collection<InvestigadorReporteDoc>("investigadores");
  }
  private get patentes(): Collection<PatenteReporteDoc> {
    return this.db.collection<PatenteReporteDoc>("patentes");
  }
  private get equipamientos(): Collection<EquipamientoReporteDoc> {
    return this.db.collection<EquipamientoReporteDoc>("equipamientos");
  }
  private get financiamientos(): Collection<FinanciamientoReporteDoc> {
    return this.db.collection<FinanciamientoReporteDoc>("financiamientos");
  }
  private get publicaciones(): Collection<PublicacionReporteDoc> {
    return this.db.collection<PublicacionReporteDoc>("publicaciones_cientificas");
  }
  private get patenteInventores(): Collection<{ id_patente: string; id_persona: string }> {
    return this.db.collection<{ id_patente: string; id_persona: string }>(
      "patente_inventores",
    );
  }
  private get publicacionAutores(): Collection<{
    id_publicacion: string;
    id_persona: string;
  }> {
    return this.db.collection<{ id_publicacion: string; id_persona: string }>(
      "publicacion_autores",
    );
  }
  private get proyectoFinanciamientos(): Collection<{
    id_proyecto: string;
    id_financiamiento: string;
  }> {
    return this.db.collection<{ id_proyecto: string; id_financiamiento: string }>(
      "proyecto_financiamientos",
    );
  }

  // ---------------------------------------------------------------
  // Entidades raiz
  // ---------------------------------------------------------------

  async findProyecto(idProyecto: string): Promise<ProyectoReporteDoc | null> {
    return this.proyectos.findOne({ id_proyecto: idProyecto });
  }

  async findInvestigador(
    idInvestigador: string,
  ): Promise<InvestigadorReporteDoc | null> {
    return this.investigadores.findOne({ id_investigador: idInvestigador });
  }

  async listParticipacionesByProyecto(
    idProyecto: string,
  ): Promise<ParticipacionReporteDoc[]> {
    return this.participaciones.find({ id_proyecto: idProyecto }).toArray();
  }

  async listInvestigadoresByIds(ids: string[]): Promise<InvestigadorReporteDoc[]> {
    if (ids.length === 0) return [];
    return this.investigadores.find({ id_investigador: { $in: ids } }).toArray();
  }

  // ---------------------------------------------------------------
  // Conteos
  // ---------------------------------------------------------------

  async countPublicacionesByPersona(idPersona: string): Promise<number> {
    return this.publicacionAutores.countDocuments({ id_persona: idPersona });
  }

  async countPatentesByProyecto(idProyecto: string): Promise<number> {
    return this.patentes.countDocuments({ proyecto_id: idProyecto });
  }

  async countSoftwareByProyecto(idProyecto: string): Promise<number> {
    return this.publicaciones.countDocuments({
      id_proyecto: idProyecto,
      tipo: PUBLICACION_TIPO_SOFTWARE,
    });
  }

  async countFinanciamientosByProyecto(idProyecto: string): Promise<number> {
    return this.proyectoFinanciamientos.countDocuments({ id_proyecto: idProyecto });
  }

  /**
   * Equipamientos vinculados a un proyecto. El Rust legacy contaba
   * `equipamientos.proyecto_id`, campo ELIMINADO por D10; se usa la misma
   * cadena de financiamiento que ya emplea el listado del reporte integral,
   * evitando que el conteo quede permanentemente en 0.
   */
  async countEquipamientosByProyecto(idProyecto: string): Promise<number> {
    const idsFinanciamiento = await this.listFinanciamientoIdsByProyectos([idProyecto]);
    if (idsFinanciamiento.length === 0) return 0;
    return this.equipamientos.countDocuments({
      id_financiamiento: { $in: idsFinanciamiento },
      activo: 1,
    });
  }

  // ---------------------------------------------------------------
  // Recursos por proyecto
  // ---------------------------------------------------------------

  async listPatentesByProyecto(idProyecto: string): Promise<PatenteReporteDoc[]> {
    return this.patentes.find({ proyecto_id: idProyecto }).toArray();
  }

  async listSoftwareByProyecto(idProyecto: string): Promise<PublicacionReporteDoc[]> {
    return this.publicaciones
      .find({ id_proyecto: idProyecto, tipo: PUBLICACION_TIPO_SOFTWARE })
      .toArray();
  }

  async listFinanciamientoIdsByProyectos(idsProyecto: string[]): Promise<string[]> {
    if (idsProyecto.length === 0) return [];
    const docs = await this.proyectoFinanciamientos
      .find({ id_proyecto: { $in: idsProyecto } })
      .toArray();
    return docs.map((d) => d.id_financiamiento);
  }

  async listEquipamientosByFinanciamientos(
    idsFinanciamiento: string[],
  ): Promise<EquipamientoReporteDoc[]> {
    if (idsFinanciamiento.length === 0) return [];
    return this.equipamientos
      .find({ id_financiamiento: { $in: idsFinanciamiento }, activo: 1 })
      .toArray();
  }

  async listFinanciamientosByIds(
    idsFinanciamiento: string[],
  ): Promise<FinanciamientoReporteDoc[]> {
    if (idsFinanciamiento.length === 0) return [];
    return this.financiamientos
      .find({ id_financiamiento: { $in: idsFinanciamiento }, activo: 1 })
      .toArray();
  }

  // ---------------------------------------------------------------
  // Recursos por investigador (via pivots)
  // ---------------------------------------------------------------

  async listPatenteIdsByPersona(idPersona: string): Promise<string[]> {
    const docs = await this.patenteInventores.find({ id_persona: idPersona }).toArray();
    return docs.map((d) => d.id_patente);
  }

  async listPatentesActivasByIds(ids: string[]): Promise<PatenteReporteDoc[]> {
    if (ids.length === 0) return [];
    return this.patentes.find({ id_patente: { $in: ids }, activo: 1 }).toArray();
  }

  async listPublicacionIdsByPersona(idPersona: string): Promise<string[]> {
    const docs = await this.publicacionAutores
      .find({ id_persona: idPersona })
      .toArray();
    return docs.map((d) => d.id_publicacion);
  }

  async listSoftwareByIds(ids: string[]): Promise<PublicacionReporteDoc[]> {
    if (ids.length === 0) return [];
    return this.publicaciones
      .find({ id_publicacion: { $in: ids }, tipo: PUBLICACION_TIPO_SOFTWARE })
      .toArray();
  }

  async listPublicacionesActivasByIds(ids: string[]): Promise<PublicacionReporteDoc[]> {
    if (ids.length === 0) return [];
    return this.publicaciones
      .find({ id_publicacion: { $in: ids }, activo: 1 })
      .toArray();
  }
}
