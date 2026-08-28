import { Injectable } from "@nestjs/common";
import { GeoRepository, type UbigeoDto, type UbigeoDoc } from "./geo.repository";

function toDto(doc: UbigeoDoc): UbigeoDto {
  return {
    codigo: doc.codigo,
    departamento: doc.departamento,
    provincia: doc.provincia,
    distrito: doc.distrito,
    nombre: doc.nombre,
  };
}

@Injectable()
export class GeoService {
  constructor(private readonly repo: GeoRepository) {}

  async listAll(): Promise<UbigeoDto[]> {
    const docs = await this.repo.listAll();
    return docs.map(toDto);
  }

  async listByDepartamento(departamento: string): Promise<UbigeoDto[]> {
    const docs = await this.repo.listByDepartamento(departamento);
    return docs.map(toDto);
  }

  async search(prefix: string): Promise<UbigeoDto[]> {
    const docs = await this.repo.search(prefix);
    return docs.map(toDto);
  }
}
