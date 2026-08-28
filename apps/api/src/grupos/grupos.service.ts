import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { GruposRepository, type GrupoDoc } from "./grupos.repository";
import type { CreateGrupoRequest, GrupoDto, UpdateGrupoRequest } from "./dto/grupos.dto";

function toDto(doc: GrupoDoc): GrupoDto {
  return {
    id_grupo: doc.id_grupo,
    nombre: doc.nombre,
    coordinador_id: doc.coordinador_id,
    descripcion: doc.descripcion,
    activo: doc.activo ?? 1,
  };
}

@Injectable()
export class GruposService {
  constructor(
    private readonly repo: GruposRepository,
    private readonly audit: AuditService,
  ) {}

  async listAll(): Promise<GrupoDto[]> {
    const docs = await this.repo.listAll();
    return docs.map(toDto);
  }

  async findById(id: string): Promise<GrupoDto> {
    const doc = await this.repo.findById(id);
    if (!doc) throw AppError.notFound("Grupo no encontrado.");
    return toDto(doc);
  }

  async create(req: CreateGrupoRequest, actor: AuthenticatedUser): Promise<GrupoDto> {
    const existing = await this.repo.findByNombre(req.nombre);
    if (existing) throw AppError.internal("Ya existe un grupo con ese nombre.");
    const id_grupo = `grupo-${Date.now()}`;
    const doc: GrupoDoc = {
      id_grupo,
      nombre: req.nombre,
      coordinador_id: req.coordinador_id ?? null,
      descripcion: req.descripcion ?? null,
      activo: 1,
    };
    await this.repo.insert(doc);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "grupo.create",
      "grupo",
      id_grupo,
    );
    return toDto(doc);
  }

  async update(id: string, req: UpdateGrupoRequest, actor: AuthenticatedUser): Promise<GrupoDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Grupo no encontrado.");
    const set: Partial<GrupoDoc> = {};
    if (req.nombre !== undefined) set.nombre = req.nombre;
    if (req.coordinador_id !== undefined) set.coordinador_id = req.coordinador_id;
    if (req.descripcion !== undefined) set.descripcion = req.descripcion;
    await this.repo.updateById(id, set);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "grupo.update",
      "grupo",
      id,
    );
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<{ ok: true }> {
    await this.repo.softDelete(id);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "grupo.delete",
      "grupo",
      id,
    );
    return { ok: true };
  }
}
