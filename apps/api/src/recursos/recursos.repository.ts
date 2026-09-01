import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { AppError } from "../infra/errors/app-error";
import { OCDE_ENTITY_TYPES_PATENTE } from "./vocab";

/**
 * Tipos de documento del dominio `recursos`. 1:1 con los structs Rust
 * serializados en BSON (ver `docs/backend/07-inventario-rust-bloque-e.md`
 * §2.2). snake_case explicito (sin `rename_all`) para preservar el contrato
 * con el frontend durante la fase 1.
 */

export interface PatenteDoc {
  id_patente: string;
  proyecto_id: string | null;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  descripcion: string | null;
  clasificacion_ipc: string | null;
  id_org_unit_concedente: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: number;
}

export interface EquipamientoDoc {
  id_equipamiento: string;
  nombre: string;
  descripcion: string | null;
  especificaciones: string | null;
  proveedor: string | null;
  moneda: string | null;
  valor_estimado: number | null;
  fecha_adquisicion: number | null;
  codigo_institucional: string | null;
  tipo_equipamiento: string | null;
  uso_equipamiento: string | null;
  id_org_unit_propietaria: string | null;
  id_financiamiento: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: number;
}

export interface FinanciamientoDoc {
  id_financiamiento: string;
  codigo: string;
  nombre: string | null;
  modalidad: string | null;
  id_org_unit_financiadora: string | null;
  parent_id: string | null;
  tipo: string | null;
  monto: number | null;
  moneda: string | null;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  descripcion: string | null;
  estado_financiero: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: number;
}

export interface PatenteInventorDoc {
  _id: string;
  id_patente: string;
  id_persona: string;
  orden: number;
}

export interface PatenteTitularDoc {
  _id: string;
  id_patente: string;
  holder_type: "ORG_UNIT" | "PERSON";
  id_org_unit: string | null;
  id_persona: string | null;
  orden: number;
}

interface EntityOcdeFieldDoc {
  entity_type: string;
  entity_id: string;
}

@Injectable()
export class RecursosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get patentes(): Collection<PatenteDoc> {
    return this.db.collection<PatenteDoc>("patentes");
  }
  private get equipamientos(): Collection<EquipamientoDoc> {
    return this.db.collection<EquipamientoDoc>("equipamientos");
  }
  private get financiamientos(): Collection<FinanciamientoDoc> {
    return this.db.collection<FinanciamientoDoc>("financiamientos");
  }
  private get patenteInventores(): Collection<PatenteInventorDoc> {
    return this.db.collection<PatenteInventorDoc>("patente_inventores");
  }
  private get patenteTitulares(): Collection<PatenteTitularDoc> {
    return this.db.collection<PatenteTitularDoc>("patente_titulares");
  }
  private get entityOcdeFields(): Collection<EntityOcdeFieldDoc> {
    return this.db.collection<EntityOcdeFieldDoc>("entity_ocde_fields");
  }
  private get participaciones(): Collection<{ id_proyecto: string; id_investigador: string; es_responsable: boolean }> {
    return this.db.collection<{ id_proyecto: string; id_investigador: string; es_responsable: boolean }>("participaciones");
  }
  private get proyectoFinanciamientos(): Collection<{ id_proyecto: string; id_financiamiento: string }> {
    return this.db.collection<{ id_proyecto: string; id_financiamiento: string }>("proyecto_financiamientos");
  }

  // ----- patentes -----

  async insertPatente(doc: PatenteDoc): Promise<void> {
    await this.patentes.insertOne(doc);
  }

  async findPatenteById(id: string): Promise<PatenteDoc | null> {
    return this.patentes.findOne({ id_patente: id });
  }

  async findPatenteByNumero(numero: string): Promise<PatenteDoc | null> {
    return this.patentes.findOne({ numero_patente: numero });
  }

  async listPatentesByProyecto(proyectoId: string): Promise<PatenteDoc[]> {
    return this.patentes
      .find({ proyecto_id: proyectoId, activo: 1 })
      .sort({ titulo: 1 })
      .toArray();
  }

  async updatePatente(
    id: string,
    set: Partial<PatenteDoc>,
    session?: ClientSession,
  ): Promise<void> {
    await this.patentes.updateOne(
      { id_patente: id },
      { $set: { ...set, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  async setPatenteActivo(
    id: string,
    activo: 0 | 1,
    session?: ClientSession,
  ): Promise<void> {
    await this.patentes.updateOne(
      { id_patente: id },
      { $set: { activo, updated_at: Date.now() } },
      session ? { session } : undefined,
    );
  }

  // ----- equipamientos -----

  async insertEquipamiento(doc: EquipamientoDoc): Promise<void> {
    await this.equipamientos.insertOne(doc);
  }

  async findEquipamientoById(id: string): Promise<EquipamientoDoc | null> {
    return this.equipamientos.findOne({ id_equipamiento: id });
  }

  async findEquipamientoByCodigo(codigo: string): Promise<EquipamientoDoc | null> {
    return this.equipamientos.findOne({ codigo_institucional: codigo });
  }

  async listEquipamientosByFinanciamientos(
    idFinanciamientos: string[],
  ): Promise<EquipamientoDoc[]> {
    if (idFinanciamientos.length === 0) return [];
    return this.equipamientos
      .find({ id_financiamiento: { $in: idFinanciamientos }, activo: 1 })
      .sort({ nombre: 1 })
      .toArray();
  }

  async updateEquipamiento(
    id: string,
    set: Partial<EquipamientoDoc>,
  ): Promise<void> {
    await this.equipamientos.updateOne(
      { id_equipamiento: id },
      { $set: { ...set, updated_at: Date.now() } },
    );
  }

  async setEquipamientoActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.equipamientos.updateOne(
      { id_equipamiento: id },
      { $set: { activo, updated_at: Date.now() } },
    );
  }

  // ----- financiamientos -----

  async insertFinanciamiento(doc: FinanciamientoDoc): Promise<void> {
    await this.financiamientos.insertOne(doc);
  }

  async findFinanciamientoById(id: string): Promise<FinanciamientoDoc | null> {
    return this.financiamientos.findOne({ id_financiamiento: id });
  }

  async updateFinanciamiento(
    id: string,
    set: Partial<FinanciamientoDoc>,
  ): Promise<void> {
    await this.financiamientos.updateOne(
      { id_financiamiento: id },
      { $set: { ...set, updated_at: Date.now() } },
    );
  }

  async setFinanciamientoActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.financiamientos.updateOne(
      { id_financiamiento: id },
      { $set: { activo, updated_at: Date.now() } },
    );
  }

  async listFinanciamientosByIds(ids: string[]): Promise<FinanciamientoDoc[]> {
    if (ids.length === 0) return [];
    return this.financiamientos
      .find({ id_financiamiento: { $in: ids }, activo: 1 })
      .sort({ codigo: 1 })
      .toArray();
  }

  // ----- pivots: patente_inventores -----

  async insertPatenteInventor(doc: PatenteInventorDoc): Promise<void> {
    await this.patenteInventores.insertOne(doc);
  }

  async findPatenteInventorById(
    idPivot: string,
  ): Promise<PatenteInventorDoc | null> {
    return this.patenteInventores.findOne({ _id: idPivot });
  }

  async listPatenteInventoresByPatente(
    idPatente: string,
  ): Promise<PatenteInventorDoc[]> {
    return this.patenteInventores
      .find({ id_patente: idPatente })
      .sort({ orden: 1 })
      .toArray();
  }

  async deletePatenteInventorById(
    idPivot: string,
    idPatente: string,
  ): Promise<number> {
    const res = await this.patenteInventores.deleteOne({
      _id: idPivot,
      id_patente: idPatente,
    });
    return res.deletedCount ?? 0;
  }

  async deletePatenteInventoresByPatente(
    idPatente: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.patenteInventores.deleteMany(
      { id_patente: idPatente },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- pivots: patente_titulares -----

  async insertPatenteTitular(doc: PatenteTitularDoc): Promise<void> {
    await this.patenteTitulares.insertOne(doc);
  }

  async findPatenteTitularById(
    idPivot: string,
  ): Promise<PatenteTitularDoc | null> {
    return this.patenteTitulares.findOne({ _id: idPivot });
  }

  async listPatenteTitularesByPatente(
    idPatente: string,
  ): Promise<PatenteTitularDoc[]> {
    return this.patenteTitulares
      .find({ id_patente: idPatente })
      .sort({ orden: 1 })
      .toArray();
  }

  async deletePatenteTitularById(
    idPivot: string,
    idPatente: string,
  ): Promise<number> {
    const res = await this.patenteTitulares.deleteOne({
      _id: idPivot,
      id_patente: idPatente,
    });
    return res.deletedCount ?? 0;
  }

  async deletePatenteTitularesByPatente(
    idPatente: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.patenteTitulares.deleteMany(
      { id_patente: idPatente },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- FK checks -----

  /**
   * Busca el id en la coleccion externa correspondiente por su PK publica
   * (`id_<entidad>`) o por `_id` (PK interna Mongo). Devuelve true si existe.
   */
  async entityExists(collection: string, id: string): Promise<boolean> {
    const camposId = [
      "id_proyecto",
      "id_org_unit",
      "id_financiamiento",
      "id_patente",
      "id_equipamiento",
      "id_grupo",
      "id_evento",
      "id_grado",
      "id_catalogo",
      "id_persona",
      "id_publicacion",
    ];
    const probe = await this.db
      .collection(collection)
      .findOne({ $or: camposId.map((c) => ({ [c]: id })) });
    return probe != null;
  }

  /**
   * Variante con tipo explicito: si se conoce la PK publica de la coleccion,
   * se busca solo por ese campo (mas eficiente y preciso). Se conserva
   * `entityExists` como fallback polimorfico para casos donde la PK varia.
   */
  async entityExistsByPublicId(
    collection: string,
    publicIdField: string,
    id: string,
  ): Promise<boolean> {
    const doc = await this.db
      .collection(collection)
      .findOne({ [publicIdField]: id }, { projection: { _id: 1 } });
    return doc != null;
  }

  // ----- proyectos_financiamientos (D4) -----

  async listFinanciamientoIdsByProyecto(proyectoId: string): Promise<string[]> {
    const docs = await this.proyectoFinanciamientos
      .find({ id_proyecto: proyectoId })
      .project<{ id_financiamiento: string }>({ id_financiamiento: 1 })
      .toArray();
    return Array.from(new Set(docs.map((d) => d.id_financiamiento)));
  }

  // ----- participaciones (filtro responsable) -----

  async countParticipacionesResponsable(
    idProyecto: string,
    idInvestigador: string,
  ): Promise<number> {
    return this.participaciones.countDocuments({
      id_proyecto: idProyecto,
      id_investigador: idInvestigador,
      es_responsable: true,
    });
  }

  // ----- cascades: eliminar_patente -----

  /**
   * Hard-delete de campos OCDE vinculados a la patente. Acepta ambos formatos
   * de `entity_type` que pueden coexistir en la BD durante la transicion:
   * `patente` (NestJS) y `PATENT` (Rust legacy). Mismo patron defensivo que
   * proyectos (D5/D7).
   */
  async deleteEntityOcdeFieldsByPatente(
    idPatente: string,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.entityOcdeFields.deleteMany(
      {
        $and: [
          { entity_id: idPatente },
          { entity_type: { $in: OCDE_ENTITY_TYPES_PATENTE as string[] } },
        ],
      },
      session ? { session } : undefined,
    );
    return res.deletedCount ?? 0;
  }

  // ----- ensureExists (404) -----

  async ensurePatenteExists(id: string): Promise<void> {
    if (!(await this.entityExistsByPublicId("patentes", "id_patente", id))) {
      throw AppError.notFound("Patente no encontrada.");
    }
  }

  async ensureProyectoExists(id: string): Promise<void> {
    if (!(await this.entityExistsByPublicId("proyectos", "id_proyecto", id))) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
  }
}
