/**
 * Repository del dominio `publicaciones` (coleccion `publicaciones_cientificas`
 * + pivot `publicacion_autores`). snake_case explicito para preservar el
 * contrato de BD con el frontend durante fase 1.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, Collection, Db } from "mongodb";
import { AppError } from "../infra/errors/app-error";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { DEFAULT_DOMINIO_ORIGEN, type PublicacionDominioOrigen } from "./vocab";

export interface PublicacionDoc {
  id_publicacion: string;
  titulo: string;
  doi: string | null;
  issn: string | null;
  anio: number | null;
  cuartil: string | null;
  tipo: string;
  resumen: string | null;
  palabras_clave: string[];
  created_at: number | null;
  updated_at: number | null;
  activo: number;
  handle_url: string | null;
  fecha_publicacion: string | null;
  editorial: string | null;
  id_org_unit_editora: string | null;
  revista_titulo: string | null;
  isbn: string | null;
  scimago_cuartil: string | null;
  wos_cuartil: string | null;
  es_revisado_por_pares: boolean;
  acceso_abierto: string | null;
  idioma: string | null;
  volumen: string | null;
  numero_issue: string | null;
  paginas: string | null;
  dominio_origen: PublicacionDominioOrigen;
  pure_uuid: string | null;
  estado_publicacion: string | null;
  id_proyecto: string | null;
  perucris_uuid: string | null;
}

export interface PublicacionAutorDoc {
  id: string;
  id_publicacion: string;
  id_persona: string;
  id_org_unit_afiliacion: string | null;
  orden: number;
  es_autor_correspondiente: boolean;
}

@Injectable()
export class PublicacionesRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get publicaciones(): Collection<PublicacionDoc> {
    return this.db.collection<PublicacionDoc>("publicaciones_cientificas");
  }
  private get publicacionAutores(): Collection<PublicacionAutorDoc> {
    return this.db.collection<PublicacionAutorDoc>("publicacion_autores");
  }
  private get proyectos(): Collection<{ id_proyecto: string }> {
    return this.db.collection<{ id_proyecto: string }>("proyectos");
  }
  private get personas(): Collection<{ id_persona: string }> {
    return this.db.collection<{ id_persona: string }>("personas");
  }
  private get orgUnits(): Collection<{ id_org_unit: string }> {
    return this.db.collection<{ id_org_unit: string }>("org_units");
  }

  // ----- CRUD publicaciones -----

  async insertPublicacion(doc: PublicacionDoc): Promise<void> {
    await this.publicaciones.insertOne(doc);
  }

  async findPublicacionById(id: string): Promise<PublicacionDoc | null> {
    return this.publicaciones.findOne({ id_publicacion: id });
  }

  async findPublicacionByDoi(doi: string): Promise<PublicacionDoc | null> {
    return this.publicaciones.findOne({ doi });
  }

  async listPublicaciones(filter: { anio?: number } = {}): Promise<PublicacionDoc[]> {
    const query: Record<string, unknown> = { activo: 1 };
    if (filter.anio != null) query.anio = filter.anio;
    return this.publicaciones.find(query).toArray();
  }

  async updatePublicacion(
    id: string,
    set: Partial<PublicacionDoc>,
    session?: ClientSession,
  ): Promise<void> {
    await this.publicaciones.updateOne(
      { id_publicacion: id },
      { $set: { ...set, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  async setPublicacionActivo(
    id: string,
    activo: 0 | 1,
    session?: ClientSession,
  ): Promise<void> {
    await this.publicaciones.updateOne(
      { id_publicacion: id },
      { $set: { activo, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  // ----- pivot publicacion_autores -----

  async insertPublicacionAutor(doc: PublicacionAutorDoc): Promise<void> {
    await this.publicacionAutores.insertOne(doc);
  }

  async findPublicacionAutorById(idPivot: string): Promise<PublicacionAutorDoc | null> {
    return this.publicacionAutores.findOne({ id: idPivot });
  }

  async listPublicacionAutores(idPublicacion: string): Promise<PublicacionAutorDoc[]> {
    return this.publicacionAutores
      .find({ id_publicacion: idPublicacion })
      .sort({ orden: 1 })
      .toArray();
  }

  async deletePublicacionAutorById(idPivot: string, idPublicacion: string): Promise<number> {
    const res = await this.publicacionAutores.deleteOne({
      id: idPivot,
      id_publicacion: idPublicacion,
    });
    return res.deletedCount ?? 0;
  }

  async deletePublicacionAutoresByPublicacion(
    idPublicacion: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.publicacionAutores.deleteMany(
      { id_publicacion: idPublicacion },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- FK checks (404) -----

  async ensurePublicacionExists(id: string): Promise<void> {
    const doc = await this.publicaciones.findOne(
      { id_publicacion: id },
      { projection: { _id: 1 } },
    );
    if (!doc) throw AppError.notFound("Publicacion no encontrada.");
  }

  async ensureProyectoExists(id: string): Promise<void> {
    const doc = await this.proyectos.findOne(
      { id_proyecto: id },
      { projection: { _id: 1 } },
    );
    if (!doc) throw AppError.notFound("Proyecto no encontrado.");
  }

  async ensurePersonaExists(id: string): Promise<void> {
    const doc = await this.personas.findOne(
      { id_persona: id },
      { projection: { _id: 1 } },
    );
    if (!doc) throw AppError.notFound("Persona no encontrada.");
  }

  async ensureOrgUnitExists(id: string): Promise<void> {
    const doc = await this.orgUnits.findOne(
      { id_org_unit: id },
      { projection: { _id: 1 } },
    );
    if (!doc) throw AppError.notFound("Unidad organizativa no encontrada.");
  }

  // ----- getters cruzados -----

  /**
   * Resuelve el `id_persona` del investigador (None si no existe o no tiene
   * vinculo a una persona). El investigador es `persona + meta`; si no hay
   * persona, no hay pivots posibles (D3 contrato).
   */
  async findPersonaIdByInvestigador(idInvestigador: string): Promise<string | null> {
    const inv = await this.db
      .collection<{ id_investigador: string; id_persona?: string }>("investigadores")
      .findOne({ id_investigador: idInvestigador });
    return inv?.id_persona?.trim() ?? null;
  }

  async listPublicacionIdsByPersona(idPersona: string): Promise<string[]> {
    const docs = await this.publicacionAutores
      .find({ id_persona: idPersona }, { projection: { id_publicacion: 1 } })
      .toArray();
    return Array.from(new Set(docs.map((d) => d.id_publicacion)));
  }

  async listPublicacionesByIds(ids: string[]): Promise<PublicacionDoc[]> {
    if (ids.length === 0) return [];
    return this.publicaciones.find({ id_publicacion: { $in: ids }, activo: 1 }).toArray();
  }

  async listSoftwareByProyecto(idProyecto: string): Promise<PublicacionDoc[]> {
    return this.publicaciones
      .find({ id_proyecto: idProyecto, tipo: "software", activo: 1 })
      .toArray();
  }
}

// Reference only — evita warnings de "unused export" en caso de tree-shaking.
void DEFAULT_DOMINIO_ORIGEN;