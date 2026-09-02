/**
 * Repositorio de los 6 datasets de exportacion (`GET /reportes/export/*`).
 *
 * Port de `apps/desktop/src-tauri/src/proyectos/export_queries.rs` +
 * `shared::data_loader`. Solo acceso a datos: la transformacion vive en
 * `reportes.logic.ts` (SRP).
 *
 * Filtros `activo` replicados 1:1 del backend Rust:
 *   - `catalogos`      -> `activo = 1` (via `loadCatalogoMap`)
 *   - `investigadores` -> sin filtro en `loadInvestigadoresMap`; `activo = 1`
 *                         en `listInvestigadoresActivos` (`get_all_investigadores`)
 *   - `proyectos`      -> sin filtro en `loadProyectosMap`; `activo = 1` en
 *                         `listProyectosActivos`
 *   - `grados`/`grupos`/`personas`/`participaciones` -> sin filtro
 *   - `patentes`/`equipamientos`/`financiamientos`   -> sin filtro (dataset
 *                         de recursos lista todo, igual que el Rust)
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { loadCatalogoMap, type CatalogoMap } from "./catalogo.helper";
import { PUBLICACION_TIPO_SOFTWARE } from "./reportes.logic";
import type {
  EquipamientoReporteDoc,
  FinanciamientoReporteDoc,
  GradoReporteDoc,
  GrupoReporteDoc,
  InvestigadorReporteDoc,
  OrgUnitReporteDoc,
  ParticipacionReporteDoc,
  PatenteInventorReporteDoc,
  PatenteReporteDoc,
  PersonaReporteDoc,
  ProyectoFinanciamientoReporteDoc,
  ProyectoReporteDoc,
  PublicacionAutorReporteDoc,
  PublicacionReporteDoc,
} from "./reportes.docs";

@Injectable()
export class ReportesExportRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get grados(): Collection<GradoReporteDoc> {
    return this.db.collection<GradoReporteDoc>("grados");
  }
  private get grupos(): Collection<GrupoReporteDoc> {
    return this.db.collection<GrupoReporteDoc>("grupos_investigacion");
  }
  private get personas(): Collection<PersonaReporteDoc> {
    return this.db.collection<PersonaReporteDoc>("personas");
  }
  private get investigadores(): Collection<InvestigadorReporteDoc> {
    return this.db.collection<InvestigadorReporteDoc>("investigadores");
  }
  private get proyectos(): Collection<ProyectoReporteDoc> {
    return this.db.collection<ProyectoReporteDoc>("proyectos");
  }
  private get participaciones(): Collection<ParticipacionReporteDoc> {
    return this.db.collection<ParticipacionReporteDoc>("participaciones");
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
  private get patenteInventores(): Collection<PatenteInventorReporteDoc> {
    return this.db.collection<PatenteInventorReporteDoc>("patente_inventores");
  }
  private get publicacionAutores(): Collection<PublicacionAutorReporteDoc> {
    return this.db.collection<PublicacionAutorReporteDoc>("publicacion_autores");
  }
  private get proyectoFinanciamientos(): Collection<ProyectoFinanciamientoReporteDoc> {
    return this.db.collection<ProyectoFinanciamientoReporteDoc>(
      "proyecto_financiamientos",
    );
  }
  private get orgUnits(): Collection<OrgUnitReporteDoc> {
    return this.db.collection<OrgUnitReporteDoc>("org_units");
  }

  // ---------------------------------------------------------------
  // Catalogos y maestros
  // ---------------------------------------------------------------

  async loadCatalogoMap(): Promise<CatalogoMap> {
    return loadCatalogoMap(this.db);
  }

  async loadGradosMap(): Promise<Map<string, GradoReporteDoc>> {
    const docs = await this.grados.find({}).toArray();
    return new Map(docs.map((d) => [d.id_grado, d]));
  }

  async loadGruposMap(): Promise<Map<string, GrupoReporteDoc>> {
    const docs = await this.listGrupos();
    return new Map(docs.map((d) => [d.id_grupo, d]));
  }

  async listGrupos(): Promise<GrupoReporteDoc[]> {
    return this.grupos.find({}).toArray();
  }

  async loadPersonasMap(): Promise<Map<string, PersonaReporteDoc>> {
    const docs = await this.personas.find({}).toArray();
    return new Map(docs.map((d) => [d.id_persona, d]));
  }

  async listInvestigadores(): Promise<InvestigadorReporteDoc[]> {
    return this.investigadores.find({}).toArray();
  }

  async loadInvestigadoresMap(): Promise<Map<string, InvestigadorReporteDoc>> {
    const docs = await this.listInvestigadores();
    return new Map(docs.map((d) => [d.id_investigador, d]));
  }

  /** Port de `get_all_investigadores`: solo `activo = 1`. */
  async listInvestigadoresActivos(): Promise<InvestigadorReporteDoc[]> {
    return this.investigadores.find({ activo: 1 }).toArray();
  }

  async loadProyectosMap(): Promise<Map<string, ProyectoReporteDoc>> {
    const docs = await this.proyectos.find({}).toArray();
    return new Map(docs.map((d) => [d.id_proyecto, d]));
  }

  async listProyectosActivos(): Promise<ProyectoReporteDoc[]> {
    return this.proyectos.find({ activo: 1 }).toArray();
  }

  async listParticipaciones(): Promise<ParticipacionReporteDoc[]> {
    return this.participaciones.find({}).toArray();
  }

  // ---------------------------------------------------------------
  // Recursos
  // ---------------------------------------------------------------

  async listPatentes(): Promise<PatenteReporteDoc[]> {
    return this.patentes.find({}).toArray();
  }

  async listEquipamientos(): Promise<EquipamientoReporteDoc[]> {
    return this.equipamientos.find({}).toArray();
  }

  async listFinanciamientos(): Promise<FinanciamientoReporteDoc[]> {
    return this.financiamientos.find({}).toArray();
  }

  /** D5a: los "productos" son publicaciones con `tipo = software`. */
  async listSoftwarePublicaciones(): Promise<PublicacionReporteDoc[]> {
    return this.publicaciones.find({ tipo: PUBLICACION_TIPO_SOFTWARE }).toArray();
  }

  // ---------------------------------------------------------------
  // Pivots y auxiliares
  // ---------------------------------------------------------------

  async listPatenteInventores(): Promise<PatenteInventorReporteDoc[]> {
    return this.patenteInventores.find({}).toArray();
  }

  async listPublicacionAutores(): Promise<PublicacionAutorReporteDoc[]> {
    return this.publicacionAutores.find({}).toArray();
  }

  async listProyectoFinanciamientos(): Promise<ProyectoFinanciamientoReporteDoc[]> {
    return this.proyectoFinanciamientos.find({}).toArray();
  }

  async listOrgUnits(): Promise<OrgUnitReporteDoc[]> {
    return this.orgUnits.find({}).toArray();
  }
}
