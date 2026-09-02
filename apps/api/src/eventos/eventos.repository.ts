/**
 * Repository del dominio `eventos` (coleccion `eventos_academicos`).
 *
 * Participantes EMBEBIDOS (no pivot). snake_case explicito para preservar
 * el contrato con el frontend durante fase 1.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Collection, Db } from "mongodb";
import { MONGO_DB } from "../infra/mongo/mongo.module";

export interface ParticipanteEvento {
  investigador_id: string;
  rol: string;
}

export interface EventoAcademicoDoc {
  id_evento: string;
  nombre: string;
  tipo: string;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  lugar: string | null;
  descripcion: string | null;
  participantes: ParticipanteEvento[];
  created_at: number | null;
  updated_at: number | null;
  activo: number;
}

@Injectable()
export class EventosRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get eventos(): Collection<EventoAcademicoDoc> {
    return this.db.collection<EventoAcademicoDoc>("eventos_academicos");
  }

  async insertEvento(doc: EventoAcademicoDoc): Promise<void> {
    await this.eventos.insertOne(doc);
  }

  async findEventoById(id: string): Promise<EventoAcademicoDoc | null> {
    return this.eventos.findOne({ id_evento: id });
  }

  async listEventos(): Promise<EventoAcademicoDoc[]> {
    return this.eventos.find({ activo: 1 }).toArray();
  }

  async updateEvento(
    id: string,
    set: Partial<EventoAcademicoDoc>,
  ): Promise<void> {
    await this.eventos.updateOne(
      { id_evento: id },
      { $set: { ...set, updated_at: Date.now() } },
    );
  }

  async setEventoActivo(id: string, activo: 0 | 1): Promise<void> {
    await this.eventos.updateOne(
      { id_evento: id },
      { $set: { activo, updated_at: Date.now() } },
    );
  }

  /**
   * Lista eventos por participante embebido (índice multikey `participantes.investigador_id`).
   */
  async listEventosByInvestigador(idInvestigador: string): Promise<EventoAcademicoDoc[]> {
    return this.eventos
      .find({ "participantes.investigador_id": idInvestigador, activo: 1 })
      .toArray();
  }
}