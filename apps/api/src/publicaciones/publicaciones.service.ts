/**
 * Servicio del dominio `publicaciones` (12 REST + D7 + D8 + cascade pivot).
 *
 * Patrón audit: cada mutación llama `audit.writeGenericAudit` con event code
 * del doc 07 §3.1. E11000 sobre UNIQUE pivot {id_publicacion, id_persona} →
 * 409 (`AppError.unique`). D7: class-validator estricta en create Y update;
 * el service llama la lógica pura de validación para mensajes canónicos.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, MongoClient } from "mongodb";
import { MongoServerError } from "mongodb";
import { randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { MONGO_CLIENT } from "../infra/mongo/mongo.module";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import {
  CreatePublicacionDto,
  PublicacionDto,
  UpdatePublicacionDto,
} from "./dto/publicacion.dto";
import {
  PublicacionAutorDto,
  VincularAutorDto,
} from "./dto/pivot-autor.dto";
import {
  trimOrNull,
  validarAccesoAbierto,
  validarCuartil,
  validarDoi,
  validarDominioOrigen,
  validarIdioma,
  validarOrdenAutor,
  validarTipoPublicacion,
  validarTitulo,
} from "./publicaciones.logic";
import {
  type PublicacionAutorDoc,
  type PublicacionDoc,
  PublicacionesRepository,
} from "./publicaciones.repository";
import { DEFAULT_DOMINIO_ORIGEN, type PublicacionDominioOrigen } from "./vocab";

function esE11000(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}

@Injectable()
export class PublicacionesService {
  constructor(
    @Inject(MONGO_CLIENT) private readonly client: MongoClient,
    private readonly repo: PublicacionesRepository,
    private readonly audit: AuditService,
  ) {}

  private toAuditActor(actor: AuthenticatedUser): {
    id_usuario: string;
    username: string;
    rol: string;
  } {
    return {
      id_usuario: actor.id_usuario,
      username: actor.username,
      rol: actor.rol,
    };
  }

  private toPublicacionDto(doc: PublicacionDoc): PublicacionDto {
    return {
      id: doc.id_publicacion,
      id_publicacion: doc.id_publicacion,
      titulo: doc.titulo,
      doi: doc.doi,
      issn: doc.issn,
      anio: doc.anio,
      cuartil: doc.cuartil,
      tipo: doc.tipo,
      resumen: doc.resumen,
      palabras_clave: doc.palabras_clave ?? [],
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      activo: doc.activo,
      handle_url: doc.handle_url,
      fecha_publicacion: doc.fecha_publicacion,
      editorial: doc.editorial,
      id_org_unit_editora: doc.id_org_unit_editora,
      revista_titulo: doc.revista_titulo,
      isbn: doc.isbn,
      scimago_cuartil: doc.scimago_cuartil,
      wos_cuartil: doc.wos_cuartil,
      es_revisado_por_pares: doc.es_revisado_por_pares,
      acceso_abierto: doc.acceso_abierto,
      idioma: doc.idioma,
      volumen: doc.volumen,
      numero_issue: doc.numero_issue,
      paginas: doc.paginas,
      dominio_origen: doc.dominio_origen,
      pure_uuid: doc.pure_uuid,
      estado_publicacion: doc.estado_publicacion,
      id_proyecto: doc.id_proyecto,
      perucris_uuid: doc.perucris_uuid,
    };
  }

  private toPublicacionAutorDto(doc: PublicacionAutorDoc): PublicacionAutorDto {
    return {
      id: doc.id,
      id_publicacion: doc.id_publicacion,
      id_persona: doc.id_persona,
      id_org_unit_afiliacion: doc.id_org_unit_afiliacion,
      orden: doc.orden,
      es_autor_correspondiente: doc.es_autor_correspondiente,
    };
  }

  private async withTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = this.client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // CRUD publicaciones
  // ============================================================

  async create(input: CreatePublicacionDto, actor: AuthenticatedUser): Promise<PublicacionDto> {
    const titulo = validarTitulo(input.titulo);
    const tipo = validarTipoPublicacion(input.tipo);
    const doi = validarDoi(input.doi ?? null);
    const idioma = validarIdioma(input.idioma ?? null);
    const scimagoCuartil = validarCuartil(input.scimagoCuartil ?? null);
    const wosCuartil = validarCuartil(input.wosCuartil ?? null);
    const accesoAbierto = validarAccesoAbierto(input.accesoAbierto ?? null);
    const dominioOrigen = (validarDominioOrigen(input.dominioOrigen ?? null) ??
      DEFAULT_DOMINIO_ORIGEN) as PublicacionDominioOrigen;

    const idProyecto = trimOrNull(input.idProyecto);
    if (idProyecto) await this.repo.ensureProyectoExists(idProyecto);

    const idPublicacion = randomUUID();
    const now = Date.now();
    const doc: PublicacionDoc = {
      id_publicacion: idPublicacion,
      titulo,
      doi,
      issn: trimOrNull(input.issn),
      anio: input.anio ?? null,
      cuartil: trimOrNull(input.cuartil),
      tipo,
      resumen: trimOrNull(input.resumen),
      palabras_clave: input.palabrasClave ?? [],
      created_at: now,
      updated_at: now,
      activo: 1,
      handle_url: trimOrNull(input.handleUrl),
      fecha_publicacion: trimOrNull(input.fechaPublicacion),
      editorial: trimOrNull(input.editorial),
      id_org_unit_editora: trimOrNull(input.idOrgUnitEditora),
      revista_titulo: trimOrNull(input.revistaTitulo),
      isbn: trimOrNull(input.isbn),
      scimago_cuartil: scimagoCuartil,
      wos_cuartil: wosCuartil,
      es_revisado_por_pares: input.esRevisadoPorPares ?? true,
      acceso_abierto: accesoAbierto,
      idioma,
      volumen: trimOrNull(input.volumen),
      numero_issue: trimOrNull(input.numeroIssue),
      paginas: trimOrNull(input.paginas),
      dominio_origen: dominioOrigen,
      pure_uuid: trimOrNull(input.pureUuid),
      estado_publicacion: trimOrNull(input.estadoPublicacion),
      id_proyecto: idProyecto,
      perucris_uuid: trimOrNull(input.perucrisUuid),
    };

    try {
      await this.repo.insertPublicacion(doc);
    } catch (err) {
      if (esE11000(err)) {
        // UNIQUE {id_publicacion} (collision de uuid v4 es despreciable;
        // otro path UNIQUE seria {doi} partial o {pure_uuid} partial).
        throw AppError.unique("Ya existe una publicacion con ese identificador.");
      }
      throw err;
    }

    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.create",
      "publicacion",
      idPublicacion,
      JSON.stringify({ titulo, tipo, id_proyecto: idProyecto }),
    );
    return this.toPublicacionDto(doc);
  }

  async getAll(anio?: number): Promise<PublicacionDto[]> {
    const docs = await this.repo.listPublicaciones({ anio });
    return docs.map((d) => this.toPublicacionDto(d));
  }

  async getById(id: string): Promise<PublicacionDto> {
    const doc = await this.repo.findPublicacionById(id);
    if (!doc) throw AppError.notFound("Publicacion no encontrada.");
    return this.toPublicacionDto(doc);
  }

  async update(
    id: string,
    input: UpdatePublicacionDto,
    actor: AuthenticatedUser,
  ): Promise<PublicacionDto> {
    const existing = await this.repo.findPublicacionById(id);
    if (!existing) throw AppError.notFound("Publicacion no encontrada.");

    // D7: revalidar campos provistos (no acepta valor invalido, aunque BD tenga legacy).
    const set: Partial<PublicacionDoc> = {};
    if (input.titulo !== undefined) set.titulo = validarTitulo(input.titulo);
    if (input.tipo !== undefined) set.tipo = validarTipoPublicacion(input.tipo);
    if (input.doi !== undefined) set.doi = validarDoi(input.doi ?? null);
    if (input.issn !== undefined) set.issn = trimOrNull(input.issn);
    if (input.isbn !== undefined) set.isbn = trimOrNull(input.isbn);
    if (input.anio !== undefined) set.anio = input.anio ?? null;
    if (input.cuartil !== undefined) set.cuartil = trimOrNull(input.cuartil);
    if (input.resumen !== undefined) set.resumen = trimOrNull(input.resumen);
    if (input.palabrasClave !== undefined) set.palabras_clave = input.palabrasClave ?? [];
    if (input.revistaTitulo !== undefined) set.revista_titulo = trimOrNull(input.revistaTitulo);
    if (input.handleUrl !== undefined) set.handle_url = trimOrNull(input.handleUrl);
    if (input.fechaPublicacion !== undefined) set.fecha_publicacion = trimOrNull(input.fechaPublicacion);
    if (input.editorial !== undefined) set.editorial = trimOrNull(input.editorial);
    if (input.idOrgUnitEditora !== undefined) set.id_org_unit_editora = trimOrNull(input.idOrgUnitEditora);
    if (input.scimagoCuartil !== undefined) set.scimago_cuartil = validarCuartil(input.scimagoCuartil ?? null);
    if (input.wosCuartil !== undefined) set.wos_cuartil = validarCuartil(input.wosCuartil ?? null);
    if (input.esRevisadoPorPares !== undefined) set.es_revisado_por_pares = input.esRevisadoPorPares ?? true;
    if (input.accesoAbierto !== undefined) set.acceso_abierto = validarAccesoAbierto(input.accesoAbierto ?? null);
    if (input.idioma !== undefined) set.idioma = validarIdioma(input.idioma ?? null);
    if (input.volumen !== undefined) set.volumen = trimOrNull(input.volumen);
    if (input.numeroIssue !== undefined) set.numero_issue = trimOrNull(input.numeroIssue);
    if (input.paginas !== undefined) set.paginas = trimOrNull(input.paginas);
    if (input.dominioOrigen !== undefined) {
      const v = validarDominioOrigen(input.dominioOrigen ?? null);
      set.dominio_origen = (v ?? DEFAULT_DOMINIO_ORIGEN) as PublicacionDominioOrigen;
    }
    if (input.pureUuid !== undefined) set.pure_uuid = trimOrNull(input.pureUuid);
    if (input.estadoPublicacion !== undefined) set.estado_publicacion = trimOrNull(input.estadoPublicacion);
    if (input.perucrisUuid !== undefined) set.perucris_uuid = trimOrNull(input.perucrisUuid);
    if (input.idProyecto !== undefined) {
      const newId = trimOrNull(input.idProyecto);
      if (newId !== existing.id_proyecto) {
        if (newId) await this.repo.ensureProyectoExists(newId);
        set.id_proyecto = newId;
      }
    }

    if (Object.keys(set).length > 0) {
      try {
        await this.repo.updatePublicacion(id, set);
      } catch (err) {
        if (esE11000(err)) {
          throw AppError.unique("Conflicto de unicidad al actualizar la publicacion.");
        }
        throw err;
      }
    }
    const updated = await this.repo.findPublicacionById(id);
    if (!updated) throw AppError.notFound("Publicacion no encontrada.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.update",
      "publicacion",
      id,
      JSON.stringify({ campos: Object.keys(set) }),
    );
    return this.toPublicacionDto(updated);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findPublicacionById(id);
    if (!existing) throw AppError.notFound("Publicacion no encontrada.");
    await this.withTransaction(async (session) => {
      await this.repo.setPublicacionActivo(id, 0, session);
      await this.repo.deletePublicacionAutoresByPublicacion(id, session);
    });
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.delete",
      "publicacion",
      id,
    );
  }

  async reactivate(id: string, actor: AuthenticatedUser): Promise<PublicacionDto> {
    const existing = await this.repo.findPublicacionById(id);
    if (!existing) throw AppError.notFound("Publicacion no encontrada.");
    await this.repo.setPublicacionActivo(id, 1);
    const updated = await this.repo.findPublicacionById(id);
    if (!updated) throw AppError.notFound("Publicacion no encontrada.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.reactivate",
      "publicacion",
      id,
    );
    return this.toPublicacionDto(updated);
  }

  // ============================================================
  // Pivot publicacion_autores
  // ============================================================

  async attachAutor(
    idPublicacion: string,
    input: VincularAutorDto,
    actor: AuthenticatedUser,
  ): Promise<PublicacionAutorDto> {
    await this.repo.ensurePublicacionExists(idPublicacion);
    await this.repo.ensurePersonaExists(input.idPersona);
    if (input.idOrgUnitAfiliacion) {
      await this.repo.ensureOrgUnitExists(input.idOrgUnitAfiliacion);
    }
    const orden = validarOrdenAutor(input.orden);
    const doc: PublicacionAutorDoc = {
      id: randomUUID(),
      id_publicacion: idPublicacion,
      id_persona: input.idPersona,
      id_org_unit_afiliacion: input.idOrgUnitAfiliacion ?? null,
      orden,
      es_autor_correspondiente: input.esAutorCorrespondiente ?? false,
    };
    try {
      await this.repo.insertPublicacionAutor(doc);
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("Ese autor ya esta vinculado a la publicacion.");
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.vincular_autor",
      "publicacion",
      idPublicacion,
      JSON.stringify({ id_persona: input.idPersona, orden }),
    );
    return this.toPublicacionAutorDto(doc);
  }

  async detachAutor(
    idPublicacion: string,
    pivotId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.repo.ensurePublicacionExists(idPublicacion);
    const deleted = await this.repo.deletePublicacionAutorById(pivotId, idPublicacion);
    if (deleted === 0) {
      throw AppError.notFound("Autor vinculado no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "publicacion.desvincular_autor",
      "publicacion",
      idPublicacion,
      JSON.stringify({ pivot_id: pivotId }),
    );
  }

  async listAutores(idPublicacion: string): Promise<PublicacionAutorDto[]> {
    await this.repo.ensurePublicacionExists(idPublicacion);
    const docs = await this.repo.listPublicacionAutores(idPublicacion);
    return docs.map((d) => this.toPublicacionAutorDto(d));
  }

  // ============================================================
  // Getters cruzados (D5a: software por proyecto)
  // ============================================================

  async getByInvestigador(idInvestigador: string): Promise<PublicacionDto[]> {
    const idPersona = await this.repo.findPersonaIdByInvestigador(idInvestigador);
    if (!idPersona) return [];
    const ids = await this.repo.listPublicacionIdsByPersona(idPersona);
    if (ids.length === 0) return [];
    const docs = await this.repo.listPublicacionesByIds(ids);
    return docs.map((d) => this.toPublicacionDto(d));
  }

  async getSoftwareByProyecto(idProyecto: string): Promise<PublicacionDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const docs = await this.repo.listSoftwareByProyecto(idProyecto);
    return docs.map((d) => this.toPublicacionDto(d));
  }
}