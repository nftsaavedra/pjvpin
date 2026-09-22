import { Injectable } from "@nestjs/common";
import { AppError } from "../infra/errors/app-error";
import { GradosRepository, type GradoDoc } from "./grados.repository";
import type {
  CreateGradoRequest,
  EliminarGradoResultadoDto,
  GradoDto,
  UpdateGradoRequest,
} from "./dto/grados.dto";

function toDto(doc: GradoDoc): GradoDto {
  return {
    id_grado: doc.id_grado,
    nombre: doc.nombre,
    descripcion: doc.descripcion,
    nivel: doc.nivel,
    activo: doc.activo ?? 1,
  };
}

@Injectable()
export class GradosService {
  constructor(private readonly repo: GradosRepository) {}

  async listAll(): Promise<GradoDto[]> {
    const docs = await this.repo.listAll();
    return docs.map(toDto);
  }

  async listPaginated(
    page: number,
    limit: number,
  ): Promise<{
    items: GradoDto[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const { items, total } = await this.repo.listPaginated(page, limit);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    return {
      items: items.map(toDto),
      total,
      page: safePage,
      limit: safeLimit,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async create(req: CreateGradoRequest): Promise<GradoDto> {
    const existing = await this.repo.findByNombre(req.nombre);
    if (existing) throw AppError.unique("Ya existe un grado con ese nombre.");
    const id_grado = `grado-${Date.now()}`;
    const doc: GradoDoc = {
      id_grado,
      nombre: req.nombre,
      descripcion: req.descripcion,
      nivel: req.nivel,
      activo: 1,
    };
    await this.repo.insert(doc);
    return toDto(doc);
  }

  async update(id: string, req: UpdateGradoRequest): Promise<GradoDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Grado no encontrado.");
    const set: Partial<GradoDoc> = {};
    if (req.nombre !== undefined) set.nombre = req.nombre;
    if (req.descripcion !== undefined) set.descripcion = req.descripcion;
    if (req.nivel !== undefined) set.nivel = req.nivel;
    await this.repo.updateById(id, set);
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async softDelete(id: string): Promise<EliminarGradoResultadoDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Grado no encontrado.");
    const refs = await this.repo.countReferencias(id);
    if (refs > 0) throw AppError.referential("Grado referenciado por investigadores activos.");
    await this.repo.setActivo(id, 0);
    return { ok: true, id_grado: id };
  }

  async reactivate(id: string): Promise<GradoDto> {
    await this.repo.setActivo(id, 1);
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Grado no encontrado.");
    return toDto(updated);
  }
}