import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { DEFAULT_MONEDA, MAX_ROL_LENGTH } from "../vocab";

export class VincularFinanciamientoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  idFinanciamiento!: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  montoAsignado?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ROL_LENGTH)
  moneda?: string;
}

export interface ProyectoFinanciamientoDto {
  id: string;
  id_proyecto: string;
  id_financiamiento: string;
  monto_asignado: number | null;
  moneda: string;
}

export { DEFAULT_MONEDA };
