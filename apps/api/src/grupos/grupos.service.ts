import { Injectable } from "@nestjs/common";
import { AppError } from "../infra/errors/app-error";
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
  constructor(private readonly repo: GruposRepository) {}

  async listAll(): Promise<GrupoDto[]> {
    const docs = await this.repo.listAll();
    return docs.map(toDto);
  }

  async findById(id: string): Promise<GrupoDto> {
    const doc = await this.repo.findById(id);
    if (!doc) throw AppError.notFound("Grupo no encontrado.");
    return toDto(doc);
  }

  async create(req: CreateGrupoRequest): Promise<GrupoDto> {
    const existing = await this.repo.findByNombre(req.nombre);
    if (existing) throw AppError.unique("Ya existe un grupo con ese nombre.");
    const id_grupo = `grupo-${Date.now()}`;
    const doc: GrupoDoc = {
      id_grupo,
      nombre: req.nombre,
      coordinador_id: req.coordinador_id ?? null,
      descripcion: req.descripcion ?? null,
      activo: 1,
    };
    await this.repo.insert(doc);
    return toDto(doc);
  }

  async update(id: string, req: UpdateGrupoRequest): Promise<GrupoDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Grupo no encontrado.");
    const set: Partial<GrupoDoc> = {};
    if (req.nombre !== undefined) set.nombre = req.nombre;
    if (req.coordinador_id !== undefined) set.coordinador_id = req.coordinador_id;
    if (req.descripcion !== undefined) set.descripcion = req.descripcion;
    await this.repo.updateById(id, set);
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async delete(id: string): Promise<{ ok: true }> {
    await this.repo.softDelete(id);
    return { ok: true };
  }
}