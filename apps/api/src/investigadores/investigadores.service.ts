import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { ReniecClient } from "../infra/http/reniec.client";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { JobRegistry } from "../external-http/job-registry.service";
import { KardexService } from "../kardex/kardex.service";
import type { KardexEntry } from "../kardex/kardex.logic";
import { RenacytService } from "../renacyt/renacyt.service";
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
  UpdateInvestigadorRequest,
} from "./dto/investigadores.dto";
import { loadPlantillaDefault } from "./data/plantilla-loader";

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

function kardexDocToEntry(doc: KardexDoc): KardexEntry {
  return {
    id: doc.id_kardex,
    investigador_id: doc.id_investigador,
    persona_id: doc.id_persona,
    fecha_evento: doc.fecha_evento,
    disparador: doc.disparador,
    cambios: doc.cambios,
    formaciones_diff: doc.formaciones_diff,
  };
}

@Injectable()
export class InvestigadoresService {
  constructor(
    private readonly repo: InvestigadoresRepository,
    private readonly audit: AuditService,
    private readonly reniec: ReniecClient,
    private readonly renacyt: RenacytService,
    private readonly kardex: KardexService,
    private readonly jobs: JobRegistry,
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
    if (existing) throw AppError.unique("Ya existe un investigador con ese DNI.");
    const id_persona = `persona-${req.dni}`;
    const id_investigador = `investigador-${req.dni}`;
    const doc: InvestigadorDoc = {
      id_investigador,
      dni: req.dni,
      id_persona,
      nombres: req.nombres,
      apellido_paterno: req.apellido_paterno,
      apellido_materno: req.apellido_materno ?? "",
      nombre_completo:
        `${req.nombres} ${req.apellido_paterno} ${req.apellido_materno ?? ""}`.trim(),
      id_grado: req.id_grado ?? null,
      renacyt_codigo_registro: req.renacyt_codigo_registro ?? null,
      renacyt_id_investigador: null,
      renacyt_nivel: null,
      renacyt_grupo: null,
      renacyt_condicion: null,
      renacyt_fecha_informe_calificacion: null,
      renacyt_fecha_registro: null,
      renacyt_fecha_ultima_revision: null,
      renacyt_orcid: null,
      renacyt_scopus_author_id: null,
      renacyt_fecha_ultima_sincronizacion: null,
      renacyt_ficha_url: null,
      renacyt_formaciones_academicas_json: null,
      renacyt_cambios_revisados_en: null,
      grupo_investigacion_id: req.grupo_investigacion_id ?? null,
      orcid: req.orcid ?? null,
      correo_institucional: req.correo_institucional ?? null,
      estado_renacyt: null,
      pure_person_id: null,
      perucris_uuid: null,
      activo: 1,
      cambios_renacyt_revisados: 0,
    };
    await this.repo.insert(doc);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.create",
      "investigador",
      id_investigador,
    );
    return toDto(doc);
  }

  async update(
    id: string,
    req: UpdateInvestigadorRequest,
    actor: AuthenticatedUser,
  ): Promise<InvestigadorDto> {
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
    if (Object.keys(set).length > 0) {
      await this.repo.updateById(id, set);
    }
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Investigador no encontrado.");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.update",
      "investigador",
      id,
    );
    return toDto(updated);
  }

  async deactivate(id: string, actor: AuthenticatedUser): Promise<InvestigadorDto> {
    await this.repo.setActivo(id, 0);
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Investigador no encontrado.");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.deactivate",
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

  async listKardex(id: string): Promise<KardexEntry[]> {
    const docs = await this.repo.listKardex(id);
    return docs.map(kardexDocToEntry);
  }

  async marcarCambiosRenacytRevisados(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<InvestigadorDto> {
    await this.repo.updateById(id, { renacyt_cambios_revisados_en: Date.now() });
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
    return loadPlantillaDefault();
  }

  /**
   * Importa lote de DNIs ejecutando RENIEC (obligatorio) y registrando
   * entradas en el kardex por cada DNI nuevo/actualizado. Las fases
   * PeruCRIS/Pure/RENACYT se conectan en commits D2/D3.
   */
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
        const now = Date.now();
        if (existing) {
          await this.repo.updateById(existing.id_investigador, {
            nombres,
            apellido_paterno: ap,
            apellido_materno: am,
            nombre_completo: r.fullName,
            renacyt_fecha_ultima_sincronizacion: now,
          });
          result.actualizados++;
        } else {
          const id_persona = `persona-${dni}`;
          await this.repo.insert({
            id_investigador: `investigador-${dni}`,
            dni,
            id_persona,
            nombres,
            apellido_paterno: ap,
            apellido_materno: am,
            nombre_completo: r.fullName,
            id_grado: null,
            renacyt_codigo_registro: null,
            renacyt_id_investigador: null,
            renacyt_nivel: null,
            renacyt_grupo: null,
            renacyt_condicion: null,
            renacyt_fecha_informe_calificacion: null,
            renacyt_fecha_registro: null,
            renacyt_fecha_ultima_revision: null,
            renacyt_orcid: null,
            renacyt_scopus_author_id: null,
            renacyt_fecha_ultima_sincronizacion: now,
            renacyt_ficha_url: null,
            renacyt_formaciones_academicas_json: null,
            renacyt_cambios_revisados_en: null,
            grupo_investigacion_id: null,
            orcid: null,
            correo_institucional: null,
            estado_renacyt: null,
            pure_person_id: null,
            perucris_uuid: null,
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

  /**
   * Refresca la formacion RENACYT de un investigador. Usa el codigo RENACYT
   * almacenado; si no hay, consulta RENACYT por DNI para obtenerlo. Persiste
   * la entrada del kardex si hay cambios.
   */
  async refrescarFormacionRenacyt(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ refreshed: number; kardex: KardexEntry | null }> {
    const inv = await this.repo.findById(id);
    if (!inv) throw AppError.notFound("Investigador no encontrado.");
    let codigo = inv.renacyt_codigo_registro;
    if (!codigo) {
      const found = await this.renacyt.buscarPorDni(inv.dni);
      if (!found) throw AppError.notFound("El DNI no esta registrado en RENACYT.");
      codigo = found.codigo_registro;
      await this.repo.updateById(id, {
        renacyt_codigo_registro: codigo,
        renacyt_id_investigador: found.id_investigador || null,
        renacyt_nivel: found.nivel || null,
        renacyt_grupo: found.grupo || null,
        renacyt_condicion: found.condicion || null,
        renacyt_orcid: found.orcid || null,
      });
    }
    const lookup = await this.renacyt.consultarInvestigador(codigo);
    const now = Date.now();
    await this.repo.updateById(id, {
      renacyt_codigo_registro: lookup.codigo_registro || codigo,
      renacyt_id_investigador: lookup.id_investigador || null,
      renacyt_nivel: lookup.nivel,
      renacyt_grupo: lookup.grupo,
      renacyt_condicion: lookup.condicion,
      renacyt_fecha_informe_calificacion: lookup.fecha_informe_calificacion,
      renacyt_fecha_registro: lookup.fecha_registro,
      renacyt_fecha_ultima_revision: lookup.fecha_ultima_revision,
      renacyt_orcid: lookup.orcid,
      renacyt_scopus_author_id: lookup.scopus_author_id,
      renacyt_fecha_ultima_sincronizacion: now,
      renacyt_ficha_url: lookup.ficha_url,
      renacyt_formaciones_academicas_json: lookup.formaciones_academicas_json,
    });
    const entry = await this.kardex.registrarCambioSiAplica(id, lookup, "refresh_individual");
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "renacyt.refresh.individual",
      "investigador",
      id,
      JSON.stringify({
        codigo,
        cambios: entry ? entry.cambios.length : 0,
        kardex_id: entry?.id ?? null,
      }),
    );
    return { refreshed: 1, kardex: entry };
  }

  /**
   * Refresca RENACYT para todos los investigadores con codigo RENACYT
   * registrado. Ejecuta en background con JobRegistry; el endpoint devuelve
   * 202 + jobId inmediatamente.
   */
  async refreshRenacytTodos(actor: AuthenticatedUser): Promise<{ jobId: string; message: string }> {
    const candidatos = await this.repo.listAllDnisRenacyt();
    const jobId = `renacyt-refresh-${Date.now()}`;
    const job = this.jobs.crear(jobId, candidatos.length);
    this.jobs.enEjecucion(jobId);
    void this.ejecutarRefreshMasivo(jobId, candidatos, actor).catch((err) => {
      this.jobs.fallar(jobId, err instanceof Error ? err.message : String(err));
    });
    void job;
    return {
      jobId,
      message: `Job enqueued. Procesara ${candidatos.length} investigadores. Verifique progreso en sync/reportes.`,
    };
  }

  private async ejecutarRefreshMasivo(
    jobId: string,
    candidatos: Array<{ id_investigador: string }>,
    actor: AuthenticatedUser,
  ): Promise<void> {
    let ok = 0;
    const errores: Array<{ id: string; error: string }> = [];
    for (const c of candidatos) {
      try {
        const inv = await this.repo.findById(c.id_investigador);
        if (!inv?.renacyt_codigo_registro) {
          this.jobs.incrementar(jobId);
          continue;
        }
        const lookup = await this.renacyt.consultarInvestigador(inv.renacyt_codigo_registro);
        const now = Date.now();
        await this.repo.updateById(c.id_investigador, {
          renacyt_nivel: lookup.nivel,
          renacyt_grupo: lookup.grupo,
          renacyt_condicion: lookup.condicion,
          renacyt_orcid: lookup.orcid,
          renacyt_scopus_author_id: lookup.scopus_author_id,
          renacyt_fecha_informe_calificacion: lookup.fecha_informe_calificacion,
          renacyt_fecha_ultima_revision: lookup.fecha_ultima_revision,
          renacyt_formaciones_academicas_json: lookup.formaciones_academicas_json,
          renacyt_ficha_url: lookup.ficha_url,
          renacyt_fecha_ultima_sincronizacion: now,
        });
        await this.kardex.registrarCambioSiAplica(c.id_investigador, lookup, "refresh_masivo");
        ok++;
      } catch (err) {
        errores.push({
          id: c.id_investigador,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.jobs.incrementar(jobId);
      }
    }
    this.jobs.completar(jobId, { ok, errores });
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "renacyt.refresh.batch",
      "investigadores",
      "lote",
      JSON.stringify({ jobId, total: candidatos.length, ok, errores: errores.length }),
    );
  }

  async descargarConstanciaRenacyt(id: string): Promise<Buffer> {
    const inv = await this.repo.findById(id);
    if (!inv?.renacyt_codigo_registro) {
      throw AppError.notFound("El investigador no tiene codigo RENACYT registrado.");
    }
    return this.renacyt.descargarConstancia(inv.renacyt_codigo_registro);
  }
}
