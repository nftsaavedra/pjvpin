/**
 * Repositorio del reporte "Pure Master List" - `GET /reportes/pure/masterlist`.
 *
 * Port de `apps/desktop/src-tauri/src/reportes/repository_pure_masterlist.rs`.
 * Solo acceso a datos: la transformacion (armado de filas + summary) vive en
 * `reportes.logic.ts` (SRP).
 *
 * Filtros y cargas (replica 1:1 del Rust):
 *   - investigadores: solo `activo = 1` (`get_all_investigadores`).
 *   - personas: todas (se indexan por `id_persona` para evitar N+1 en el
 *     armado de filas).
 *
 * Drift documentado frente al shape canonico del feature `personas`
 * (`PersonaDto` en `personas/dto/personas.dto.ts`): ese DTO no expone
 * `correo` ni `sexo`. Para evitar contaminar el feature personas, este
 * repositorio define su propio `PersonaMasterlistDoc` con esos campos
 * opcionales. Si en el futuro `PersonaDto` se ampla, este shape local se
 * puede alinear.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

/**
 * Subset de `personas` requerido por el masterlist. Campos extra son
 * `correo` y `sexo`, no representados en `PersonaDto` (drift documentado).
 */
export interface PersonaMasterlistDoc {
  id_persona: string;
  dni: string;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  /** Puede no existir si el documento es legacy o no fue seteado por la UI. */
  correo: string | null;
  /** Valores canonicos: M / F / Masculino / Femenino / etc. (mapeo en logic). */
  sexo: string | null;
}

/**
 * Subset de `investigadores` requerido por el masterlist. Anade
 * `pure_person_id`, no expuesto en `InvestigadorReporteDoc` (usado por los
 * demas reportes que no necesitan este campo).
 */
export interface InvestigadorMasterlistDoc {
  id_investigador: string;
  id_persona: string;
  activo: number;
  pure_person_id: string | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
}

@Injectable()
export class ReportesMasterlistRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get personas(): Collection<PersonaMasterlistDoc> {
    return this.db.collection<PersonaMasterlistDoc>("personas");
  }

  private get investigadores(): Collection<InvestigadorMasterlistDoc> {
    return this.db.collection<InvestigadorMasterlistDoc>("investigadores");
  }

  /** Port de `get_all_investigadores`: solo `activo = 1`. */
  async listInvestigadoresActivos(): Promise<InvestigadorMasterlistDoc[]> {
    return this.investigadores.find({ activo: 1 }).toArray();
  }

  /** Port de `personas::load_all_map`: indexa por `id_persona`. */
  async loadPersonasMap(): Promise<Map<string, PersonaMasterlistDoc>> {
    const docs = await this.personas.find({}).toArray();
    return new Map(docs.map((d) => [d.id_persona, d]));
  }
}
