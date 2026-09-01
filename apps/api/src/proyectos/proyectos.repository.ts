import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

/**
 * Tipos de documento del dominio `proyectos`. 1:1 con los structs Rust
 * serializados en BSON (ver `docs/backend/07-inventario-rust-bloque-e.md`
 * §1.2). snake_case explicito (sin `rename_all`) para preservar el contrato
 * con el frontend durante la fase 1.
 */

export interface ProyectoDoc {
  id_proyecto: string;
  titulo_proyecto: string;
  codigo: string | null;
  activo: number;
  created_at: number | null;
  updated_at: number | null;
  campo_ocde: string | null;
  programas_relacionados: string[];
  tipo_actividad_ocde: string | null;
  ambito_geografico: string | null;
  estado_concytec: string | null;
  tematica_ambiental: string | null;
  tematica_salud: string | null;
  perucris_uuid: string | null;
}

export interface ParticipacionDoc {
  /** `_id` compuesto `{id_proyecto}:{id_investigador}` */
  _id: string;
  id_proyecto: string;
  id_investigador: string;
  rol: string;
  id_org_unit_afiliacion: string | null;
  horas_dedicacion_semanal: number | null;
  es_responsable: boolean;
}

export interface ProyectoOrganizacionDoc {
  _id: string;
  id_proyecto: string;
  id_org_unit: string;
  rol: string;
}

export interface ProyectoFinanciamientoDoc {
  _id: string;
  id_proyecto: string;
  id_financiamiento: string;
  monto_asignado: number | null;
  /** ISO 4217 uppercase (default PEN). */
  moneda: string;
}

export interface ProyectoListFilter {
  /**
   * Si se pasa, restringe los proyectos a los IDs del array (incluso vacio
   * — equivalente a "sin resultados"). Si se omite, lista todos los
   * proyectos activos. Usado por el filtro de responsable_proyecto en el
   * service (resuelve primero los IDs via participaciones).
   */
  restrictToIds?: string[];
}

/**
 * Shape ligero de campos OCDE solo para el cascade. No se acopla al modulo
 * `ocde` para evitar una dependencia circular durante el corte de E1.
 */
interface EntityOcdeFieldDoc {
  entity_type: string;
  entity_id: string;
}

@Injectable()
export class ProyectosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get proyectos(): Collection<ProyectoDoc> {
    return this.db.collection<ProyectoDoc>("proyectos");
  }

  private get participaciones(): Collection<ParticipacionDoc> {
    return this.db.collection<ParticipacionDoc>("participaciones");
  }

  private get proyectoOrganizaciones(): Collection<ProyectoOrganizacionDoc> {
    return this.db.collection<ProyectoOrganizacionDoc>("proyecto_organizaciones");
  }

  private get proyectoFinanciamientos(): Collection<ProyectoFinanciamientoDoc> {
    return this.db.collection<ProyectoFinanciamientoDoc>("proyecto_financiamientos");
  }

  private get patentes(): Collection<{ proyecto_id?: string | null }> {
    return this.db.collection<{ proyecto_id?: string | null }>("patentes");
  }

  private get entityOcdeFields(): Collection<EntityOcdeFieldDoc> {
    return this.db.collection<EntityOcdeFieldDoc>("entity_ocde_fields");
  }

  // ----- proyectos -----

  async insertProyecto(
    doc: ProyectoDoc,
    session?: ClientSession,
  ): Promise<void> {
    await this.proyectos.insertOne(doc, session ? { session } : undefined);
  }

  async findProyectoById(id: string): Promise<ProyectoDoc | null> {
    return this.proyectos.findOne({ id_proyecto: id });
  }

  async listAllProyectosActivos(
    filter: ProyectoListFilter = {},
  ): Promise<ProyectoDoc[]> {
    return this.proyectos
      .find(buildActiveFilter(filter))
      .sort({ titulo_proyecto: 1 })
      .toArray();
  }

  async listProyectosPaginated(
    page: number,
    limit: number,
    filter: ProyectoListFilter = {},
  ): Promise<{ items: ProyectoDoc[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const queryFilter = buildActiveFilter(filter);
    const [items, total] = await Promise.all([
      this.proyectos
        .find(queryFilter)
        .sort({ titulo_proyecto: 1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .toArray(),
      this.proyectos.countDocuments(queryFilter),
    ]);
    return { items, total };
  }

  async findProyectosIdsComoResponsable(
    idInvestigador: string,
  ): Promise<string[]> {
    const docs = await this.participaciones
      .find({ id_investigador: idInvestigador, es_responsable: true })
      .project<{ id_proyecto: string }>({ id_proyecto: 1 })
      .toArray();
    return Array.from(new Set(docs.map((d) => d.id_proyecto)));
  }

  /**
   * Variante de la anterior sin filtro `es_responsable`: lista todos los
   * proyectos donde el investigador participa (cualquier rol). Usado por
   * `GET /investigadores/:id/proyectos` para replicar 1:1 el comportamiento
   * del comando Rust `buscar_proyectos_por_investigador`
   * (ver `apps/desktop/src-tauri/src/proyectos/repository_queries.rs:46-83`).
   */
  async findProyectosIdsComoParticipante(
    idInvestigador: string,
  ): Promise<string[]> {
    const docs = await this.participaciones
      .find({ id_investigador: idInvestigador })
      .project<{ id_proyecto: string }>({ id_proyecto: 1 })
      .toArray();
    return Array.from(new Set(docs.map((d) => d.id_proyecto)));
  }

  async setProyectoTitulo(
    id: string,
    titulo: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.proyectos.updateOne(
      { id_proyecto: id },
      { $set: { titulo_proyecto: titulo, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  async setProyectoActivo(
    id: string,
    activo: 0 | 1,
    session?: ClientSession,
  ): Promise<void> {
    await this.proyectos.updateOne(
      { id_proyecto: id },
      { $set: { activo, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  async ensureProyectoExists(id: string): Promise<void> {
    const doc = await this.proyectos.findOne(
      { id_proyecto: id },
      { projection: { _id: 1 } },
    );
    if (!doc) {
      throw new Error(`Proyecto ${id} no encontrado.`);
    }
  }

  // ----- participaciones -----

  async insertParticipaciones(
    docs: ParticipacionDoc[],
    session?: ClientSession,
  ): Promise<void> {
    if (docs.length === 0) return;
    await this.participaciones.insertMany(docs, session ? { session } : undefined);
  }

  async deleteParticipacionesByProyecto(
    idProyecto: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.participaciones.deleteMany(
      { id_proyecto: idProyecto },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  async deleteParticipacionByIds(
    idProyecto: string,
    idInvestigador: string,
  ): Promise<number> {
    const res = await this.participaciones.deleteOne({
      _id: `${idProyecto}:${idInvestigador}`,
    });
    return res.deletedCount ?? 0;
  }

  async countParticipacionesByProyecto(idProyecto: string): Promise<number> {
    return this.participaciones.countDocuments({ id_proyecto: idProyecto });
  }

  async listParticipacionesByProyecto(
    idProyecto: string,
  ): Promise<ParticipacionDoc[]> {
    return this.participaciones.find({ id_proyecto: idProyecto }).toArray();
  }

  // ----- pivots: proyecto_organizaciones -----

  async insertProyectoOrganizacion(
    doc: ProyectoOrganizacionDoc,
    session?: ClientSession,
  ): Promise<void> {
    await this.proyectoOrganizaciones.insertOne(
      doc,
      session ? { session } : undefined,
    );
  }

  async listProyectoOrganizacionesByProyecto(
    idProyecto: string,
  ): Promise<ProyectoOrganizacionDoc[]> {
    return this.proyectoOrganizaciones.find({ id_proyecto: idProyecto }).toArray();
  }

  async deleteProyectoOrganizacionById(
    idPivot: string,
    idProyecto: string,
  ): Promise<number> {
    const res = await this.proyectoOrganizaciones.deleteOne({
      _id: idPivot,
      id_proyecto: idProyecto,
    });
    return res.deletedCount ?? 0;
  }

  async deleteProyectoOrganizacionesByProyecto(
    idProyecto: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.proyectoOrganizaciones.deleteMany(
      { id_proyecto: idProyecto },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- pivots: proyecto_financiamientos -----

  async insertProyectoFinanciamiento(
    doc: ProyectoFinanciamientoDoc,
    session?: ClientSession,
  ): Promise<void> {
    await this.proyectoFinanciamientos.insertOne(
      doc,
      session ? { session } : undefined,
    );
  }

  async listProyectoFinanciamientosByProyecto(
    idProyecto: string,
  ): Promise<ProyectoFinanciamientoDoc[]> {
    return this.proyectoFinanciamientos.find({ id_proyecto: idProyecto }).toArray();
  }

  async deleteProyectoFinanciamientoById(
    idPivot: string,
    idProyecto: string,
  ): Promise<number> {
    const res = await this.proyectoFinanciamientos.deleteOne({
      _id: idPivot,
      id_proyecto: idProyecto,
    });
    return res.deletedCount ?? 0;
  }

  async deleteProyectoFinanciamientosByProyecto(
    idProyecto: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.proyectoFinanciamientos.deleteMany(
      { id_proyecto: idProyecto },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- cascades de eliminacion -----

  /** Soft-delete (`activo: 0`) de todas las patentes vinculadas al proyecto. */
  async softDeletePatentesByProyecto(
    idProyecto: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.patentes.updateMany(
      { proyecto_id: idProyecto },
      { $set: { activo: 0, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
    return res.modifiedCount ?? 0;
  }

  /**
   * Hard-delete de los campos OCDE del proyecto. Acepta ambos formatos de
   * `entity_type` que pueden coexistir en la BD durante la transicion:
   * `proyecto` (NestJS, usado por `OcdeService`) y `PROJECT` (Rust legacy).
   * Ver `docs/backend/07-inventario-rust-bloque-e.md` D5/D7.
   */
  async deleteEntityOcdeFieldsByProyecto(
    idProyecto: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.entityOcdeFields.deleteMany(
      {
        $or: [
          { entity_type: "proyecto", entity_id: idProyecto },
          { entity_type: "PROJECT", entity_id: idProyecto },
        ],
      },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }
}

function buildActiveFilter(
  filter: ProyectoListFilter,
): Record<string, unknown> {
  const base: Record<string, unknown> = { activo: 1 };
  if (filter.restrictToIds !== undefined) {
    base.id_proyecto = { $in: filter.restrictToIds };
  }
  return base;
}
