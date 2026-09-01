import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import {
  MAX_DESCRIPCION_LENGTH,
  MAX_NOMBRE_LENGTH,
} from "../vocab";

/**
 * DTO de creacion de equipamiento. Reglas 1:1 con `apps/desktop/src-tauri/src/recursos/`
 * (doc 07 §2.2):
 *  - `nombre` obligatorio.
 *  - `moneda` ISO 4217 (validada en logica, default PEN).
 *  - `valor_estimado` finito >= 0 (validado en logica).
 *  - `codigo_institucional` UNIQUE index parcial en BD (doc 07 §2.4).
 *  - `proyecto_id` ELIMINADO (D10): no aparece aqui. Las asociaciones
 *    proyecto->equipamiento son indirectas via pivot proyecto_financiamientos
 *    -> financiamiento -> equipamiento (ver D4 en doc 07 §5).
 */
export class CreateEquipamientoDto {
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  especificaciones?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  proveedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  valorEstimado?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaAdquisicion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  codigoInstitucional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tipoEquipamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  usoEquipamiento?: string;

  @IsOptional()
  @IsString()
  idOrgUnitPropietaria?: string;

  @IsOptional()
  @IsString()
  idFinanciamiento?: string;
}

export class UpdateEquipamientoDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  especificaciones?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOMBRE_LENGTH)
  proveedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  valorEstimado?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaAdquisicion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  codigoInstitucional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tipoEquipamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  usoEquipamiento?: string;

  @IsOptional()
  @IsString()
  idOrgUnitPropietaria?: string;

  @IsOptional()
  @IsString()
  idFinanciamiento?: string;
}

export interface EquipamientoDto {
  id_equipamiento: string;
  nombre: string;
  descripcion: string | null;
  especificaciones: string | null;
  proveedor: string | null;
  moneda: string | null;
  valor_estimado: number | null;
  fecha_adquisicion: number | null;
  codigo_institucional: string | null;
  tipo_equipamiento: string | null;
  uso_equipamiento: string | null;
  id_org_unit_propietaria: string | null;
  id_financiamiento: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: boolean;
}
