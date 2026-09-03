/**
 * DTOs del pivot `publicacion_autores`.
 *
 * Convencion: snake_case para el field `id_publicacion` en la URL param
 * (NestJS default), y camelCase en body (consistente con otros DTOs).
 */

import { IsBoolean, IsOptional, IsString, Min } from "class-validator";

export class VincularAutorDto {
  @IsString()
  id_persona!: string;

  @IsOptional()
  @IsString()
  id_org_unit_afiliacion?: string;

  @Min(1, { message: "El orden del autor debe ser >= 1." })
  orden!: number;

  @IsOptional()
  @IsBoolean()
  es_autor_correspondiente?: boolean;
}

export class PublicacionAutorDto {
  id!: string;
  id_publicacion!: string;
  id_persona!: string;
  id_org_unit_afiliacion!: string | null;
  orden!: number;
  es_autor_correspondiente!: boolean;
}