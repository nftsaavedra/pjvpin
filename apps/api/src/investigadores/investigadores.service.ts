import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { ReniecClient } from "../infra/http/reniec.client";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { JobRegistry } from "../external-http/job-registry.service";
import { KardexService } from "../kardex/kardex.service";
import type { KardexEntry } from "../kardex/kardex.logic";
import { RenacytService } from "../renacyt/renacyt.service";
import { PureService } from "../pure/pure.service";
import { PeruCrisService } from "../perucris/perucris.service";
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
import { IMPORT_BATCH_ASYNC_THRESHOLD, IMPORT_BATCH_CONCURRENCY } from "../config/defaults";

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
    private readonly pure: PureService,
    private readonly perucris: PeruCrisService,
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
   * Importa lote de DNIs ejecutando el pipeline multi-fuente:
   * RENIEC -> PeruCRIS (search_by_query DNI, captura perucris_uuid) ->
   * Pure (mapping maestro descargado 1 vez por lote, asigna pure_person_id) ->
   * RENACYT (nivel/codigo/grupo + kardex si hay cambios).
   *
   * Concurrencia 5 (IMPORT_BATCH_CONCURRENCY), circuit breaker RENIEC (skip
   * si >25 fallos consecutivos), idempotencia per-DNI (re-import no duplica).
   * Lote > IMPORT_BATCH_ASYNC_THRESHOLD: ejecuta en background con JobRegistry.
   */
  async importarDnis(
    dnis: string[],
    actor: AuthenticatedUser,
  ): Promise<ImportInvestigadoresResult | { jobId: string; message: string }> {
    const uniqueDnis = Array.from(new Set(dnis.filter((d) => /^\d{8}$/.test(d))));
    if (uniqueDnis.length > IMPORT_BATCH_ASYNC_THRESHOLD) {
      const jobId = `import-${Date.now()}`;
      this.jobs.crear(jobId, uniqueDnis.length);
      this.jobs.enEjecucion(jobId);
      void this.ejecutarImportMasivo(jobId, uniqueDnis, actor).catch((err) => {
        this.jobs.fallar(jobId, err instanceof Error ? err.message : String(err));
      });
      return {
        jobId,
        message: `Job enqueued. Procesara ${uniqueDnis.length} DNIs.`,
      };
    }
    return this.ejecutarImportSecuencial(uniqueDnis, actor);
  }

  private async ejecutarImportSecuencial(
    dnis: string[],
    actor: AuthenticatedUser,
  ): Promise<ImportInvestigadoresResult> {
    const result = this.nuevoResultadoImport(dnis.length);
    const dniToPureId = await this.descargarMapeoPure(dnis);
    let reniecFallos = 0;
    const circuitBreakerThreshold = 25;
    for (const dni of dnis) {
      result.procesados++;
      try {
        if (reniecFallos >= circuitBreakerThreshold) {
          result.errores.push({
            dni,
            fase: "reniec",
            error: "circuit_breaker_abierto",
          });
          continue;
        }
        await this.procesarDni(dni, dniToPureId, result, actor);
        reniecFallos = 0;
      } catch (err) {
        reniecFallos++;
        result.errores.push({
          dni,
          fase:
            err instanceof Error && err.message.includes("RENACYT")
              ? "renacyt"
              : err instanceof Error && err.message.includes("Pure")
                ? "pure"
                : err instanceof Error && err.message.includes("PeruCRIS")
                  ? "perucris"
                  : "reniec",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await this.auditImport(result, actor, dnis.length);
    return result;
  }

  private async ejecutarImportMasivo(
    jobId: string,
    dnis: string[],
    actor: AuthenticatedUser,
  ): Promise<void> {
    const result = this.nuevoResultadoImport(dnis.length);
    const dniToPureId = await this.descargarMapeoPure(dnis);
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < dnis.length) {
        const idx = cursor++;
        const dni = dnis[idx];
        try {
          await this.procesarDni(dni, dniToPureId, result, actor);
        } catch (err) {
          result.errores.push({
            dni,
            fase: "reniec",
            error: err instanceof Error ? err.message : String(err),
          });
        } finally {
          this.jobs.incrementar(jobId);
        }
      }
    };
    const pool = Array.from({ length: Math.min(IMPORT_BATCH_CONCURRENCY, dnis.length) }, () =>
      worker(),
    );
    await Promise.all(pool);
    this.jobs.completar(jobId, { total: result.total, ok: result.creados + result.actualizados });
    await this.auditImport(result, actor, dnis.length, jobId);
  }

  private async procesarDni(
    dni: string,
    dniToPureId: Map<string, string>,
    result: ImportInvestigadoresResult,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const r = await this.reniec.consultar(dni);
    if (r.fullName) result.reniec_ok++;
    const existing = await this.repo.findByDni(dni);
    const now = Date.now();
    let id_investigador: string;
    if (existing) {
      id_investigador = existing.id_investigador;
      await this.repo.updateById(id_investigador, {
        nombres: r.firstName,
        apellido_paterno: r.firstLastName,
        apellido_materno: r.secondLastName,
        nombre_completo: r.fullName,
        renacyt_fecha_ultima_sincronizacion: now,
      });
      result.actualizados++;
    } else {
      id_investigador = `investigador-${dni}`;
      const id_persona = `persona-${dni}`;
      await this.repo.insert({
        id_investigador,
        dni,
        id_persona,
        nombres: r.firstName,
        apellido_paterno: r.firstLastName,
        apellido_materno: r.secondLastName,
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
    // PeruCRIS: lookup por DNI (Person/ResearcherProfile)
    try {
      const perucrisUuid = await this.perucris.resolverUuidPorDni(dni);
      if (perucrisUuid) {
        await this.repo.updateById(id_investigador, { perucris_uuid: perucrisUuid });
        result.perucris_ok++;
      }
    } catch {
      // fase perucris opcional
    }
    // Pure: resolver pure_person_id del mapping maestro
    const pid = dniToPureId.get(dni);
    if (pid) {
      await this.repo.updateById(id_investigador, { pure_person_id: pid });
      result.pure_ok++;
    }
    // RENACYT: buscar por DNI y refrescar
    try {
      const renacytHit = await this.renacyt.buscarPorDni(dni);
      if (renacytHit?.codigo_registro) {
        await this.repo.updateById(id_investigador, {
          renacyt_codigo_registro: renacytHit.codigo_registro,
          renacyt_id_investigador: renacytHit.id_investigador || null,
          renacyt_nivel: renacytHit.nivel || null,
          renacyt_grupo: renacytHit.grupo || null,
          renacyt_condicion: renacytHit.condicion || null,
          renacyt_orcid: renacytHit.orcid || null,
          renacyt_fecha_ultima_sincronizacion: now,
        });
        try {
          await this.refrescarFormacionRenacyt(id_investigador, actor);
        } catch {
          // kardex falla no aborta
        }
        result.renacyt_ok++;
      }
    } catch {
      // fase renacyt opcional
    }
  }

  private async descargarMapeoPure(dnis: string[]): Promise<Map<string, string>> {
    try {
      const map = await this.pure.descargarMapeoMaestroDni();
      const filtered = new Map<string, string>();
      for (const d of dnis) {
        const pid = map.get(d);
        if (pid) filtered.set(d, pid);
      }
      return filtered;
    } catch {
      return new Map();
    }
  }

  private nuevoResultadoImport(total: number): ImportInvestigadoresResult {
    return {
      total,
      procesados: 0,
      creados: 0,
      actualizados: 0,
      reniec_ok: 0,
      perucris_ok: 0,
      pure_ok: 0,
      renacyt_ok: 0,
      errores: [],
    };
  }

  private async auditImport(
    result: ImportInvestigadoresResult,
    actor: AuthenticatedUser,
    total: number,
    jobId?: string,
  ): Promise<void> {
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "investigador.import",
      "investigador.import",
      "lote",
      JSON.stringify({
        jobId: jobId ?? null,
        total,
        ok: result.creados + result.actualizados,
        reniec_ok: result.reniec_ok,
        perucris_ok: result.perucris_ok,
        pure_ok: result.pure_ok,
        renacyt_ok: result.renacyt_ok,
        errores: result.errores.length,
      }),
    );
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
    this.jobs.crear(jobId, candidatos.length);
    this.jobs.enEjecucion(jobId);
    void this.ejecutarRefreshMasivo(jobId, candidatos, actor).catch((err) => {
      this.jobs.fallar(jobId, err instanceof Error ? err.message : String(err));
    });
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
    const CONCURRENCY = 5;
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < candidatos.length) {
        const idx = cursor++;
        const c = candidatos[idx];
        try {
          const inv = await this.repo.findById(c.id_investigador);
          if (!inv?.renacyt_codigo_registro) {
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
    };
    const pool = Array.from({ length: Math.min(CONCURRENCY, candidatos.length) }, () => worker());
    await Promise.all(pool);
    this.jobs.completar(jobId, { ok, errores });
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "renacyt.refresh.batch",
      "investigadores",
      "lote",
      JSON.stringify({ jobId, total: candidatos.length, ok, errores: errores.length }),
    );
  }

  async descargarConstanciaRenacyt(id: string, actor: AuthenticatedUser): Promise<Buffer> {
    const inv = await this.repo.findById(id);
    if (!inv?.renacyt_codigo_registro) {
      throw AppError.notFound("El investigador no tiene codigo RENACYT registrado.");
    }
    const bytes = await this.renacyt.descargarConstancia(inv.renacyt_codigo_registro);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "renacyt.constancia.download",
      "investigador",
      id,
      JSON.stringify({
        codigo: inv.renacyt_codigo_registro,
        bytes: bytes.length,
      }),
    );
    return bytes;
  }
}
