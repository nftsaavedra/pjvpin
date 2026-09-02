/**
 * Repositorio CERIF — loaders por lote (`$in`) para el exportador.
 *
 * Port de los loaders de `apps/desktop/src-tauri/src/reportes/cerif.rs`
 * con optimización: en lugar de N+1 por entidad, carga todos los pivots
 * y campos OCDE en una query `$in` por colección y agrupa en memoria.
 *
 * Filtros exactos verificados contra el Rust:
 *  - org_units: `{activo:1}`
 *  - proyectos: `{activo:true}`
 *  - patentes: `{activo:1}`
 *  - financiamientos: `{activo:1}`
 *  - publicaciones_cientificas: `{activo:1}` (get_all)
 *  - investigadores: `{activo:1}` (get_all_investigadores)
 *  - personas: `{}` (load_all_map, sin filtro de activo)
 *  - entity_ocde_fields: `{entity_type, entity_id}` (sin filtro)
 */

import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import { ENTITY_TYPE_ORG_UNIT, ENTITY_TYPE_PATENT, ENTITY_TYPE_PROJECT } from "./cerif.vocab";
import type {
  FinanciamientoInput,
  FinanciamientoPivotInput,
  InvestigadorInput,
  OrgUnitInput,
  ParticipacionInput,
  PatenteInventorInput,
  PatenteInput,
  PatenteTitularInput,
  PersonaInput,
  ProyectoInput,
  ProyectoOrganizacionInput,
  PublicacionAutorInput,
  PublicacionInput,
} from "./cerif.logic";

// ─── Tipos de carga ─────────────────────────────────────────────────────────

export interface OrgUnitLoadResult {
  org: OrgUnitInput;
  ocde: string[];
}

export interface ProyectoLoadResult {
  proyecto: ProyectoInput;
  participaciones: ParticipacionInput[];
  financiamientos: Array<{ pivot: FinanciamientoPivotInput; fin: FinanciamientoInput }>;
  organizaciones: ProyectoOrganizacionInput[];
  ocde: string[];
}

export interface PublicacionLoadResult {
  pub: PublicacionInput;
  autores: PublicacionAutorInput[];
}

export interface PatenteLoadResult {
  patente: PatenteInput;
  inventores: PatenteInventorInput[];
  titulares: PatenteTitularInput[];
  ocde: string[];
}

// ─── Document shapes (MongoDB raw) ──────────────────────────────────────────

interface OrgUnitDoc {
  id_org_unit: string;
  nombre: string;
  tipo_organizacion?: string;
  tipo_dependencia?: string | null;
  es_publica?: boolean;
  ruc?: string | null;
  ror_id?: string | null;
  isni_id?: string | null;
  scopus_id?: string | null;
  ubigeo_codigo?: string | null;
  sector_institucional?: string | null;
  tipo_educacion_superior?: string | null;
  ciiu_codigo?: string | null;
  parent_id?: string | null;
  perucris_uuid?: string | null;
  perucris_handle?: string | null;
}

interface PersonaDoc {
  id_persona: string;
  dni: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  nombre_completo?: string;
  sexo?: string | null;
}

interface InvestigadorDoc {
  id_investigador: string;
  persona_id: string;
  tipo_documento?: string | null;
  renacyt_orcid?: string | null;
  renacyt_scopus_author_id?: string | null;
  renacyt_codigo_registro?: string | null;
  renacyt_nivel?: string | null;
}

interface ProyectoDoc {
  id_proyecto: string;
  titulo_proyecto?: string;
  codigo?: string;
  tipo_actividad_ocde?: string | null;
  ambito_geografico?: string | null;
  estado_concytec?: string | null;
  tematica_ambiental?: string | null;
  tematica_salud?: string | null;
  campo_ocde?: string | null;
  programas_relacionados?: string[];
  perucris_uuid?: string | null;
}

interface ParticipacionDoc {
  id_investigador: string;
  id_proyecto: string;
  rol: string;
  es_responsable?: boolean;
  id_org_unit_afiliacion?: string | null;
  horas_dedicacion_semanal?: number | null;
}

interface ProyectoFinanciamientoDoc {
  id_financiamiento: string;
  id_proyecto: string;
  monto_asignado?: number | null;
  moneda?: string;
}

interface FinanciamientoDoc {
  id_financiamiento: string;
  codigo?: string | null;
  nombre?: string | null;
  modalidad?: string | null;
  id_org_unit_financiadora?: string | null;
  monto?: number | null;
}

interface ProyectoOrganizacionDoc {
  id_org_unit: string;
  id_proyecto: string;
  rol: string;
}

interface PublicacionDoc {
  id_publicacion: string;
  titulo?: string;
  tipo?: string;
  doi?: string | null;
  issn?: string | null;
  isbn?: string | null;
  anio?: number | null;
  fecha_publicacion?: number | null;
  revista_titulo?: string | null;
  editorial?: string | null;
  id_org_unit_editora?: string | null;
  volumen?: string | null;
  numero_issue?: string | null;
  paginas?: string | null;
  idioma?: string | null;
  resumen?: string | null;
  palabras_clave?: string[];
  acceso_abierto?: string | null;
  scimago_cuartil?: string | null;
  wos_cuartil?: string | null;
  es_revisado_por_pares?: boolean;
  handle_url?: string | null;
  estado_publicacion?: string | null;
  dominio_origen?: string;
  pure_uuid?: string | null;
  id_proyecto?: string | null;
}

interface PublicacionAutorDoc {
  id_persona: string;
  id_publicacion: string;
  orden?: number;
  es_autor_correspondiente?: boolean;
  id_org_unit_afiliacion?: string | null;
}

interface PatenteDoc {
  id_patente: string;
  titulo?: string;
  numero_patente?: string | null;
  tipo?: string | null;
  estado?: string | null;
  fecha_solicitud?: number | null;
  fecha_concesion?: number | null;
  pais?: string | null;
  entidad_concedente?: string | null;
  id_org_unit_concedente?: string | null;
  clasificacion_ipc?: string | null;
  descripcion?: string | null;
  proyecto_id?: string | null;
}

interface PatenteInventorDoc {
  id_persona: string;
  id_patente: string;
  orden?: number;
}

interface PatenteTitularDoc {
  holder_type: string;
  id_org_unit?: string | null;
  id_persona?: string | null;
  id_patente: string;
  orden?: number;
}

interface OcdeFieldDoc {
  entity_type: string;
  entity_id: string;
  ocde_codigo: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    let arr = map.get(k);
    if (!arr) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(item);
  }
  return map;
}

// ─── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class CerifRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  // ── OrgUnits ──────────────────────────────────────────────────────────────

  async loadOrgUnits(): Promise<OrgUnitLoadResult[]> {
    const docs = await this.db
      .collection<OrgUnitDoc>("org_units")
      .find({ activo: 1 })
      .toArray();

    const ids = docs.map((d) => d.id_org_unit);
    const ocdeMap = await this.loadOcdeMap(ENTITY_TYPE_ORG_UNIT, ids);

    return docs
      .map((d) => ({
        org: {
          id_org_unit: d.id_org_unit,
          nombre: d.nombre ?? "",
          tipo_organizacion: d.tipo_organizacion ?? "",
          tipo_dependencia: d.tipo_dependencia ?? null,
          es_publica: d.es_publica ?? false,
          ruc: d.ruc ?? null,
          ror_id: d.ror_id ?? null,
          isni_id: d.isni_id ?? null,
          scopus_id: d.scopus_id ?? null,
          ubigeo_codigo: d.ubigeo_codigo ?? null,
          sector_institucional: d.sector_institucional ?? null,
          tipo_educacion_superior: d.tipo_educacion_superior ?? null,
          ciiu_codigo: d.ciiu_codigo ?? null,
          parent_id: d.parent_id ?? null,
          perucris_uuid: d.perucris_uuid ?? null,
          perucris_handle: d.perucris_handle ?? null,
        },
        ocde: ocdeMap.get(d.id_org_unit) ?? [],
      }))
      .sort((a, b) => a.org.id_org_unit.localeCompare(b.org.id_org_unit));
  }

  // ── Personas + Investigadores ─────────────────────────────────────────────

  async loadPersonas(): Promise<PersonaInput[]> {
    const docs = await this.db.collection<PersonaDoc>("personas").find({}).toArray();
    return docs.map((d) => ({
      id_persona: d.id_persona,
      dni: d.dni,
      nombres: d.nombres ?? null,
      apellido_paterno: d.apellido_paterno ?? null,
      apellido_materno: d.apellido_materno ?? null,
      nombre_completo: d.nombre_completo ?? "",
      sexo: d.sexo ?? null,
    }));
  }

  async loadInvestigadores(): Promise<InvestigadorInput[]> {
    const docs = await this.db
      .collection<InvestigadorDoc>("investigadores")
      .find({ activo: 1 })
      .toArray();
    return docs.map((d) => ({
      id_investigador: d.id_investigador,
      persona_id: d.persona_id,
      tipo_documento: d.tipo_documento ?? null,
      renacyt_orcid: d.renacyt_orcid ?? null,
      renacyt_scopus_author_id: d.renacyt_scopus_author_id ?? null,
      renacyt_codigo_registro: d.renacyt_codigo_registro ?? null,
      renacyt_nivel: d.renacyt_nivel ?? null,
    }));
  }

  // ── Proyectos ─────────────────────────────────────────────────────────────

  async loadProyectos(): Promise<ProyectoLoadResult[]> {
    const docs = await this.db
      .collection<ProyectoDoc>("proyectos")
      .find({ activo: true })
      .toArray();

    if (docs.length === 0) return [];

    const ids = docs.map((d) => d.id_proyecto);

    const [partDocs, pfDocs, poDocs, ocdeMap] = await Promise.all([
      this.db
        .collection<ParticipacionDoc>("participaciones")
        .find({ id_proyecto: { $in: ids } })
        .toArray(),
      this.db
        .collection<ProyectoFinanciamientoDoc>("proyecto_financiamientos")
        .find({ id_proyecto: { $in: ids } })
        .toArray(),
      this.db
        .collection<ProyectoOrganizacionDoc>("proyecto_organizaciones")
        .find({ id_proyecto: { $in: ids } })
        .toArray(),
      this.loadOcdeMap(ENTITY_TYPE_PROJECT, ids),
    ]);

    const partMap = groupBy(partDocs, (d) => d.id_proyecto);
    const pfMap = groupBy(pfDocs, (d) => d.id_proyecto);
    const poMap = groupBy(poDocs, (d) => d.id_proyecto);

    const finIds = [...new Set(pfDocs.map((d) => d.id_financiamiento))];
    const finDocs =
      finIds.length > 0
        ? await this.db
            .collection<FinanciamientoDoc>("financiamientos")
            .find({ id_financiamiento: { $in: finIds }, activo: 1 })
            .toArray()
        : [];
    const finMap = new Map(finDocs.map((f) => [f.id_financiamiento, f]));

    return docs
      .map((d) => {
        const parts: ParticipacionInput[] = (partMap.get(d.id_proyecto) ?? []).map((p) => ({
          id_investigador: p.id_investigador,
          id_proyecto: p.id_proyecto,
          rol: p.rol,
          es_responsable: p.es_responsable ?? false,
          id_org_unit_afiliacion: p.id_org_unit_afiliacion ?? null,
          horas_dedicacion_semanal: p.horas_dedicacion_semanal ?? null,
        }));

        const fins: Array<{ pivot: FinanciamientoPivotInput; fin: FinanciamientoInput }> = (
          pfMap.get(d.id_proyecto) ?? []
        )
          .map((pf) => {
            const fin = finMap.get(pf.id_financiamiento);
            if (!fin) return null;
            return {
              pivot: {
                id_financiamiento: pf.id_financiamiento,
                id_proyecto: pf.id_proyecto,
                monto_asignado: pf.monto_asignado ?? null,
                moneda: pf.moneda ?? "PEN",
              },
              fin: {
                id_financiamiento: fin.id_financiamiento,
                codigo: fin.codigo ?? null,
                nombre: fin.nombre ?? null,
                modalidad: fin.modalidad ?? null,
                id_org_unit_financiadora: fin.id_org_unit_financiadora ?? null,
                monto: fin.monto ?? null,
              },
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        const orgs: ProyectoOrganizacionInput[] = (poMap.get(d.id_proyecto) ?? []).map((po) => ({
          id_org_unit: po.id_org_unit,
          id_proyecto: po.id_proyecto,
          rol: po.rol,
        }));

        return {
          proyecto: {
            id_proyecto: d.id_proyecto,
            titulo_proyecto: d.titulo_proyecto ?? "",
            codigo: d.codigo ?? "",
            tipo_actividad_ocde: d.tipo_actividad_ocde ?? null,
            ambito_geografico: d.ambito_geografico ?? null,
            estado_concytec: d.estado_concytec ?? null,
            tematica_ambiental: d.tematica_ambiental ?? null,
            tematica_salud: d.tematica_salud ?? null,
            campo_ocde: d.campo_ocde ?? null,
            programas_relacionados: d.programas_relacionados ?? [],
            perucris_uuid: d.perucris_uuid ?? null,
          },
          participaciones: parts,
          financiamientos: fins,
          organizaciones: orgs,
          ocde: ocdeMap.get(d.id_proyecto) ?? [],
        };
      })
      .sort((a, b) => a.proyecto.id_proyecto.localeCompare(b.proyecto.id_proyecto));
  }

  // ── Publicaciones ─────────────────────────────────────────────────────────

  async loadPublicaciones(): Promise<PublicacionLoadResult[]> {
    const docs = await this.db
      .collection<PublicacionDoc>("publicaciones_cientificas")
      .find({ activo: 1 })
      .toArray();

    if (docs.length === 0) return [];

    const ids = docs.map((d) => d.id_publicacion);
    const autorDocs = await this.db
      .collection<PublicacionAutorDoc>("publicacion_autores")
      .find({ id_publicacion: { $in: ids } })
      .toArray();
    const autorMap = groupBy(autorDocs, (d) => d.id_publicacion);

    return docs
      .map((d) => ({
        pub: {
          id_publicacion: d.id_publicacion,
          titulo: d.titulo ?? "",
          tipo: d.tipo ?? "articulo",
          doi: d.doi ?? null,
          issn: d.issn ?? null,
          isbn: d.isbn ?? null,
          anio: d.anio ?? null,
          fecha_publicacion: d.fecha_publicacion ?? null,
          revista_titulo: d.revista_titulo ?? null,
          editorial: d.editorial ?? null,
          id_org_unit_editora: d.id_org_unit_editora ?? null,
          volumen: d.volumen ?? null,
          numero_issue: d.numero_issue ?? null,
          paginas: d.paginas ?? null,
          idioma: d.idioma ?? null,
          resumen: d.resumen ?? null,
          palabras_clave: d.palabras_clave ?? [],
          acceso_abierto: d.acceso_abierto ?? null,
          scimago_cuartil: d.scimago_cuartil ?? null,
          wos_cuartil: d.wos_cuartil ?? null,
          es_revisado_por_pares: d.es_revisado_por_pares ?? false,
          handle_url: d.handle_url ?? null,
          estado_publicacion: d.estado_publicacion ?? null,
          dominio_origen: d.dominio_origen ?? "MANUAL",
          pure_uuid: d.pure_uuid ?? null,
          id_proyecto: d.id_proyecto ?? null,
        },
        autores: (autorMap.get(d.id_publicacion) ?? []).map((a) => ({
          id_persona: a.id_persona,
          id_publicacion: a.id_publicacion,
          orden: a.orden ?? 0,
          es_autor_correspondiente: a.es_autor_correspondiente ?? false,
          id_org_unit_afiliacion: a.id_org_unit_afiliacion ?? null,
        })),
      }))
      .sort((a, b) => a.pub.id_publicacion.localeCompare(b.pub.id_publicacion));
  }

  // ── Patentes ──────────────────────────────────────────────────────────────

  async loadPatentes(): Promise<PatenteLoadResult[]> {
    const docs = await this.db
      .collection<PatenteDoc>("patentes")
      .find({ activo: 1 })
      .toArray();

    if (docs.length === 0) return [];

    const ids = docs.map((d) => d.id_patente);

    const [invDocs, titDocs, ocdeMap] = await Promise.all([
      this.db
        .collection<PatenteInventorDoc>("patente_inventores")
        .find({ id_patente: { $in: ids } })
        .toArray(),
      this.db
        .collection<PatenteTitularDoc>("patente_titulares")
        .find({ id_patente: { $in: ids } })
        .toArray(),
      this.loadOcdeMap(ENTITY_TYPE_PATENT, ids),
    ]);

    const invMap = groupBy(invDocs, (d) => d.id_patente);
    const titMap = groupBy(titDocs, (d) => d.id_patente);

    return docs
      .map((d) => ({
        patente: {
          id_patente: d.id_patente,
          titulo: d.titulo ?? "",
          numero_patente: d.numero_patente ?? null,
          tipo: d.tipo ?? null,
          estado: d.estado ?? null,
          fecha_solicitud: d.fecha_solicitud ?? null,
          fecha_concesion: d.fecha_concesion ?? null,
          pais: d.pais ?? null,
          entidad_concedente: d.entidad_concedente ?? null,
          id_org_unit_concedente: d.id_org_unit_concedente ?? null,
          clasificacion_ipc: d.clasificacion_ipc ?? null,
          descripcion: d.descripcion ?? null,
          proyecto_id: d.proyecto_id ?? null,
        },
        inventores: (invMap.get(d.id_patente) ?? [])
          .map((i) => ({
            id_persona: i.id_persona,
            id_patente: i.id_patente,
            orden: i.orden ?? 0,
          }))
          .sort((a, b) => a.orden - b.orden),
        titulares: (titMap.get(d.id_patente) ?? []).map((t) => ({
          holder_type: t.holder_type,
          id_org_unit: t.id_org_unit ?? null,
          id_persona: t.id_persona ?? null,
          id_patente: t.id_patente,
          orden: t.orden ?? 0,
        })),
        ocde: ocdeMap.get(d.id_patente) ?? [],
      }))
      .sort((a, b) => a.patente.id_patente.localeCompare(b.patente.id_patente));
  }

  // ── OCDE bulk loader ──────────────────────────────────────────────────────

  private async loadOcdeMap(
    entityType: string,
    entityIds: string[],
  ): Promise<Map<string, string[]>> {
    if (entityIds.length === 0) return new Map();
    const docs = await this.db
      .collection<OcdeFieldDoc>("entity_ocde_fields")
      .find({ entity_type: entityType, entity_id: { $in: entityIds } })
      .toArray();
    const map = new Map<string, string[]>();
    for (const d of docs) {
      let arr = map.get(d.entity_id);
      if (!arr) {
        arr = [];
        map.set(d.entity_id, arr);
      }
      arr.push(d.ocde_codigo);
    }
    return map;
  }
}
