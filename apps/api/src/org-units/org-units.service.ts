import { Injectable } from "@nestjs/common";
import { AppError } from "../infra/errors/app-error";
import { OrgUnitsRepository, type OrgUnitDoc } from "./org-units.repository";
import type { CreateOrgUnitRequest, OrgUnitDto, UpdateOrgUnitRequest } from "./dto/org-units.dto";

function toDto(doc: OrgUnitDoc): OrgUnitDto {
  return {
    id_org_unit: doc.id_org_unit,
    nombre: doc.nombre,
    tipo: doc.tipo,
    ruc: doc.ruc,
    ror_id: doc.ror_id,
    ubigeo_codigo: doc.ubigeo_codigo,
    sunedu_licenciamiento: doc.sunedu_licenciamiento,
    parent_id: doc.parent_id,
    perucris_uuid: doc.perucris_uuid,
    perucris_handle: doc.perucris_handle,
    activo: doc.activo ?? 1,
  };
}

@Injectable()
export class OrgUnitsService {
  constructor(private readonly repo: OrgUnitsRepository) {}

  async list(parentId: string | undefined): Promise<OrgUnitDto[]> {
    const docs = await this.repo.listByParent(parentId);
    return docs.map(toDto);
  }

  async findById(id: string): Promise<OrgUnitDto> {
    const doc = await this.repo.findById(id);
    if (!doc) throw AppError.notFound("OrgUnit no encontrada.");
    return toDto(doc);
  }

  async create(req: CreateOrgUnitRequest): Promise<OrgUnitDto> {
    if (req.ruc) {
      const existing = await this.repo.findByRuc(req.ruc);
      if (existing) throw AppError.unique("Ya existe un OrgUnit con ese RUC.");
    }
    if (req.parent_id === req.tipo) throw AppError.validation("parent_id invalido.");
    if (req.parent_id) {
      const parent = await this.repo.findById(req.parent_id);
      if (!parent) throw AppError.notFound("parent_id no existe.");
    }
    const id_org_unit = `org-${Date.now()}`;
    const doc: OrgUnitDoc = {
      id_org_unit,
      nombre: req.nombre,
      tipo: req.tipo,
      ruc: req.ruc ?? null,
      ror_id: req.ror_id ?? null,
      ubigeo_codigo: req.ubigeo_codigo ?? null,
      sunedu_licenciamiento: req.sunedu_licenciamiento ?? null,
      parent_id: req.parent_id ?? null,
      descripcion: req.descripcion ?? null,
      perucris_uuid: null,
      perucris_handle: null,
      activo: 1,
    };
    await this.repo.insert(doc);
    return toDto(doc);
  }

  async update(id: string, req: UpdateOrgUnitRequest): Promise<OrgUnitDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound("OrgUnit no encontrada.");
    if (req.parent_id !== undefined && req.parent_id !== null) {
      if (req.parent_id === id)
        throw AppError.validation("Una org unit no puede ser su propio padre.");
      const cycle = await this.repo.hasCycle(req.parent_id, id);
      if (cycle) throw AppError.validation("La operacion crearia un ciclo en la jerarquia.");
    }
    const set: Partial<OrgUnitDoc> = {};
    if (req.nombre !== undefined) set.nombre = req.nombre;
    if (req.ruc !== undefined) set.ruc = req.ruc;
    if (req.ror_id !== undefined) set.ror_id = req.ror_id;
    if (req.ubigeo_codigo !== undefined) set.ubigeo_codigo = req.ubigeo_codigo;
    if (req.sunedu_licenciamiento !== undefined)
      set.sunedu_licenciamiento = req.sunedu_licenciamiento;
    if (req.parent_id !== undefined) set.parent_id = req.parent_id;
    if (req.descripcion !== undefined) set.descripcion = req.descripcion;
    await this.repo.updateById(id, set);
    const updated = await this.repo.findById(id);
    return toDto(updated!);
  }

  async delete(id: string): Promise<{ ok: true }> {
    const children = await this.repo.countChildReferences(id);
    if (children > 0) throw AppError.referential("OrgUnit tiene hijos en la jerarquia.");
    await this.repo.delete(id);
    return { ok: true };
  }
}