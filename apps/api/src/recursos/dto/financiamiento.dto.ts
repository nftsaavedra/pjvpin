import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  MAX_CODIGO_LENGTH,
  MAX_DESCRIPCION_LENGTH,
  MAX_ESTADO_LENGTH,
  MAX_MODALIDAD_LENGTH,
  MAX_NOMBRE_LENGTH,
} from "../vocab";

/**
 * DTO de creacion de financiamiento. Reglas 1:1 con `apps/desktop/src-tauri/src/recursos/`
 * (doc 07 §2.2):
 *  - `codigo` obligatorio (validado en logica para D6: no hay UNIQUE en BD).
 *  - `moneda` ISO 4217 (validada en logica, default PEN).
 *  - `monto` finito >= 0 (validado en logica).
 *  - `fecha_fin >= fecha_inicio` (validado en logica).
 *  - `parent_id` self-ref != self (validado en logica; el service excluye
 *    porque el id aun no existe en create, pero si viene en update se valida).
 *  - `proyecto_id` ELIMINADO (D10): no aparece aqui.
 */
export class CreateFinanciamientoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CODIGO_LENGTH)
  codigo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MODALIDAD_LENGTH)
  modalidad?: string;

  @IsOptional()
  @IsString()
  idOrgUnitFinanciadora?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tipo?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaInicio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaFin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ESTADO_LENGTH)
  estadoFinanciero?: string;
}

export class UpdateFinanciamientoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CODIGO_LENGTH)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MODALIDAD_LENGTH)
  modalidad?: string;

  @IsOptional()
  @IsString()
  idOrgUnitFinanciadora?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tipo?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaInicio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaFin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ESTADO_LENGTH)
  estadoFinanciero?: string;
}

export interface FinanciamientoDto {
  id_financiamiento: string;
  codigo: string;
  nombre: string | null;
  modalidad: string | null;
  id_org_unit_financiadora: string | null;
  parent_id: string | null;
  tipo: string | null;
  monto: number | null;
  moneda: string | null;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  descripcion: string | null;
  estado_financiero: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: boolean;
}
