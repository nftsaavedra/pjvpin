/**
 * Repository del módulo `dashboard`. Carga agregada desde las colecciones
 * necesarias para los 4 endpoints GET:
 *   - `investigadores` (todos, sin filtro `activo`; ver Rust)
 *   - `personas` (todas)
 *   - `proyectos` (solo `activo=1`)
 *   - `participaciones` (todas)
 *
 * snake_case explicito (sin `rename_all`) para preservar el contrato con el
 * BSON serializado por el backend Rust.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface InvestigadorLiteDoc {
  id_investigador: string;
  id_persona: string;
  renacyt_nivel: string | null;
}

export interface PersonaLiteDoc {
  id_persona: string;
  nombre_completo: string;
}

export interface ProyectoLiteDoc {
  id_proyecto: string;
  updated_at: number | null;
}

export interface ParticipacionLiteDoc {
  id_proyecto: string;
  id_investigador: string;
}

@Injectable()
export class DashboardRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get investigadores(): Collection<InvestigadorLiteDoc> {
    return this.db.collection<InvestigadorLiteDoc>("investigadores");
  }

  private get personas(): Collection<PersonaLiteDoc> {
    return this.db.collection<PersonaLiteDoc>("personas");
  }

  private get proyectos(): Collection<ProyectoLiteDoc> {
    return this.db.collection<ProyectoLiteDoc>("proyectos");
  }

  private get participaciones(): Collection<ParticipacionLiteDoc> {
    return this.db.collection<ParticipacionLiteDoc>("participaciones");
  }

  async listAllInvestigadores(): Promise<InvestigadorLiteDoc[]> {
    return this.investigadores.find({}).toArray();
  }

  async listAllPersonas(): Promise<PersonaLiteDoc[]> {
    return this.personas.find({}).toArray();
  }

  async listAllProyectosActivos(): Promise<ProyectoLiteDoc[]> {
    return this.proyectos.find({ activo: 1 }).toArray();
  }

  async listAllParticipaciones(): Promise<ParticipacionLiteDoc[]> {
    return this.participaciones.find({}).toArray();
  }

  async countProyectosActivos(): Promise<number> {
    return this.proyectos.countDocuments({ activo: 1 });
  }
}
