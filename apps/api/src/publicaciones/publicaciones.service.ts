/**
 * Servicio del dominio `publicaciones` (12 REST + D7 + D8 + cascade pivot).
 *
 * E11000 sobre UNIQUE pivot {id_publicacion, id_persona} → 409 (`AppError.unique`).
 * D7: class-validator estricta en create Y update; el service llama la
 * lógica pura de validación para mensajes canónicos.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, MongoClient } from "mongodb";
import { MongoServerError } from "mongodb";
import { randomUUID } from "node:crypto";
import { AuditContextService } from "../audit/audit-context.service";
import { AppError } from "../infra/errors/app-error";
import { MONGO_CLIENT } from "../infra/mongo/mongo.module";
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
    private readonly auditContext: AuditContextService,
  ) {}

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

  async create(input: CreatePublicacionDto): Promise<PublicacionDto> {
    const titulo = validarTitulo(input.titulo);
    const tipo = validarTipoPublicacion(input.tipo);
    const doi = validarDoi(input.doi ?? null);
    const idioma = validarIdioma(input.idioma ?? null);
    const scimagoCuartil = validarCuartil(input.scimago_cuartil ?? null);
    const wosCuartil = validarCuartil(input.wos_cuartil ?? null);
    const accesoAbierto = validarAccesoAbierto(input.acceso_abierto ?? null);
    const dominioOrigen = (validarDominioOrigen(input.dominio_origen ?? null) ??
      DEFAULT_DOMINIO_ORIGEN) as PublicacionDominioOrigen;

    const idProyecto = trimOrNull(input.id_proyecto);
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
      palabras_clave: input.palabras_clave ?? [],
      created_at: now,
      updated_at: now,
      activo: 1,
      handle_url: trimOrNull(input.handle_url),
      fecha_publicacion: trimOrNull(input.fecha_publicacion),
      editorial: trimOrNull(input.editorial),
      id_org_unit_editora: trimOrNull(input.id_org_unit_editora),
      revista_titulo: trimOrNull(input.revista_titulo),
      isbn: trimOrNull(input.isbn),
      scimago_cuartil: scimagoCuartil,
      wos_cuartil: wosCuartil,
      es_revisado_por_pares: input.es_revisado_por_pares ?? true,
      acceso_abierto: accesoAbierto,
      idioma,
      volumen: trimOrNull(input.volumen),
      numero_issue: trimOrNull(input.numero_issue),
      paginas: trimOrNull(input.paginas),
      dominio_origen: dominioOrigen,
      pure_uuid: trimOrNull(input.pure_uuid),
      estado_publicacion: trimOrNull(input.estado_publicacion),
      id_proyecto: idProyecto,
      perucris_uuid: trimOrNull(input.perucris_uuid),
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

  async update(id: string, input: UpdatePublicacionDto): Promise<PublicacionDto> {
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
    if (input.palabras_clave !== undefined) set.palabras_clave = input.palabras_clave ?? [];
    if (input.revista_titulo !== undefined) set.revista_titulo = trimOrNull(input.revista_titulo);
    if (input.handle_url !== undefined) set.handle_url = trimOrNull(input.handle_url);
    if (input.fecha_publicacion !== undefined) set.fecha_publicacion = trimOrNull(input.fecha_publicacion);
    if (input.editorial !== undefined) set.editorial = trimOrNull(input.editorial);
    if (input.id_org_unit_editora !== undefined) set.id_org_unit_editora = trimOrNull(input.id_org_unit_editora);
    if (input.scimago_cuartil !== undefined) set.scimago_cuartil = validarCuartil(input.scimago_cuartil ?? null);
    if (input.wos_cuartil !== undefined) set.wos_cuartil = validarCuartil(input.wos_cuartil ?? null);
    if (input.es_revisado_por_pares !== undefined) set.es_revisado_por_pares = input.es_revisado_por_pares ?? true;
    if (input.acceso_abierto !== undefined) set.acceso_abierto = validarAccesoAbierto(input.acceso_abierto ?? null);
    if (input.idioma !== undefined) set.idioma = validarIdioma(input.idioma ?? null);
    if (input.volumen !== undefined) set.volumen = trimOrNull(input.volumen);
    if (input.numero_issue !== undefined) set.numero_issue = trimOrNull(input.numero_issue);
    if (input.paginas !== undefined) set.paginas = trimOrNull(input.paginas);
    if (input.dominio_origen !== undefined) {
      const v = validarDominioOrigen(input.dominio_origen ?? null);
      set.dominio_origen = (v ?? DEFAULT_DOMINIO_ORIGEN) as PublicacionDominioOrigen;
    }
    if (input.pure_uuid !== undefined) set.pure_uuid = trimOrNull(input.pure_uuid);
    if (input.estado_publicacion !== undefined) set.estado_publicacion = trimOrNull(input.estado_publicacion);
    if (input.perucris_uuid !== undefined) set.perucris_uuid = trimOrNull(input.perucris_uuid);
    if (input.id_proyecto !== undefined) {
      const newId = trimOrNull(input.id_proyecto);
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
    this.auditContext.setDetails(JSON.stringify({ campos: Object.keys(set) }));
    const updated = await this.repo.findPublicacionById(id);
    if (!updated) throw AppError.notFound("Publicacion no encontrada.");
    return this.toPublicacionDto(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findPublicacionById(id);
    if (!existing) throw AppError.notFound("Publicacion no encontrada.");
    await this.withTransaction(async (session) => {
      await this.repo.setPublicacionActivo(id, 0, session);
      await this.repo.deletePublicacionAutoresByPublicacion(id, session);
    });
  }

  async reactivate(id: string): Promise<PublicacionDto> {
    const existing = await this.repo.findPublicacionById(id);
    if (!existing) throw AppError.notFound("Publicacion no encontrada.");
    await this.repo.setPublicacionActivo(id, 1);
    const updated = await this.repo.findPublicacionById(id);
    if (!updated) throw AppError.notFound("Publicacion no encontrada.");
    return this.toPublicacionDto(updated);
  }

  // ============================================================
  // Pivot publicacion_autores
  // ============================================================

  async attachAutor(
    idPublicacion: string,
    input: VincularAutorDto,
  ): Promise<PublicacionAutorDto> {
    await this.repo.ensurePublicacionExists(idPublicacion);
    await this.repo.ensurePersonaExists(input.id_persona);
    if (input.id_org_unit_afiliacion) {
      await this.repo.ensureOrgUnitExists(input.id_org_unit_afiliacion);
    }
    const orden = validarOrdenAutor(input.orden);
    const doc: PublicacionAutorDoc = {
      id: randomUUID(),
      id_publicacion: idPublicacion,
      id_persona: input.id_persona,
      id_org_unit_afiliacion: input.id_org_unit_afiliacion ?? null,
      orden,
      es_autor_correspondiente: input.es_autor_correspondiente ?? false,
    };
    try {
      await this.repo.insertPublicacionAutor(doc);
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("Ese autor ya esta vinculado a la publicacion.");
      }
      throw err;
    }
    return this.toPublicacionAutorDto(doc);
  }

  async detachAutor(idPublicacion: string, pivotId: string): Promise<void> {
    await this.repo.ensurePublicacionExists(idPublicacion);
    const deleted = await this.repo.deletePublicacionAutorById(pivotId, idPublicacion);
    if (deleted === 0) {
      throw AppError.notFound("Autor vinculado no encontrado.");
    }
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