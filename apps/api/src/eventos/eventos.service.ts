/**
 * Servicio del dominio `eventos` (7 REST, doc 07 §3).
 *
 * Participantes EMBEBIDOS (no pivot); sin FK checks (Rust). Soft-delete +
 * reactivate. Audit events: `evento.create/update/delete/reactivate`.
 */
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import {
  CreateEventoDto,
  EventoDto,
  ParticipanteEventoDto,
  UpdateEventoDto,
} from "./dto/evento.dto";
import {
  type EventoAcademicoDoc,
  type ParticipanteEvento,
  EventosRepository,
} from "./eventos.repository";

@Injectable()
export class EventosService {
  constructor(
    private readonly repo: EventosRepository,
    private readonly audit: AuditService,
  ) {}

  private toAuditActor(actor: AuthenticatedUser): {
    id_usuario: string;
    username: string;
    rol: string;
  } {
    return {
      id_usuario: actor.id_usuario,
      username: actor.username,
      rol: actor.rol,
    };
  }

  private toDto(doc: EventoAcademicoDoc): EventoDto {
    return {
      id: doc.id_evento,
      id_evento: doc.id_evento,
      nombre: doc.nombre,
      tipo: doc.tipo,
      fecha_inicio: doc.fecha_inicio,
      fecha_fin: doc.fecha_fin,
      lugar: doc.lugar,
      descripcion: doc.descripcion,
      participantes: (doc.participantes ?? []).map((p): ParticipanteEventoDto => ({
        investigadorId: p.investigador_id,
        rol: p.rol,
      })),
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      activo: doc.activo,
    };
  }

  private toParticipanteDoc(p: ParticipanteEventoDto): ParticipanteEvento {
    return {
      investigador_id: p.investigadorId.trim(),
      rol: p.rol.trim(),
    };
  }

  async create(input: CreateEventoDto, actor: AuthenticatedUser): Promise<EventoDto> {
    const idEvento = randomUUID();
    const now = Date.now();
    const doc: EventoAcademicoDoc = {
      id_evento: idEvento,
      nombre: input.nombre.trim(),
      tipo: input.tipo.trim(),
      fecha_inicio: input.fechaInicio ?? null,
      fecha_fin: input.fechaFin ?? null,
      lugar: input.lugar?.trim() ?? null,
      descripcion: input.descripcion?.trim() ?? null,
      participantes: (input.participantes ?? []).map((p) => this.toParticipanteDoc(p)),
      created_at: now,
      updated_at: now,
      activo: 1,
    };
    await this.repo.insertEvento(doc);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "evento.create",
      "evento",
      idEvento,
      JSON.stringify({ nombre: doc.nombre, tipo: doc.tipo }),
    );
    return this.toDto(doc);
  }

  async getAll(): Promise<EventoDto[]> {
    const docs = await this.repo.listEventos();
    return docs.map((d) => this.toDto(d));
  }

  async getById(id: string): Promise<EventoDto> {
    const doc = await this.repo.findEventoById(id);
    if (!doc) throw AppError.notFound("Evento no encontrado.");
    return this.toDto(doc);
  }

  async update(
    id: string,
    input: UpdateEventoDto,
    actor: AuthenticatedUser,
  ): Promise<EventoDto> {
    const existing = await this.repo.findEventoById(id);
    if (!existing) throw AppError.notFound("Evento no encontrado.");

    const set: Partial<EventoAcademicoDoc> = {};
    if (input.nombre !== undefined) set.nombre = input.nombre.trim();
    if (input.tipo !== undefined) set.tipo = input.tipo.trim();
    if (input.fechaInicio !== undefined) set.fecha_inicio = input.fechaInicio ?? null;
    if (input.fechaFin !== undefined) set.fecha_fin = input.fechaFin ?? null;
    if (input.lugar !== undefined) set.lugar = input.lugar?.trim() ?? null;
    if (input.descripcion !== undefined) set.descripcion = input.descripcion?.trim() ?? null;
    if (input.participantes !== undefined) {
      set.participantes = input.participantes.map((p) => this.toParticipanteDoc(p));
    }
    if (Object.keys(set).length > 0) {
      await this.repo.updateEvento(id, set);
    }
    const updated = await this.repo.findEventoById(id);
    if (!updated) throw AppError.notFound("Evento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "evento.update",
      "evento",
      id,
      JSON.stringify({ campos: Object.keys(set) }),
    );
    return this.toDto(updated);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findEventoById(id);
    if (!existing) throw AppError.notFound("Evento no encontrado.");
    await this.repo.setEventoActivo(id, 0);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "evento.delete",
      "evento",
      id,
    );
  }

  async reactivate(id: string, actor: AuthenticatedUser): Promise<EventoDto> {
    const existing = await this.repo.findEventoById(id);
    if (!existing) throw AppError.notFound("Evento no encontrado.");
    await this.repo.setEventoActivo(id, 1);
    const updated = await this.repo.findEventoById(id);
    if (!updated) throw AppError.notFound("Evento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "evento.reactivate",
      "evento",
      id,
    );
    return this.toDto(updated);
  }

  async getByInvestigador(idInvestigador: string): Promise<EventoDto[]> {
    const docs = await this.repo.listEventosByInvestigador(idInvestigador);
    return docs.map((d) => this.toDto(d));
  }
}