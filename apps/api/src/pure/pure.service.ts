import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { AppError } from "../infra/errors/app-error";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import {
  PureClient,
  type FetchedPublication,
  type PurePersonMapping,
} from "../infra/http/pure.client";

interface PublicacionCientificaDoc {
  id_publicacion?: string;
  pure_uuid?: string;
  doi?: string | null;
  titulo: string;
  anio?: number | null;
  autores_json?: string;
  dominio_origen?: string;
}

interface InvestigadorPureRef {
  id_investigador: string;
  renacyt_scopus_author_id: string | null;
  pure_person_id: string | null;
}

interface SyncReportResumenDto {
  total: number;
  solo_local: number;
  solo_pure: number;
  diferentes: number;
  tiempo_total_ms: number;
}

type ItemClasificacion = "solo_local" | "solo_pure" | "diferente";

interface SyncReportItemDto {
  id_local: string | null;
  id_pure: string | null;
  doi: string | null;
  titulo: string | null;
  anio: number | null;
  clasificacion: ItemClasificacion;
  diferencias: string[];
  adoptable: boolean;
}

interface SyncReportDto {
  id: string;
  tipo: "pure_diff" | "perucris_validacion";
  ejecutado_at: number;
  resumen: SyncReportResumenDto;
  items: SyncReportItemDto[];
}

function nowMs(): number {
  return Date.now();
}

function normDoi(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = value.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

function mapPureTipo(tipo: string | null): string {
  if (!tipo) return "otros";
  const t = tipo.toLowerCase();
  if (t.includes("article")) return "articulo";
  if (t.includes("book")) return "libro";
  if (t.includes("conference") || t.includes("proceeding")) return "conferencia";
  if (t.includes("chapter")) return "capitulo";
  if (t.includes("software")) return "software";
  if (t.includes("dataset")) return "dataset";
  if (t.includes("working paper")) return "working_paper";
  return "otros";
}

@Injectable()
export class PureService {
  constructor(
    private readonly pure: PureClient,
    private readonly audit: AuditService,
    @Inject(MONGO_DB) private readonly db: Db,
  ) {}

  /**
   * Sincroniza las publicaciones de un investigador desde Pure.
   * - Upsert en `publicaciones_cientificas` por `pure_uuid` UNIQUE sparse.
   * - Popula `publicacion_autores` resolviendo por `nombre_completo`.
   * - Marca `dominio_origen: "PURE"`.
   *
   * Idempotente: re-ejecuciones sobre los mismos `pure_uuid` no duplican.
   */
  async syncPublicaciones(
    idInvestigador: string,
    actor: AuthenticatedUser,
  ): Promise<{ fetched: number; upserted: number }> {
    const inv = await this.db
      .collection<InvestigadorPureRef>("investigadores")
      .findOne({ id_investigador: idInvestigador });
    if (!inv) throw AppError.notFound("Investigador no encontrado.");
    const scopusAuthorId = inv.renacyt_scopus_author_id?.trim() ?? "";
    if (!scopusAuthorId) {
      throw AppError.external(
        "El investigador no tiene Scopus Author ID registrado. Sincronice primero los datos RENACYT.",
      );
    }
    const fetched = await this.pure.fetchResearchOutputsByScopusId(scopusAuthorId);
    const coll = this.db.collection<PublicacionCientificaDoc>("publicaciones_cientificas");
    let upserted = 0;
    for (const pub of fetched) {
      if (!pub.pure_uuid) continue;
      const idPublicacion = `pub-pure-${pub.pure_uuid}`;
      await coll.updateOne(
        { id_publicacion: idPublicacion },
        {
          $set: {
            id_publicacion: idPublicacion,
            pure_uuid: pub.pure_uuid,
            doi: pub.doi,
            titulo: pub.titulo,
            anio: pub.anio_publicacion,
            autores_json: pub.autores_json,
            dominio_origen: "PURE",
            tipo: mapPureTipo(pub.tipo_publicacion),
            journal_titulo: pub.journal_titulo,
            issn: pub.issn,
            estado_publicacion: pub.estado_publicacion,
            updated_at: nowMs(),
          },
        },
        { upsert: true },
      );
      await this.poblarPivotAutores(idPublicacion, idInvestigador, pub.autores_json);
      upserted++;
    }
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "pure.sync.publicaciones",
      "investigador",
      idInvestigador,
      JSON.stringify({ fetched: fetched.length, upserted }),
    );
    return { fetched: fetched.length, upserted };
  }

  /**
   * Sincroniza el mapeo maestro DNI -> pure_person_id descargando el master
   * list de Pure y actualizando `investigadores.pure_person_id`.
   *
   * Idempotente: re-ejecuciones actualizan el mismo campo sin duplicar.
   */
  async sincronizarPersonIds(actor: AuthenticatedUser): Promise<{
    fetched: number;
    matched: number;
    unmatched: number;
  }> {
    const byDni = await this.descargarMapeoMaestroDni();
    let matched = 0;
    let unmatched = 0;
    const invs = await this.db
      .collection<{ id_investigador: string; dni: string; pure_person_id: string | null }>(
        "investigadores",
      )
      .find({}, { projection: { id_investigador: 1, dni: 1, pure_person_id: 1 } })
      .toArray();
    for (const inv of invs) {
      const pid = byDni.get(inv.dni);
      if (pid && pid !== inv.pure_person_id) {
        await this.db
          .collection("investigadores")
          .updateOne(
            { id_investigador: inv.id_investigador },
            { $set: { pure_person_id: pid, updated_at: nowMs() } },
          );
        matched++;
      } else if (!pid) {
        unmatched++;
      }
    }
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "pure.sync.person_ids",
      "investigadores",
      "lote",
      JSON.stringify({ fetched: byDni.size, matched, unmatched }),
    );
    return { fetched: byDni.size, matched, unmatched };
  }

  /**
   * Descarga una vez el master list de Pure y devuelve un `Map<DNI, pure_person_id>`.
   * Usado por el pipeline de import por DNI (T11) para resolver personas
   * sin re-descargar el master por cada investigador.
   */
  async descargarMapeoMaestroDni(): Promise<Map<string, string>> {
    const mapping = await this.pure.fetchAllPersonsMapping();
    const byDni = new Map<string, string>();
    for (const m of mapping) {
      if (m.dni && /^\d{8}$/.test(m.dni)) {
        byDni.set(m.dni, m.pure_person_id);
      }
    }
    return byDni;
  }

  /**
   * Verifica las publicaciones de un investigador contra Pure (read-only).
   * Persiste el resultado en `sync_reportes` (tipo `pure_diff`).
   */
  async verificarDiferencias(
    idInvestigador: string,
    actor: AuthenticatedUser,
  ): Promise<SyncReportDto> {
    const inv = await this.db
      .collection<InvestigadorPureRef>("investigadores")
      .findOne({ id_investigador: idInvestigador });
    if (!inv) throw AppError.notFound("Investigador no encontrado.");
    const scopusAuthorId = inv.renacyt_scopus_author_id?.trim() ?? "";
    if (!scopusAuthorId) {
      throw AppError.external(
        "El investigador no tiene Scopus Author ID registrado. Sincronice primero los datos RENACYT.",
      );
    }
    const start = Date.now();
    const remotas = await this.pure.fetchResearchOutputsByScopusId(scopusAuthorId);
    const locales = await this.publicacionesPorInvestigador(idInvestigador);
    const items: SyncReportItemDto[] = [];
    const matchedRemote = new Set<string>();
    for (const local of locales) {
      const r = remotas.find(
        (rr) =>
          rr.pure_uuid === local.pure_uuid ||
          (rr.doi && normDoi(rr.doi) === normDoi(local.doi ?? null)),
      );
      if (r) {
        matchedRemote.add(r.pure_uuid);
        const diffs = compareFields(local, r);
        if (diffs.length > 0) {
          items.push({
            id_local: local.id_publicacion ?? null,
            id_pure: r.pure_uuid,
            doi: r.doi,
            titulo: r.titulo,
            anio: r.anio_publicacion,
            clasificacion: "diferente",
            diferencias: diffs,
            adoptable: false,
          });
        }
      } else {
        items.push({
          id_local: local.id_publicacion ?? null,
          id_pure: local.pure_uuid ?? null,
          doi: local.doi ?? null,
          titulo: local.titulo,
          anio: local.anio ?? null,
          clasificacion: "solo_local",
          diferencias: [],
          adoptable: false,
        });
      }
    }
    for (const r of remotas) {
      if (matchedRemote.has(r.pure_uuid)) continue;
      items.push({
        id_local: null,
        id_pure: r.pure_uuid,
        doi: r.doi,
        titulo: r.titulo,
        anio: r.anio_publicacion,
        clasificacion: "solo_pure",
        diferencias: [],
        adoptable: false,
      });
    }
    const resumen: SyncReportResumenDto = {
      total: this.contarUniverso(locales, remotas),
      solo_local: items.filter((i) => i.clasificacion === "solo_local").length,
      solo_pure: items.filter((i) => i.clasificacion === "solo_pure").length,
      diferentes: items.filter((i) => i.clasificacion === "diferente").length,
      tiempo_total_ms: Date.now() - start,
    };
    const report: SyncReportDto = {
      id: `sync-${idInvestigador}-${nowMs()}`,
      tipo: "pure_diff",
      ejecutado_at: nowMs(),
      resumen,
      items,
    };
    await this.db
      .collection("sync_reportes")
      .insertOne(
        report as unknown as Parameters<typeof this.db.collection>[0] extends Collection<infer T>
          ? T
          : never,
      );
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "pure.diff",
      "investigador",
      idInvestigador,
      JSON.stringify({
        resumen,
        items: items.length,
      }),
    );
    return report;
  }

  private async poblarPivotAutores(
    idPublicacion: string,
    idInvestigadorPrincipal: string,
    autoresJson: string,
  ): Promise<void> {
    let autores: string[];
    try {
      autores = JSON.parse(autoresJson) as string[];
    } catch {
      autores = [];
    }
    await this.db.collection("publicacion_autores").deleteMany({ id_publicacion: idPublicacion });
    if (autores.length === 0) return;
    const personas = await this.db
      .collection<{ id_persona: string; nombre_completo: string }>("personas")
      .find({}, { projection: { id_persona: 1, nombre_completo: 1 } })
      .toArray();
    const ordenados = autores.map((nombre) => {
      const match = personas.find(
        (p) => p.nombre_completo?.toLowerCase().trim() === nombre.toLowerCase().trim(),
      );
      return {
        id_publicacion: idPublicacion,
        id_persona: match?.id_persona ?? null,
        nombre_raw: nombre,
        orden: 0,
        es_autor_correspondiente: false,
      };
    });
    void idInvestigadorPrincipal;
    if (ordenados.length > 0) {
      await this.db
        .collection("publicacion_autores")
        .insertMany(
          ordenados as unknown as Parameters<typeof this.db.collection>[0] extends Collection<
            infer T
          >
            ? T[]
            : never[],
        );
    }
  }

  private async publicacionesPorInvestigador(
    idInvestigador: string,
  ): Promise<PublicacionCientificaDoc[]> {
    const inv = await this.db
      .collection<{ id_investigador: string; id_persona?: string }>("investigadores")
      .findOne({ id_investigador: idInvestigador });
    const idPersona = inv?.id_persona ?? idInvestigador;
    const pivot = await this.db
      .collection<{ id_publicacion: string }>("publicacion_autores")
      .find({ id_persona: idPersona }, { projection: { id_publicacion: 1 } })
      .toArray();
    const ids = pivot.map((p) => p.id_publicacion);
    if (ids.length === 0) return [];
    return this.db
      .collection<PublicacionCientificaDoc>("publicaciones_cientificas")
      .find({ id_publicacion: { $in: ids } })
      .toArray();
  }

  private contarUniverso(
    locales: PublicacionCientificaDoc[],
    remotas: FetchedPublication[],
  ): number {
    const emparejadas = remotas.filter((r) => {
      return locales.some(
        (l) =>
          (l.pure_uuid && l.pure_uuid === r.pure_uuid) ||
          (l.doi && r.doi && normDoi(l.doi) === normDoi(r.doi)),
      );
    }).length;
    return locales.length + remotas.length - emparejadas;
  }
}

function compareFields(local: PublicacionCientificaDoc, remota: FetchedPublication): string[] {
  const diffs: string[] = [];
  if ((local.titulo ?? "").trim() !== remota.titulo.trim()) diffs.push("titulo");
  if ((local.anio ?? null) !== remota.anio_publicacion) diffs.push("anio");
  if (normDoi(local.doi ?? null) !== normDoi(remota.doi ?? null)) diffs.push("doi");
  return diffs;
}

export type { PurePersonMapping, FetchedPublication, SyncReportDto };
