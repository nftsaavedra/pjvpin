import { IsNotEmpty, IsOptional, IsString, MaxLength, Length } from "class-validator";

export class CreateOrgUnitRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ror_id?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  ubigeo_codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sunedu_licenciamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parent_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class UpdateOrgUnitRequest {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ror_id?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  ubigeo_codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sunedu_licenciamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parent_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export interface OrgUnitDto {
  id_org_unit: string;
  nombre: string;
  tipo: string;
  ruc: string | null;
  ror_id: string | null;
  ubigeo_codigo: string | null;
  sunedu_licenciamiento: string | null;
  parent_id: string | null;
  perucris_uuid: string | null;
  perucris_handle: string | null;
  activo: number;
}
