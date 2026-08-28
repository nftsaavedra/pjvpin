import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateGrupoRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coordinador_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class UpdateGrupoRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coordinador_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export interface GrupoDto {
  id_grupo: string;
  nombre: string;
  coordinador_id: string | null;
  descripcion: string | null;
  activo: number;
}
