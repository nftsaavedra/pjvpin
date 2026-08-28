import { Injectable } from "@nestjs/common";
import { PersonasRepository } from "./personas.repository";
import type { PersonaDto } from "./dto/personas.dto";
import { AppError } from "../infra/errors/app-error";

@Injectable()
export class PersonasService {
  constructor(private readonly repo: PersonasRepository) {}

  async findById(id: string): Promise<PersonaDto> {
    const p = await this.repo.findById(id);
    if (!p) throw AppError.notFound("Persona no encontrada.");
    return p;
  }

  async findByDni(dni: string): Promise<PersonaDto> {
    const p = await this.repo.findByDni(dni);
    if (!p) throw AppError.notFound("Persona no encontrada para el DNI.");
    return p;
  }
}
