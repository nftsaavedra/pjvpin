import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import type { PersonaDto } from "./dto/personas.dto";

@Injectable()
export class PersonasRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get personas(): Collection {
    return this.db.collection("personas");
  }

  async findById(id: string): Promise<PersonaDto | null> {
    const doc = await this.personas.findOne({ id_persona: id });
    return doc ? (doc as unknown as PersonaDto) : null;
  }

  async findByDni(dni: string): Promise<PersonaDto | null> {
    const doc = await this.personas.findOne({ dni });
    return doc ? (doc as unknown as PersonaDto) : null;
  }

  async insert(persona: PersonaDto): Promise<void> {
    await this.personas.insertOne(persona as unknown as object);
  }

  async findUsuarioById(
    id: string,
  ): Promise<{ id_usuario: string; persona_id: string | null } | null> {
    const doc = await this.db.collection("usuarios").findOne({ id_usuario: id });
    if (!doc) return null;
    return {
      id_usuario: (doc as unknown as { id_usuario: string }).id_usuario,
      persona_id: (doc as unknown as { persona_id: string | null }).persona_id,
    };
  }
}
