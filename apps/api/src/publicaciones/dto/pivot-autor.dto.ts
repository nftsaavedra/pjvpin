/**
 * DTOs del pivot `publicacion_autores`.
 *
 * Convencion: snake_case para el field `id_publicacion` en la URL param
 * (NestJS default), y camelCase en body (consistente con otros DTOs).
 */

import { IsBoolean, IsOptional, IsString, Min } from "class-validator";

export class VincularAutorDto {
  @IsString()
  idPersona!: string;

  @IsOptional()
  @IsString()
  idOrgUnitAfiliacion?: string;

  @Min(1, { message: "El orden del autor debe ser >= 1." })
  orden!: number;

  @IsOptional()
  @IsBoolean()
  esAutorCorrespondiente?: boolean;
}

export class PublicacionAutorDto {
  id!: string;
  id_publicacion!: string;
  id_persona!: string;
  id_org_unit_afiliacion!: string | null;
  orden!: number;
  es_autor_correspondiente!: boolean;
}