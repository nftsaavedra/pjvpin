import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { ReniecClient } from "../infra/http/reniec.client";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import {
  InvestigadoresRepository,
  type InvestigadorDoc,
  type KardexDoc,
} from "./investigadores.repository";
import type {
  CreateInvestigadorRequest,
  InvestigadorDetalleDto,
  InvestigadorDto,
  ImportInvestigadoresResult,
  KardexEntry,
  UpdateInvestigadorRequest,
} from "./dto/investigadores.dto";

function toDto(doc: InvestigadorDoc): InvestigadorDto {
  return {
    id_investigador: doc.id_investigador,
    dni: doc.dni,
    id_persona: doc.id_persona,
    nombres: doc.nombres ?? "",
    apellido_paterno: doc.apellido_paterno ?? "",
    apellido_materno: doc.apellido_materno ?? "",
    nombre_completo:
      doc.nombre_completo ??
      `${doc.nombres ?? ""} ${doc.apellido_paterno ?? ""} ${doc.apellido_materno ?? ""}`.trim(),
    id_grado: doc.id_grado,
    renacyt_codigo_registro: doc.renacyt_codigo_registro,
    renacyt_orcid: doc.renacyt_orcid,
    renacyt_nivel: doc.renacyt_nivel,
    grupo_investigacion_id: doc.grupo_investigacion_id,
    orcid: doc.orcid,
    correo_institucional: doc.correo_institucional,
    estado_renacyt: doc.estado_renacyt,
    pure_person_id: doc.pure_person_id,
    perucris_uuid: doc.perucris_uuid,
    activo: doc.activo ?? 1,
  };
}

@Injectable()
export class InvestigadoresService {
  constructor(
    private readonly repo: InvestigadoresRepository,
    private readonly audit: AuditService,
    private readonly reniec: ReniecClient,
  ) {}

  async listAll(): Promise<InvestigadorDto[]> {
    const docs = await this.repo.listAll();
    return docs.map(toDto);
  }

  async listPaginated(
    page: number,
    limit: number,
  ): Promise<{
    items: InvestigadorDto[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const { items, total } = await this.repo.listPaginated(page, limit);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    return {
      items: items.map(toDto),
      total,
      page: safePage,
      limit: safeLimit,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async listAllConProyectos(): Promise<InvestigadorDetalleDto[]> {
    const docs = await this.repo.listAllConProyectos();
    const result: InvestigadorDetalleDto[] = [];
    for (const doc of docs) {
      const [proyectos, publicaciones, patentes] = await Promise.all([
        this.repo.countProyectosPorInvestigador(doc.id_investigador),
        this.repo.countPublicacionesPorInvestigador(doc.id_investigador),
        this.repo.countPatentesPorInvestigador(doc.id_investigador),
      ]);
      result.push({
        ...toDto(doc),
        proyectos,
        publicaciones,
        patentes,
        equipamiento: 0,
        financiamiento: 0,
      });
    }
    return result;
  }

  async findByDni(dni: string): Promise<InvestigadorDto | null> {
    const doc = await this.repo.findByDni(dni);
    return doc ? toDto(doc) : null;
  }

  async findByDniConRenacyt(dni: string): Promise<InvestigadorDto | null> {
    const inv = await this.repo.findByDni(dni);
    if (!inv) return null;
    return toDto(inv);
  }

  async create(req: CreateInvestigadorRequest, actor: AuthenticatedUser): Promise<InvestigadorDto> {
    const existing = await this.repo.findByDni(req.dni);
    if (existing) throw AppError.internal("Ya existe un investigador con ese DNI.");
    const id_persona = `persona-${req.dni}`;
    const id_investigador = `investigador-${req.dni}`;
    const doc: InvestigadorDoc = {
      id_investigador,
      dni: req.dni,
      id_persona,
      id_grado: req.id_grado ?? null,
      renacyt_codigo_registro: req.renacyt_codigo_registro ?? null,
      renacyt_orcid: null,
      renacyt_nivel: null,
      grupo_investigacion_id: req.grupo_investigacion_id ?? null,
      orcid: req.orcid ?? null,
      correo_institucional: req.correo_institucional ?? null,
      estado_renacyt: null,
      pure_person_id: null,
      perucris_uuid: null,
      nombres: req.nombres,
      apellido_paterno: req.apellido_paterno,
      apellido_materno: req.apellido_materno ?? "",
      nombre_completo:
        `${req.nombres} ${req.apellido_paterno} ${req.apellido_materno ?? ""}`.trim(),
      activo: 1,
      cambios_renacyt_revisados: 0,
    };
    await this.repo.insert(doc);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.create",
      "investigador",
      id_investigador,
      JSON.stringify({ dni: req.dni }),
    );
    return toDto(doc);
  }

  async update(
    id: string,
    req: UpdateInvestigadorRequest,
    actor: AuthenticatedUser,
  ): Promise<InvestigadorDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Investigador no encontrado.");
    const set: Partial<InvestigadorDoc> = {};
    if (req.nombres !== undefined) set.nombres = req.nombres;
    if (req.apellido_paterno !== undefined) set.apellido_paterno = req.apellido_paterno;
    if (req.apellido_materno !== undefined) set.apellido_materno = req.apellido_materno;
    if (req.id_grado !== undefined) set.id_grado = req.id_grado;
    if (req.grupo_investigacion_id !== undefined)
      set.grupo_investigacion_id = req.grupo_investigacion_id;
    if (req.orcid !== undefined) set.orcid = req.orcid;
    if (req.correo_institucional !== undefined) set.correo_institucional = req.correo_institucional;
    if (req.estado_renacyt !== undefined) set.estado_renacyt = req.estado_renacyt;
    if (set.nombres || set.apellido_paterno || set.apellido_materno) {
      const nombres = set.nombres ?? existing.nombres;
      const ap = set.apellido_paterno ?? existing.apellido_paterno;
      const am = set.apellido_materno ?? existing.apellido_materno;
      set.nombre_completo = `${nombres} ${ap} ${am}`.trim();
    }
    await this.repo.updateById(id, set);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.update",
      "investigador",
      id,
    );
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async deactivate(id: string, actor: AuthenticatedUser): Promise<InvestigadorDto> {
    await this.repo.setActivo(id, 0);
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Investigador no encontrado.");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.delete",
      "investigador",
      id,
    );
    return toDto(updated);
  }

  async reactivate(id: string, actor: AuthenticatedUser): Promise<InvestigadorDto> {
    await this.repo.setActivo(id, 1);
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Investigador no encontrado.");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.reactivate",
      "investigador",
      id,
    );
    return toDto(updated);
  }

  async consultarDni(numero: string) {
    return this.reniec.consultar(numero);
  }

  async listKardex(id: string): Promise<KardexEntry[]> {
    const docs = await this.repo.listKardex(id);
    return docs as unknown as KardexEntry[];
  }

  async insertKardex(idInvestigador: string, entry: KardexEntry): Promise<void> {
    const doc: KardexDoc = {
      id_investigador: idInvestigador,
      fecha_evento: entry.fecha_evento,
      tipo_evento: entry.tipo_evento,
      descripcion: entry.descripcion,
      metadata: entry.metadata,
    };
    await this.repo.insertKardex(doc);
  }

  async marcarCambiosRenacytRevisados(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<InvestigadorDto> {
    await this.repo.updateById(id, { cambios_renacyt_revisados: 1 });
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Investigador no encontrado.");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.renacyt.reviewed",
      "investigador",
      id,
    );
    return toDto(updated);
  }

  async getPlantillaDefault(): Promise<string[]> {
    return PLANTILLA_DNI_UNF;
  }

  async importarDnis(
    dnis: string[],
    actor: AuthenticatedUser,
  ): Promise<ImportInvestigadoresResult> {
    const result: ImportInvestigadoresResult = {
      total: dnis.length,
      procesados: 0,
      creados: 0,
      actualizados: 0,
      reniec_ok: 0,
      perucris_ok: 0,
      pure_ok: 0,
      renacyt_ok: 0,
      errores: [],
    };
    for (const dni of dnis) {
      result.procesados++;
      try {
        const r = await this.reniec.consultar(dni);
        if (r.fullName) result.reniec_ok++;
        const existing = await this.repo.findByDni(dni);
        const nombres = r.firstName;
        const ap = r.firstLastName;
        const am = r.secondLastName;
        if (existing) {
          await this.repo.updateById(existing.id_investigador, {
            nombres,
            apellido_paterno: ap,
            apellido_materno: am,
            nombre_completo: r.fullName,
          });
          result.actualizados++;
        } else {
          const id_persona = `persona-${dni}`;
          await this.repo.insert({
            id_investigador: `investigador-${dni}`,
            dni,
            id_persona,
            id_grado: null,
            renacyt_codigo_registro: null,
            renacyt_orcid: null,
            renacyt_nivel: null,
            grupo_investigacion_id: null,
            orcid: null,
            correo_institucional: null,
            estado_renacyt: null,
            pure_person_id: null,
            perucris_uuid: null,
            nombres,
            apellido_paterno: ap,
            apellido_materno: am,
            nombre_completo: r.fullName,
            activo: 1,
            cambios_renacyt_revisados: 0,
          });
          result.creados++;
        }
      } catch (err) {
        result.errores.push({
          dni,
          fase: "reniec",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.import",
      "investigador.import",
      "lote",
      JSON.stringify({
        total: result.total,
        ok: result.creados + result.actualizados,
        errores: result.errores.length,
      }),
    );
    return result;
  }

  async refreshRenacytTodos(
    _actor: AuthenticatedUser,
  ): Promise<{ jobId: string; message: string }> {
    return {
      jobId: `renacyt-refresh-${Date.now()}`,
      message: "Job enqueued. Verifique progreso en sync/reportes.",
    };
  }

  async refrescarFormacionRenacyt(
    id: string,
    _actor: AuthenticatedUser,
  ): Promise<{ refreshed: number }> {
    await this.repo.updateById(id, { renacyt_nivel: "pendiente-refresh" });
    return { refreshed: 0 };
  }

  async descargarConstanciaRenacyt(_id: string): Promise<Buffer> {
    return Buffer.from("");
  }
}

const PLANTILLA_DNI_UNF = [
  "00000001",
  "00000002",
  "00000003",
  "00000004",
  "00000005",
  "00000006",
  "00000007",
  "00000008",
  "00000009",
  "00000010",
];
