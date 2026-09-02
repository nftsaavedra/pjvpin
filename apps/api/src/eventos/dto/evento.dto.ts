/**
 * DTOs del dominio `eventos` (coleccion `eventos_academicos`).
 *
 * Convenciones: requests camelCase, respuestas snake_case 1:1 con doc 07 §3.2.
 * Participantes EMBEBIDOS (no pivot); `tipo` sin vocabulario (free string).
 */
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export const MAX_NOMBRE_LENGTH = 500;
export const MAX_TIPO_LENGTH = 128;
export const MAX_LUGAR_LENGTH = 500;
export const MAX_DESCRIPCION_LENGTH = 4000;
export const MAX_PARTICIPANTE_ROL_LENGTH = 128;
export const MAX_PARTICIPANTES = 200;

export class ParticipanteEventoDto {
  @IsString()
  @MinLength(1)
  investigadorId!: string;

  @IsString()
  @MaxLength(MAX_PARTICIPANTE_ROL_LENGTH)
  rol!: string;
}

export class CreateEventoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TIPO_LENGTH)
  tipo!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  fechaInicio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  fechaFin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_LUGAR_LENGTH)
  lugar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PARTICIPANTES)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteEventoDto)
  participantes?: ParticipanteEventoDto[];
}

export class UpdateEventoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TIPO_LENGTH)
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  fechaInicio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  fechaFin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_LUGAR_LENGTH)
  lugar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PARTICIPANTES)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteEventoDto)
  participantes?: ParticipanteEventoDto[];
}

export class EventoDto {
  id!: string;
  id_evento!: string;
  nombre!: string;
  tipo!: string;
  fecha_inicio!: number | null;
  fecha_fin!: number | null;
  lugar!: string | null;
  descripcion!: string | null;
  participantes!: ParticipanteEventoDto[];
  created_at!: number | null;
  updated_at!: number | null;
  activo!: number;
}