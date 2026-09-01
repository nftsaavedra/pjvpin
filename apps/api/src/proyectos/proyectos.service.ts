import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ClientSession, MongoClient } from "mongodb";
import { MongoServerError } from "mongodb";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { InvestigadoresRepository } from "../investigadores/investigadores.repository";
import { MONGO_CLIENT } from "../infra/mongo/mongo.module";
import { UsuariosRepository } from "../usuarios/usuarios.repository";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { ROLE_CO_INVESTIGADOR, ROLE_INVESTIGADOR_PRINCIPAL } from "./vocab";
import {
  prepararParticipantes,
  resolverCodigoParaCreate,
  validarMonedaODefault,
  validarMontoAsignado,
  validarRolOrg,
} from "./proyectos.logic";
import {
  ParticipacionDoc,
  ProyectoDoc,
  ProyectoFinanciamientoDoc,
  ProyectoListFilter,
  ProyectosRepository,
} from "./proyectos.repository";
import type { CreateProyectoConParticipantesDto } from "./dto/create-proyecto.dto";
import type { UpdateProyectoConParticipantesDto } from "./dto/update-proyecto.dto";
import type { ProyectoDto } from "./dto/proyecto.dto";
import type {
  ProyectoDetalleDto,
  ProyectoParticipanteResumen,
} from "./dto/proyecto-detalle.dto";
import type { PaginatedProyectos } from "./dto/paginated-proyectos.dto";
import type { EliminarProyectoResultadoDto } from "./dto/eliminar-proyecto-resultado.dto";
import type {
  ProyectoOrganizacionDto,
  VincularOrgDto,
} from "./dto/pivot-org.dto";
import type {
  ProyectoFinanciamientoDto,
  VincularFinanciamientoDto,
} from "./dto/pivot-financiamiento.dto";

const MAX_AUTOGEN_RETRIES = 3;
const RESPONSABLE_PROYECTO = "responsable_proyecto";

@Injectable()
export class ProyectosService {
  private readonly logger = new Logger(ProyectosService.name);

  constructor(
    @Inject(MONGO_CLIENT) private readonly client: MongoClient,
    private readonly repo: ProyectosRepository,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly investigadoresRepo: InvestigadoresRepository,
    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================
  async create(
    input: CreateProyectoConParticipantesDto,
    actor: AuthenticatedUser,
  ): Promise<ProyectoDto> {
    const prepared = prepararParticipantes(
      input.investigadoresIds,
      input.investigadorResponsableId,
    );
    await this.assertInvestigadoresActivos(prepared.ids);

    const inserted = await this.intentarInsertProyecto(
      input.tituloProyecto,
      prepared,
    );
    if (!inserted) {
      throw AppError.internal(
        "No se pudo generar un codigo unico para el proyecto tras varios intentos.",
      );
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.create",
      "proyecto",
      inserted.id_proyecto,
      JSON.stringify({
        titulo: inserted.titulo_proyecto,
        codigo: inserted.codigo,
        responsable: prepared.responsable,
        participantes: prepared.ids.length,
      }),
    );
    return this.toProyectoDto(inserted);
  }

  private async intentarInsertProyecto(
    titulo: string,
    prepared: { ids: string[]; responsable: string | null },
  ): Promise<ProyectoDoc | null> {
    let lastError: unknown = null;
    for (let intento = 0; intento < MAX_AUTOGEN_RETRIES; intento += 1) {
      const codigo = resolverCodigoParaCreate(null);
      try {
        return await this.transaccionarCrearProyecto(titulo, prepared, codigo);
      } catch (err) {
        lastError = err;
        if (intento < MAX_AUTOGEN_RETRIES - 1 && esE11000EnCodigo(err)) {
          this.logger.warn(
            `Colision de codigo autogenerado en create (intento ${intento + 1}/${MAX_AUTOGEN_RETRIES}). Reintentando.`,
          );
          continue;
        }
        throw err;
      }
    }
    void lastError;
    return null;
  }

  private async transaccionarCrearProyecto(
    titulo: string,
    prepared: { ids: string[]; responsable: string | null },
    codigo: string,
  ): Promise<ProyectoDoc> {
    const now = Date.now();
    const id_proyecto = randomUUID();
    const proyectoDoc: ProyectoDoc = {
      id_proyecto,
      titulo_proyecto: titulo,
      codigo,
      activo: 1,
      created_at: now,
      updated_at: now,
      campo_ocde: null,
      programas_relacionados: [],
      tipo_actividad_ocde: null,
      ambito_geografico: null,
      estado_concytec: null,
      tematica_ambiental: null,
      tematica_salud: null,
      perucris_uuid: null,
    };
    return this.withTransaction(async (session) => {
      await this.repo.insertProyecto(proyectoDoc, session);
      const participaciones: ParticipacionDoc[] = prepared.ids.map((idInv) => ({
        _id: `${id_proyecto}:${idInv}`,
        id_proyecto,
        id_investigador: idInv,
        rol:
          idInv === prepared.responsable
            ? ROLE_INVESTIGADOR_PRINCIPAL
            : ROLE_CO_INVESTIGADOR,
        id_org_unit_afiliacion: null,
        horas_dedicacion_semanal: null,
        es_responsable: idInv === prepared.responsable,
      }));
      await this.repo.insertParticipaciones(participaciones, session);
      return proyectoDoc;
    });
  }

  // ============================================================
  // UPDATE (titulo + participantes)
  // ============================================================
  async update(
    id: string,
    input: UpdateProyectoConParticipantesDto,
    actor: AuthenticatedUser,
  ): Promise<ProyectoDto> {
    const existing = await this.repo.findProyectoById(id);
    if (!existing) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
    const prepared = prepararParticipantes(
      input.investigadoresIds,
      input.investigadorResponsableId,
      { permitirListaVacia: true },
    );
    if (prepared.ids.length > 0) {
      await this.assertInvestigadoresActivos(prepared.ids);
    }
    await this.withTransaction(async (session) => {
      await this.repo.setProyectoTitulo(id, input.tituloProyecto, session);
      await this.repo.deleteParticipacionesByProyecto(id, session);
      if (prepared.ids.length > 0) {
        const participaciones: ParticipacionDoc[] = prepared.ids.map((idInv) => ({
          _id: `${id}:${idInv}`,
          id_proyecto: id,
          id_investigador: idInv,
          rol:
            idInv === prepared.responsable
              ? ROLE_INVESTIGADOR_PRINCIPAL
              : ROLE_CO_INVESTIGADOR,
          id_org_unit_afiliacion: null,
          horas_dedicacion_semanal: null,
          es_responsable: idInv === prepared.responsable,
        }));
        await this.repo.insertParticipaciones(participaciones, session);
      }
    });
    const updated = await this.repo.findProyectoById(id);
    if (!updated) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.update",
      "proyecto",
      id,
      JSON.stringify({
        titulo: input.tituloProyecto,
        participantes: prepared.ids.length,
      }),
    );
    return this.toProyectoDto(updated);
  }

  // ============================================================
  // DELETE (cascade soft + hard)
  // ============================================================
  async delete(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<EliminarProyectoResultadoDto> {
    const existing = await this.repo.findProyectoById(id);
    if (!existing) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
    const totalParticipaciones = await this.repo.countParticipacionesByProyecto(id);
    if (totalParticipaciones > 0) {
      throw AppError.unique(
        "No se puede eliminar el proyecto porque aun tiene investigadores relacionados. Elimine primero esas relaciones.",
      );
    }
    const recursos: string[] = [];
    await this.withTransaction(async (session) => {
      const patentes = await this.repo.softDeletePatentesByProyecto(id, session);
      if (patentes > 0) recursos.push("patentes");
      const orgs = await this.repo.deleteProyectoOrganizacionesByProyecto(id, session);
      if (orgs > 0) recursos.push("organizaciones");
      const fins = await this.repo.deleteProyectoFinanciamientosByProyecto(id, session);
      if (fins > 0) recursos.push("financiamientos");
      const ocde = await this.repo.deleteEntityOcdeFieldsByProyecto(id, session);
      if (ocde > 0) recursos.push("campos OCDE");
      await this.repo.setProyectoActivo(id, 0, session);
    });
    const mensaje =
      recursos.length === 0
        ? "Proyecto desactivado."
        : `Proyecto desactivado. Recursos relacionados desactivados: ${recursos.join(", ")}.`;
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.delete",
      "proyecto",
      id,
      JSON.stringify({ recursos }),
    );
    return { accion: "desactivado", mensaje };
  }

  // ============================================================
  // REACTIVATE
  // ============================================================
  async reactivate(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<ProyectoDto> {
    const existing = await this.repo.findProyectoById(id);
    if (!existing) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
    await this.repo.setProyectoActivo(id, 1);
    const updated = await this.repo.findProyectoById(id);
    if (!updated) {
      throw AppError.notFound("Proyecto no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.reactivate",
      "proyecto",
      id,
    );
    return this.toProyectoDto(updated);
  }

  // ============================================================
  // LISTADOS
  // ============================================================
  async listAllDetalle(actor: AuthenticatedUser): Promise<ProyectoDetalleDto[]> {
    const filter = await this.resolveListFilter(actor);
    const proyectos = await this.repo.listAllProyectosActivos(filter);
    return this.composeDetalle(proyectos);
  }

  async listPaginated(
    actor: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<PaginatedProyectos> {
    const filter = await this.resolveListFilter(actor);
    const { items, total } = await this.repo.listProyectosPaginated(
      page,
      limit,
      filter,
    );
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    return {
      items: items.map((d) => this.toProyectoDto(d)),
      total,
      page: safePage,
      limit: safeLimit,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async findByInvestigador(idInvestigador: string): Promise<ProyectoDto[]> {
    const ids = await this.repo.findProyectosIdsComoParticipante(idInvestigador);
    const docs = await this.repo.listAllProyectosActivos({ restrictToIds: ids });
    return docs.map((d) => this.toProyectoDto(d));
  }

  // ============================================================
  // PARTICIPACIONES — delete
  // ============================================================
  async eliminarRelacion(
    idProyecto: string,
    idInvestigador: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.repo.ensureProyectoExists(idProyecto);
    const deleted = await this.repo.deleteParticipacionByIds(
      idProyecto,
      idInvestigador,
    );
    if (deleted === 0) {
      throw AppError.notFound("Relacion proyecto-investigador no encontrada.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.delete_relation",
      "proyecto",
      idProyecto,
      JSON.stringify({ id_investigador: idInvestigador }),
    );
  }

  async eliminarRelaciones(
    idProyecto: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.repo.ensureProyectoExists(idProyecto);
    const deleted = await this.repo.deleteParticipacionesByProyecto(idProyecto);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.delete_relations",
      "proyecto",
      idProyecto,
      JSON.stringify({ deleted }),
    );
  }

  // ============================================================
  // PIVOTS: organizaciones
  // ============================================================
  async attachOrg(
    idProyecto: string,
    dto: VincularOrgDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    validarRolOrg(dto.rol);
    await this.repo.ensureProyectoExists(idProyecto);
    await this.ensureEntityExists("org_units", dto.idOrgUnit, "Unidad organizativa");
    try {
      await this.repo.insertProyectoOrganizacion({
        _id: randomUUID(),
        id_proyecto: idProyecto,
        id_org_unit: dto.idOrgUnit,
        rol: dto.rol,
      });
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique(
          "La organizacion ya esta vinculada al proyecto con ese rol.",
        );
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.vincular_org",
      "proyecto",
      idProyecto,
      JSON.stringify({ id_org_unit: dto.idOrgUnit, rol: dto.rol }),
    );
  }

  async detachOrg(
    idProyecto: string,
    idPivot: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const deleted = await this.repo.deleteProyectoOrganizacionById(
      idPivot,
      idProyecto,
    );
    if (deleted === 0) {
      throw AppError.notFound("Vinculo organizacion-proyecto no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.desvincular_org",
      "proyecto_org",
      idPivot,
    );
  }

  async listOrgs(idProyecto: string): Promise<ProyectoOrganizacionDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const docs = await this.repo.listProyectoOrganizacionesByProyecto(idProyecto);
    return docs.map((d) => ({
      id: d._id,
      id_proyecto: d.id_proyecto,
      id_org_unit: d.id_org_unit,
      rol: d.rol,
    }));
  }

  // ============================================================
  // PIVOTS: financiamientos
  // ============================================================
  async attachFin(
    idProyecto: string,
    dto: VincularFinanciamientoDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const monto = validarMontoAsignado(dto.montoAsignado);
    const moneda = validarMonedaODefault(dto.moneda);
    await this.repo.ensureProyectoExists(idProyecto);
    await this.ensureEntityExists(
      "financiamientos",
      dto.idFinanciamiento,
      "Financiamiento",
    );
    try {
      await this.repo.insertProyectoFinanciamiento({
        _id: randomUUID(),
        id_proyecto: idProyecto,
        id_financiamiento: dto.idFinanciamiento,
        monto_asignado: monto,
        moneda,
      });
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique(
          "El financiamiento ya esta vinculado al proyecto.",
        );
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.vincular_fin",
      "proyecto",
      idProyecto,
      JSON.stringify({
        id_financiamiento: dto.idFinanciamiento,
        monto_asignado: monto,
        moneda,
      }),
    );
  }

  async detachFin(
    idProyecto: string,
    idPivot: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const deleted = await this.repo.deleteProyectoFinanciamientoById(
      idPivot,
      idProyecto,
    );
    if (deleted === 0) {
      throw AppError.notFound("Vinculo financiamiento-proyecto no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "proyecto.desvincular_fin",
      "proyecto_fin",
      idPivot,
    );
  }

  async listFins(idProyecto: string): Promise<ProyectoFinanciamientoDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const docs =
      await this.repo.listProyectoFinanciamientosByProyecto(idProyecto);
    return docs.map((d: ProyectoFinanciamientoDoc) => ({
      id: d._id,
      id_proyecto: d.id_proyecto,
      id_financiamiento: d.id_financiamiento,
      monto_asignado: d.monto_asignado,
      moneda: d.moneda,
    }));
  }

  // ============================================================
  // Privados
  // ============================================================
  private async resolveListFilter(
    actor: AuthenticatedUser,
  ): Promise<ProyectoListFilter> {
    if (actor.rol !== RESPONSABLE_PROYECTO) return {};
    const investigadorId = await this.resolveActorInvestigadorId(actor);
    const ids = await this.repo.findProyectosIdsComoResponsable(investigadorId);
    return { restrictToIds: ids };
  }

  private async resolveActorInvestigadorId(
    actor: AuthenticatedUser,
  ): Promise<string> {
    const usuario = await this.usuariosRepo.findById(actor.id_usuario);
    if (!usuario?.dni) {
      throw AppError.notFound(
        "Usuario responsable_proyecto no tiene un investigador asociado.",
      );
    }
    const investigador = await this.investigadoresRepo.findByDni(usuario.dni);
    if (!investigador) {
      throw AppError.notFound(
        "Usuario responsable_proyecto no tiene un investigador asociado.",
      );
    }
    return investigador.id_investigador;
  }

  private async assertInvestigadoresActivos(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const count = await this.investigadoresRepo.countActivosByIds(ids);
    if (count !== ids.length) {
      throw AppError.validation(
        "Uno o mas investigadores seleccionados no existen o estan inactivos.",
      );
    }
  }

  /**
   * FK check contra la coleccion externa correspondiente. Cada coleccion
   * persiste su PK como `id_<entidad>` (id_proyecto, id_org_unit, etc).
   * Buscamos especificamente en la coleccion indicada para evitar falsos
   * positivos (un mismo string podria no existir como id de proyecto pero
   * si como id de financiamiento). Se itera sobre los nombres de PK mas
   * comunes para tolerar la inconsistencia Rust (PK en `id_*` vs `_id`).
   */
  private async ensureEntityExists(
    collection: string,
    id: string,
    label: string,
  ): Promise<void> {
    const db = this.investigadoresRepo.getDb();
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
    const probe = await db
      .collection(collection)
      .findOne({ $or: camposId.map((c) => ({ [c]: id })) });
    if (!probe) {
      throw AppError.notFound(`${label} no encontrado.`);
    }
  }

  private async composeDetalle(
    proyectos: ProyectoDoc[],
  ): Promise<ProyectoDetalleDto[]> {
    if (proyectos.length === 0) return [];
    const proyectoIds = proyectos.map((p) => p.id_proyecto);
    const db = this.investigadoresRepo.getDb();

    const participaciones = await db
      .collection<ParticipacionDoc>("participaciones")
      .find({ id_proyecto: { $in: proyectoIds } })
      .toArray();
    const investigadorIds = Array.from(
      new Set(participaciones.map((p) => p.id_investigador)),
    );

    type InvLite = {
      id_investigador: string;
      id_persona: string | null;
      id_grado: string | null;
      renacyt_nivel: string | null;
    };
    const investigadores =
      investigadorIds.length === 0
        ? []
        : await db
            .collection<InvLite>("investigadores")
            .find({ id_investigador: { $in: investigadorIds } })
            .toArray();

    const personaIds = Array.from(
      new Set(
        investigadores
          .map((i) => i.id_persona)
          .filter((x): x is string => !!x),
      ),
    );
    type PersonaLite = { id_persona: string; nombre_completo: string };
    const personas =
      personaIds.length === 0
        ? []
        : await db
            .collection<PersonaLite>("personas")
            .find({ id_persona: { $in: personaIds } })
            .toArray();

    const gradoIds = Array.from(
      new Set(
        investigadores
          .map((i) => i.id_grado)
          .filter((x): x is string => !!x),
      ),
    );
    type GradoLite = { id_grado: string; nombre: string };
    const grados =
      gradoIds.length === 0
        ? []
        : await db
            .collection<GradoLite>("grados")
            .find({ id_grado: { $in: gradoIds } })
            .toArray();

    const investigadoresMap = new Map<string, InvLite>(
      investigadores.map((i) => [i.id_investigador, i]),
    );
    const personasMap = new Map<string, PersonaLite>(
      personas.map((p) => [p.id_persona, p]),
    );
    const gradosMap = new Map<string, GradoLite>(
      grados.map((g) => [g.id_grado, g]),
    );

    const participacionesPorProyecto = new Map<string, ParticipacionDoc[]>();
    for (const p of participaciones) {
      const arr = participacionesPorProyecto.get(p.id_proyecto) ?? [];
      arr.push(p);
      participacionesPorProyecto.set(p.id_proyecto, arr);
    }

    return proyectos.map((proy) => {
      const parts = participacionesPorProyecto.get(proy.id_proyecto) ?? [];
      const resumenes: ProyectoParticipanteResumen[] = parts
        .map((p) =>
          this.toParticipanteResumen(
            p,
            investigadoresMap,
            personasMap,
            gradosMap,
          ),
        )
        .sort((a, b) => {
          if (a.es_responsable !== b.es_responsable) {
            return a.es_responsable ? -1 : 1;
          }
          return a.nombre.localeCompare(b.nombre);
        });
      const responsable = resumenes.find((r) => r.es_responsable) ?? null;
      const investigadoresStr =
        resumenes
          .map((r) => `${r.nombre} (${r.grado} · ${r.renacyt_nivel})`)
          .join(" | ") || null;
      return {
        id_proyecto: proy.id_proyecto,
        titulo_proyecto: proy.titulo_proyecto,
        cantidad_investigadores: resumenes.length,
        investigador_responsable: responsable?.nombre ?? null,
        investigadores: investigadoresStr,
        participantes_json:
          resumenes.length > 0 ? JSON.stringify(resumenes) : null,
        activo: proy.activo === 1,
      };
    });
  }

  private toParticipanteResumen(
    p: ParticipacionDoc,
    investigadores: Map<
      string,
      {
        id_persona: string | null;
        id_grado: string | null;
        renacyt_nivel: string | null;
      }
    >,
    personas: Map<string, { nombre_completo: string }>,
    grados: Map<string, { nombre: string }>,
  ): ProyectoParticipanteResumen {
    const inv = investigadores.get(p.id_investigador);
    const idPersona = inv?.id_persona ?? null;
    const idGrado = inv?.id_grado ?? null;
    const persona = idPersona ? personas.get(idPersona) : undefined;
    const grado = idGrado ? grados.get(idGrado) : undefined;
    return {
      id_investigador: p.id_investigador,
      nombre: persona?.nombre_completo ?? "",
      grado: grado?.nombre ?? "Sin grado",
      renacyt_nivel: inv?.renacyt_nivel ?? "No registrado",
      es_responsable: p.es_responsable === true,
    };
  }

  private toProyectoDto(doc: ProyectoDoc): ProyectoDto {
    return {
      id_proyecto: doc.id_proyecto,
      titulo_proyecto: doc.titulo_proyecto,
      codigo: doc.codigo ?? null,
      activo: doc.activo,
      created_at: doc.created_at ?? null,
      updated_at: doc.updated_at ?? null,
      campo_ocde: doc.campo_ocde ?? null,
      programas_relacionados: doc.programas_relacionados ?? [],
      tipo_actividad_ocde: doc.tipo_actividad_ocde ?? null,
      ambito_geografico: doc.ambito_geografico ?? null,
      estado_concytec: doc.estado_concytec ?? null,
      tematica_ambiental: doc.tematica_ambiental ?? null,
      tematica_salud: doc.tematica_salud ?? null,
      perucris_uuid: doc.perucris_uuid ?? null,
    };
  }

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
}

// ============================================================
// helpers libres
// ============================================================
function esE11000(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}

function esE11000EnCodigo(err: unknown): boolean {
  if (!(err instanceof MongoServerError) || err.code !== 11000) return false;
  const keyPattern = (err.keyPattern ?? {}) as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(keyPattern, "codigo");
}
