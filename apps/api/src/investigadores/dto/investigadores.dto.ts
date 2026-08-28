import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateInvestigadorRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/)
  dni!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido_paterno!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  apellido_materno?: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  id_grado?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  renacyt_codigo_registro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  grupo_investigacion_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  orcid?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  correo_institucional?: string;
}

export class UpdateInvestigadorRequest {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombres?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  apellido_paterno?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  apellido_materno?: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  id_grado?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  grupo_investigacion_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  orcid?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  correo_institucional?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  estado_renacyt?: string;
}

export interface InvestigadorDto {
  id_investigador: string;
  dni: string;
  id_persona: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  id_grado: string | null;
  renacyt_codigo_registro: string | null;
  renacyt_orcid: string | null;
  renacyt_nivel: string | null;
  grupo_investigacion_id: string | null;
  orcid: string | null;
  correo_institucional: string | null;
  estado_renacyt: string | null;
  pure_person_id: string | null;
  perucris_uuid: string | null;
  activo: number;
}

export interface InvestigadorDetalleDto extends InvestigadorDto {
  proyectos: number;
  publicaciones: number;
  patentes: number;
  equipamiento: number;
  financiamiento: number;
}

export class ImportDniRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  dnis!: string;
}

export interface ImportInvestigadoresResult {
  total: number;
  procesados: number;
  creados: number;
  actualizados: number;
  reniec_ok: number;
  perucris_ok: number;
  pure_ok: number;
  renacyt_ok: number;
  errores: Array<{ dni: string; fase: string; error: string }>;
}
