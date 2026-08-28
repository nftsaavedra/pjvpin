import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateGradoRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nivel?: string;
}

export class UpdateGradoRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nivel?: string;
}

export interface GradoDto {
  id_grado: string;
  nombre: string;
  descripcion?: string;
  nivel?: string;
  activo: number;
}

export interface EliminarGradoResultadoDto {
  ok: boolean;
  id_grado: string;
}
