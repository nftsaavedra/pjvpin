import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { UsuariosRepository, type UsuarioDoc } from "./usuarios.repository";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import type { UsuarioDto } from "../auth/dto/auth.response";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import {
  ensureSoloUnicoSuperuser,
  noAutoDegradarse,
  noDegradarSuperuser,
  noDesactivarSuperuser,
  noEscalableASuperuser,
} from "./validations";
import type { PaginatedUsuarios } from "./dto/usuarios.dto";

@Injectable()
export class UsuariosService {
  constructor(
    private readonly repo: UsuariosRepository,
    private readonly audit: AuditService,
  ) {}

  async listAll(): Promise<UsuarioDto[]> {
    const docs = await this.repo.listAll();
    return Promise.all(docs.map((d) => this.repo.toDto(d)));
  }

  async listPaginated(page: number, limit: number): Promise<PaginatedUsuarios> {
    const { items, total } = await this.repo.listPaginated(page, limit);
    const dtos = await Promise.all(items.map((d) => this.repo.toDto(d)));
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    return {
      items: dtos,
      total,
      page: safePage,
      limit: safeLimit,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async findById(id: string): Promise<UsuarioDto | null> {
    const doc = await this.repo.findById(id);
    return doc ? this.repo.toDto(doc) : null;
  }

  async create(input: {
    username: string;
    password: string;
    rol: string;
    dni: string;
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    actor: AuthenticatedUser;
  }): Promise<UsuarioDto> {
    await ensureSoloUnicoSuperuser(
      () => this.repo.countSuperusers(),
      `usuario-${input.username.toLowerCase()}`,
      input.rol,
    );

    const password_hash = await argon2.hash(input.password, { type: argon2.argon2id });
    const persona = await this.repo.ensurePersonaByDni(input.dni, {
      nombres: input.nombres ?? "",
      apellidoPaterno: input.apellidoPaterno ?? "",
      apellidoMaterno: input.apellidoMaterno ?? "",
    });
    const doc: UsuarioDoc = {
      id_usuario: `usuario-${input.username.toLowerCase()}`,
      username: input.username,
      password_hash,
      rol: input.rol,
      activo: 1,
      persona_id: persona.id_persona,
      dni: input.dni,
      nombre_completo: persona.nombre_completo,
    };
    try {
      await this.repo.insert(doc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("E11000") || msg.includes("duplicate")) {
        throw AppError.internal("Ya existe un usuario o DNI registrado.");
      }
      throw err;
    }
    const actor = {
      id_usuario: input.actor.id_usuario,
      username: input.actor.username,
      rol: input.actor.rol,
    };
    await this.audit.writeUserAudit(actor, "usuario.create", {
      id_usuario: doc.id_usuario,
      username: doc.username,
      rol: doc.rol,
    });
    return this.repo.toDto(doc);
  }

  async update(
    targetId: string,
    changes: { username?: string; rol?: string },
    actor: AuthenticatedUser,
  ): Promise<UsuarioDto> {
    if (changes.rol) {
      await noDegradarSuperuser((id) => this.repo.findById(id), targetId, changes.rol);
      await noEscalableASuperuser((id) => this.repo.findById(id), targetId, changes.rol);
      await noAutoDegradarse(actor.id_usuario, targetId, changes.rol);
    }
    const set: Partial<UsuarioDoc> = {};
    if (changes.username) set.username = changes.username;
    if (changes.rol) set.rol = changes.rol;
    await this.repo.updateOne(targetId, set);
    const target = await this.repo.findById(targetId);
    if (!target) throw AppError.notFound("Usuario no encontrado.");
    const targetDto: UsuarioDto = await this.repo.toDto(target);
    const auditTarget = {
      id_usuario: targetDto.id_usuario,
      username: targetDto.username,
      rol: targetDto.rol,
    };
    await this.audit.writeUserAudit(
      {
        id_usuario: actor.id_usuario,
        username: actor.username,
        rol: actor.rol,
      },
      "usuario.update",
      auditTarget,
    );
    return targetDto;
  }

  async deactivate(targetId: string, actor: AuthenticatedUser): Promise<UsuarioDto> {
    await noDesactivarSuperuser((id) => this.repo.findById(id), targetId, 0);
    await this.repo.setActivo(targetId, 0);
    const target = await this.repo.findById(targetId);
    if (!target) throw AppError.notFound("Usuario no encontrado.");
    const targetDto: UsuarioDto = await this.repo.toDto(target);
    await this.audit.writeUserAudit(
      {
        id_usuario: actor.id_usuario,
        username: actor.username,
        rol: actor.rol,
      },
      "usuario.deactivate",
      {
        id_usuario: targetDto.id_usuario,
        username: targetDto.username,
        rol: targetDto.rol,
      },
    );
    return targetDto;
  }

  async reactivate(targetId: string, actor: AuthenticatedUser): Promise<UsuarioDto> {
    await this.repo.setActivo(targetId, 1);
    const target = await this.repo.findById(targetId);
    if (!target) throw AppError.notFound("Usuario no encontrado.");
    const targetDto: UsuarioDto = await this.repo.toDto(target);
    await this.audit.writeUserAudit(
      {
        id_usuario: actor.id_usuario,
        username: actor.username,
        rol: actor.rol,
      },
      "usuario.reactivate",
      {
        id_usuario: targetDto.id_usuario,
        username: targetDto.username,
        rol: targetDto.rol,
      },
    );
    return targetDto;
  }
}
