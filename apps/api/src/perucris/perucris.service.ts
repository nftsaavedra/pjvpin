import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { AppError } from "../infra/errors/app-error";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { PeruCrisClient, type PeruCrisHit } from "../infra/http/perucris.client";

interface SyncReportItem {
  id_local: string | null;
  id_pure: string | null;
  doi: string | null;
  titulo: string | null;
  anio: number | null;
  clasificacion: "encontrado" | "no_encontrado" | "diferente";
  diferencias: string[];
  adoptable: boolean;
}

interface SyncReportResumen {
  total: number;
  solo_local: number;
  solo_pure: number;
  diferentes: number;
  tiempo_total_ms: number;
}

interface SyncReport {
  id: string;
  tipo: "perucris_validacion";
  ejecutado_at: number;
  resumen: SyncReportResumen;
  items: SyncReportItem[];
}

interface PeruCrisImportResultado {
  importados: number;
  omitidos: number;
  errores: string[];
}

const UNF_PERUCRIS_UUID = "97674e53-90f5-4e9c-b9a9-1c2efa766bd5";
const UNF_SCOPE_CONFIG = "RELATION.OrgUnit.projects";

function nowMs(): number {
  return Date.now();
}

function shortHash(uuid: string): string {
  let h = 5381;
  for (let i = 0; i < uuid.length; i++) {
    h = ((h << 5) + h + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 12);
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

@Injectable()
export class PeruCrisService {
  constructor(
    private readonly perucris: PeruCrisClient,
    private readonly audit: AuditService,
    @Inject(MONGO_DB) private readonly db: Db,
  ) {}

  /**
   * Valida la sincronizacion de personas contra PeruCRIS. Persiste el
   * reporte en `sync_reportes` (tipo `perucris_validacion`).
   */
  async validarSincronizacion(
    scope: "all" | "person" | "org" | "publication" = "all",
    actor: AuthenticatedUser,
  ): Promise<SyncReport> {
    const start = Date.now();
    const items: SyncReportItem[] = [];
    if (scope === "all" || scope === "person") {
      items.push(...(await this.validarPersonas()));
    }
    if (scope === "all" || scope === "org") {
      items.push(...(await this.validarOrganizaciones()));
    }
    if (scope === "all" || scope === "publication") {
      items.push(...(await this.validarPublicaciones()));
    }
    const resumen: SyncReportResumen = {
      total: items.length,
      solo_local: items.filter((i) => i.clasificacion === "no_encontrado").length,
      solo_pure: 0,
      diferentes: items.filter((i) => i.clasificacion === "diferente").length,
      tiempo_total_ms: Date.now() - start,
    };
    const report: SyncReport = {
      id: `sync-perucris-${nowMs()}`,
      tipo: "perucris_validacion",
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
      "perucris.validate",
      "validacion",
      scope,
      JSON.stringify({
        total: resumen.total,
        no_encontrados: resumen.solo_local,
        diferentes: resumen.diferentes,
      }),
    );
    return report;
  }

  async validarOrgUnit(id: string, actor: AuthenticatedUser): Promise<SyncReportItem> {
    const item = await this.validarUnaOrganizacion(id);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "perucris.validate.org_unit",
      "org_unit",
      id,
      JSON.stringify({ encontrado: item.clasificacion !== "no_encontrado" }),
    );
    return item;
  }

  async validarPublicacion(id: string, actor: AuthenticatedUser): Promise<SyncReportItem> {
    const item = await this.validarUnaPublicacion(id);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "perucris.validate.publication",
      "publicacion",
      id,
      JSON.stringify({ encontrado: item.clasificacion !== "no_encontrado" }),
    );
    return item;
  }

  /**
   * Push CERIF al endpoint de ingesta de PeruCRIS. Stub: la
   * serializacion completa del payload CERIF (OrgUnit/Person/Publication/
   * Project/Patent) aterriza en Bloque F3 con el port de `cerif.rs`.
   */
  async pushCerif(payload: unknown, actor: AuthenticatedUser) {
    const result = await this.perucris.pushCerif(payload);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "perucris.push",
      "perucris",
      "cerif/ingest",
      JSON.stringify({ status: result.status }),
    );
    return result;
  }

  /**
   * Lookup directo por DNI en el HAL publico. Usado por el pipeline
   * de import por DNI para capturar `perucris_uuid` sin instanciar un
   * SyncReport.
   */
  async resolverUuidPorDni(dni: string): Promise<string | null> {
    const hits = await this.perucris.searchByQuery(dni, 5).catch(() => []);
    const match = hits.find((h) => {
      const t = h.metadata.keys["dspace.entity.type"]?.[0]?.value;
      return t === "Person" || t === "ResearcherProfile";
    });
    return match?.uuid ?? null;
  }

  async importIniciales(actor: AuthenticatedUser): Promise<PeruCrisImportResultado> {
    const result: PeruCrisImportResultado = {
      importados: 0,
      omitidos: 0,
      errores: [],
    };
    result.importados += await this.importarProyectosUnf();
    result.importados += await this.importarPublicacionesUnf();
    void actor;
    return result;
  }

  private async validarPersonas(): Promise<SyncReportItem[]> {
    const personas = await this.db
      .collection<{ id_persona: string; dni: string; nombre_completo: string }>("personas")
      .find({}, { projection: { id_persona: 1, dni: 1, nombre_completo: 1 } })
      .limit(50)
      .toArray();
    const items: SyncReportItem[] = [];
    for (const persona of personas) {
      const hits = await this.perucris.searchByQuery(persona.dni, 5).catch(() => []);
      const match = hits.find((h) => {
        const t = h.metadata.keys["dspace.entity.type"]?.[0]?.value;
        return t === "Person" || t === "ResearcherProfile";
      });
      if (!match) {
        items.push({
          id_local: persona.id_persona,
          id_pure: null,
          doi: null,
          titulo: persona.nombre_completo,
          anio: null,
          clasificacion: "no_encontrado",
          diferencias: ["dni no encontrado en PeruCRIS"],
          adoptable: false,
        });
        continue;
      }
      items.push({
        id_local: persona.id_persona,
        id_pure: match.uuid,
        doi: null,
        titulo: persona.nombre_completo,
        anio: null,
        clasificacion: "encontrado",
        diferencias: [],
        adoptable: false,
      });
    }
    return items;
  }

  private async validarOrganizaciones(): Promise<SyncReportItem[]> {
    const orgs = await this.db
      .collection<{ id_org_unit: string; nombre: string; ruc: string | null }>("org_units")
      .find({}, { projection: { id_org_unit: 1, nombre: 1, ruc: 1 } })
      .limit(50)
      .toArray();
    const items: SyncReportItem[] = [];
    for (const org of orgs) {
      const item = await this.validarUnaOrganizacion(org.id_org_unit);
      if (item.id_local === null) {
        item.id_local = org.id_org_unit;
        item.titulo = org.nombre;
      }
      items.push(item);
    }
    return items;
  }

  private async validarUnaOrganizacion(id: string): Promise<SyncReportItem> {
    const org = await this.db
      .collection<{
        id_org_unit: string;
        nombre: string;
        ruc: string | null;
        ror_id: string | null;
        isni_id: string | null;
        perucris_uuid: string | null;
      }>("org_units")
      .findOne({ id_org_unit: id });
    if (!org) {
      throw AppError.notFound(`OrgUnit ${id} no encontrada.`);
    }
    const query = org.ruc ?? org.ror_id ?? org.isni_id ?? null;
    if (!query) {
      return {
        id_local: id,
        id_pure: null,
        doi: null,
        titulo: org.nombre,
        anio: null,
        clasificacion: "no_encontrado",
        diferencias: ["orgunit sin ruc/ror/isni: no buscable"],
        adoptable: false,
      };
    }
    if (org.perucris_uuid) {
      const direct = await this.perucris.findByUuid(org.perucris_uuid).catch(() => null);
      if (direct) {
        return {
          id_local: id,
          id_pure: direct.uuid,
          doi: null,
          titulo: org.nombre,
          anio: null,
          clasificacion: "encontrado",
          diferencias: [],
          adoptable: false,
        };
      }
    }
    const hits = await this.perucris.searchByQuery(query, 5).catch(() => []);
    const match = hits.find((h) => {
      const t = h.metadata.keys["dspace.entity.type"]?.[0]?.value;
      return t === "OrgUnit" || t === "InstitutionOrgUnit";
    });
    if (!match) {
      return {
        id_local: id,
        id_pure: null,
        doi: null,
        titulo: org.nombre,
        anio: null,
        clasificacion: "no_encontrado",
        diferencias: [],
        adoptable: false,
      };
    }
    return {
      id_local: id,
      id_pure: match.uuid,
      doi: null,
      titulo: org.nombre,
      anio: null,
      clasificacion: "encontrado",
      diferencias: [],
      adoptable: false,
    };
  }

  private async validarPublicaciones(): Promise<SyncReportItem[]> {
    const pubs = await this.db
      .collection<{ id_publicacion: string; titulo: string; doi: string | null }>(
        "publicaciones_cientificas",
      )
      .find({}, { projection: { id_publicacion: 1, titulo: 1, doi: 1 } })
      .limit(50)
      .toArray();
    const items: SyncReportItem[] = [];
    for (const pub of pubs) {
      const item = await this.validarUnaPublicacion(pub.id_publicacion);
      if (item.id_local === null) {
        item.id_local = pub.id_publicacion;
        item.titulo = pub.titulo;
        item.doi = pub.doi;
      }
      items.push(item);
    }
    return items;
  }

  private async validarUnaPublicacion(id: string): Promise<SyncReportItem> {
    const pub = await this.db
      .collection<{
        id_publicacion: string;
        titulo: string;
        doi: string | null;
        perucris_uuid: string | null;
      }>("publicaciones_cientificas")
      .findOne({ id_publicacion: id });
    if (!pub) {
      throw AppError.notFound(`Publicacion ${id} no encontrada.`);
    }
    if (pub.perucris_uuid) {
      const direct = await this.perucris.findByUuid(pub.perucris_uuid).catch(() => null);
      if (direct) {
        return {
          id_local: id,
          id_pure: direct.uuid,
          doi: pub.doi,
          titulo: pub.titulo,
          anio: null,
          clasificacion: "encontrado",
          diferencias: [],
          adoptable: false,
        };
      }
    }
    const query = pub.doi ?? pub.titulo;
    const hits = await this.perucris.searchByQuery(query, 10).catch(() => []);
    const match = hits.find(
      (h) => h.metadata.keys["dspace.entity.type"]?.[0]?.value === "Publication",
    );
    if (!match) {
      return {
        id_local: id,
        id_pure: null,
        doi: pub.doi,
        titulo: pub.titulo,
        anio: null,
        clasificacion: "no_encontrado",
        diferencias: [],
        adoptable: false,
      };
    }
    return {
      id_local: id,
      id_pure: match.uuid,
      doi: pub.doi,
      titulo: pub.titulo,
      anio: null,
      clasificacion: "encontrado",
      diferencias: [],
      adoptable: false,
    };
  }

  private async importarProyectosUnf(): Promise<number> {
    const hits: PeruCrisHit[] = await this.perucris
      .searchByScope(UNF_SCOPE_CONFIG, UNF_PERUCRIS_UUID, 100)
      .catch(() => []);
    const projects = hits.filter(
      (h) => h.metadata.keys["dspace.entity.type"]?.[0]?.value === "Project",
    );
    let importados = 0;
    const existing = await this.db
      .collection<{ perucris_uuid?: string; titulo_proyecto?: string }>("proyectos")
      .find({}, { projection: { perucris_uuid: 1, titulo_proyecto: 1 } })
      .toArray();
    const seenUuids = new Set(existing.map((e) => e.perucris_uuid).filter((u): u is string => !!u));
    const seenTitles = new Set(
      existing.map((e) => normalizeTitle(e.titulo_proyecto ?? "")).filter((t) => t.length > 0),
    );
    for (const remote of projects) {
      const title = remote.metadata.keys["dc.title"]?.[0]?.value ?? "";
      if (!title) continue;
      const key = normalizeTitle(title);
      if (seenUuids.has(remote.uuid) || seenTitles.has(key)) continue;
      const id = `proj-perucris-${shortHash(remote.uuid)}`;
      const codigo = remote.metadata.keys["dc.identifier.codigo"]?.[0]?.value;
      const doc: Record<string, unknown> = {
        id_proyecto: id,
        titulo_proyecto: title,
        activo: 1,
        created_at: nowMs(),
        updated_at: nowMs(),
        perucris_uuid: remote.uuid,
      };
      if (codigo) doc.codigo = codigo;
      if (remote.handle) doc.perucris_handle = remote.handle;
      try {
        await this.db
          .collection("proyectos")
          .insertOne(
            doc as unknown as Parameters<typeof this.db.collection>[0] extends Collection<infer T>
              ? T
              : never,
          );
        importados++;
      } catch {
        // duplicate key en re-import concurrente: ignorar
      }
    }
    return importados;
  }

  private async importarPublicacionesUnf(): Promise<number> {
    const hits: PeruCrisHit[] = await this.perucris
      .searchByScope(UNF_SCOPE_CONFIG, UNF_PERUCRIS_UUID, 100)
      .catch(() => []);
    const pubs = hits.filter(
      (h) => h.metadata.keys["dspace.entity.type"]?.[0]?.value === "Publication",
    );
    let importados = 0;
    const existing = await this.db
      .collection<{ perucris_uuid?: string; titulo?: string }>("publicaciones_cientificas")
      .find({}, { projection: { perucris_uuid: 1, titulo: 1 } })
      .toArray();
    const seenUuids = new Set(existing.map((e) => e.perucris_uuid).filter((u): u is string => !!u));
    for (const remote of pubs) {
      if (seenUuids.has(remote.uuid)) continue;
      const title = remote.metadata.keys["dc.title"]?.[0]?.value ?? "";
      const id = `pub-perucris-${shortHash(remote.uuid)}`;
      const doc: Record<string, unknown> = {
        id_publicacion: id,
        titulo: title,
        perucris_uuid: remote.uuid,
        dominio_origen: "PERUCRIS",
        updated_at: nowMs(),
        created_at: nowMs(),
        activo: 1,
      };
      try {
        await this.db
          .collection("publicaciones_cientificas")
          .insertOne(
            doc as unknown as Parameters<typeof this.db.collection>[0] extends Collection<infer T>
              ? T
              : never,
          );
        importados++;
      } catch {
        // duplicate key en re-import concurrente: ignorar
      }
    }
    return importados;
  }
}

export type { SyncReport, SyncReportItem };
