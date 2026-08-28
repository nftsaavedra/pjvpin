import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import type { UsuarioDto } from "../auth/dto/auth.response";

export interface UsuarioDoc {
  id_usuario: string;
  username: string;
  password_hash: string;
  rol: string;
  activo: number;
  persona_id: string | null;
  dni: string | null;
  nombre_completo: string;
}

export interface PersonaDoc {
  id_persona: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

@Injectable()
export class UsuariosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get usuarios(): Collection<UsuarioDoc> {
    return this.db.collection<UsuarioDoc>("usuarios");
  }
  private get personas(): Collection<PersonaDoc> {
    return this.db.collection<PersonaDoc>("personas");
  }

  async count(): Promise<number> {
    return this.usuarios.countDocuments({});
  }

  async countSuperusers(): Promise<number> {
    return this.usuarios.countDocuments({ rol: "superuser" });
  }

  async findById(id: string): Promise<UsuarioDoc | null> {
    return this.usuarios.findOne({ id_usuario: id });
  }

  async findByUsername(username: string): Promise<UsuarioDoc | null> {
    return this.usuarios.findOne({ username });
  }

  async findByDni(dni: string): Promise<UsuarioDoc | null> {
    return this.usuarios.findOne({ dni });
  }

  async listAll(): Promise<UsuarioDoc[]> {
    return this.usuarios.find({}).toArray();
  }

  async listPaginated(
    page: number,
    limit: number,
  ): Promise<{ items: UsuarioDoc[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;
    const [items, total] = await Promise.all([
      this.usuarios.find({}).skip(skip).limit(safeLimit).toArray(),
      this.usuarios.countDocuments({}),
    ]);
    return { items, total };
  }

  async insert(doc: UsuarioDoc): Promise<void> {
    await this.usuarios.insertOne(doc);
  }

  async updateOne(id: string, set: Partial<UsuarioDoc>): Promise<void> {
    await this.usuarios.updateOne({ id_usuario: id }, { $set: set });
  }

  async setActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.usuarios.updateOne({ id_usuario: id }, { $set: { activo } });
  }

  async ensurePersonaByDni(
    dni: string,
    fallback: { nombres: string; apellidoPaterno: string; apellidoMaterno: string },
  ): Promise<PersonaDoc> {
    const id_persona = `persona-${dni}`;
    const existing = await this.personas.findOne({ id_persona });
    if (existing) return existing;
    const nombreCompleto =
      `${fallback.nombres} ${fallback.apellidoPaterno} ${fallback.apellidoMaterno}`.trim();
    const doc: PersonaDoc = {
      id_persona,
      dni,
      nombres: fallback.nombres,
      apellido_paterno: fallback.apellidoPaterno,
      apellido_materno: fallback.apellidoMaterno,
      nombre_completo: nombreCompleto,
    };
    await this.personas.insertOne(doc);
    return doc;
  }

  async findPersonaById(id_persona: string): Promise<PersonaDoc | null> {
    return this.personas.findOne({ id_persona });
  }

  async toDto(doc: UsuarioDoc): Promise<UsuarioDto> {
    return {
      id_usuario: doc.id_usuario,
      username: doc.username,
      nombre_completo: doc.nombre_completo,
      rol: doc.rol,
      activo: doc.activo,
      persona_id: doc.persona_id,
      dni: doc.dni,
    };
  }
}
