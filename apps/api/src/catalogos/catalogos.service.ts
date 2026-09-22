import { Injectable } from "@nestjs/common";
import { AppError } from "../infra/errors/app-error";
import { CatalogosRepository, type CatalogoDoc } from "./catalogos.repository";
import {
  CreateCatalogoRequest,
  type CatalogoItemDto,
  type EliminarCatalogoResultadoDto,
} from "./dto/catalogos.dto";

const REFERENCING_COLLECTIONS = [
  "investigadores",
  "proyectos",
  "recursos",
  "publicaciones_cientificas",
];

function toDto(doc: CatalogoDoc): CatalogoItemDto {
  return {
    id: doc.id,
    tipo: doc.tipo,
    codigo: doc.codigo,
    nombre: doc.nombre,
    descripcion: doc.descripcion,
    editable: doc.editable ?? 1,
    esquema: doc.esquema,
    padre_codigo: doc.padre_codigo,
  };
}

@Injectable()
export class CatalogosService {
  constructor(
    private readonly repo: CatalogosRepository,
  ) {}

  async listByTipo(tipo: string): Promise<CatalogoItemDto[]> {
    const docs = await this.repo.listByTipo(tipo, true);
    return docs.map(toDto);
  }

  async listAllAdminByTipo(tipo: string): Promise<CatalogoItemDto[]> {
    const docs = await this.repo.listAllAdminByTipo(tipo);
    return docs.map(toDto);
  }

  async create(req: CreateCatalogoRequest): Promise<CatalogoItemDto> {
    const existing = req.esquema
      ? await this.repo.findByTipoEsquemaCodigo(req.tipo, req.esquema, req.codigo)
      : await this.repo.findByTipoCodigo(req.tipo, req.codigo);
    if (existing) {
      throw AppError.unique("Ya existe un item con ese codigo para ese tipo.");
    }
    const id = `catalogo-${req.tipo}-${req.esquema ?? ""}-${req.codigo}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const doc: CatalogoDoc = {
      id,
      tipo: req.tipo,
      codigo: req.codigo,
      nombre: req.nombre,
      descripcion: req.descripcion,
      editable: 1,
      esquema: req.esquema,
      padre_codigo: req.padre_codigo,
    };
    await this.repo.insert(doc);
    return toDto(doc);
  }

  async update(
    id: string,
    changes: { nombre?: string; descripcion?: string },
  ): Promise<CatalogoItemDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Item de catalogo no encontrado.");
    if ((existing.editable ?? 1) === 0) {
      throw AppError.validation("Este item no es editable.");
    }
    const set: Partial<CatalogoDoc> = {};
    if (changes.nombre !== undefined) set.nombre = changes.nombre;
    if (changes.descripcion !== undefined) set.descripcion = changes.descripcion;
    await this.repo.updateById(id, set);
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async softDelete(id: string): Promise<EliminarCatalogoResultadoDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("Item de catalogo no encontrado.");
    if ((existing.editable ?? 1) === 0) {
      throw AppError.validation("Este item no se puede eliminar.");
    }
    const refs = await this.repo.countReferences(id, REFERENCING_COLLECTIONS);
    if (refs > 0) {
      throw AppError.referential("El item esta referenciado y no se puede eliminar.");
    }
    await this.repo.setActivo(id, 0);
    return { ok: true, id };
  }

  async reactivate(id: string): Promise<CatalogoItemDto> {
    await this.repo.setActivo(id, 1);
    const updated = await this.repo.findById(id);
    if (!updated) throw AppError.notFound("Item de catalogo no encontrado.");
    return toDto(updated);
  }
}
