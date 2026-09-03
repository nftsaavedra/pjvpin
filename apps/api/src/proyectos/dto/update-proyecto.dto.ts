import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { MAX_TITULO_LENGTH } from "../vocab";

/**
 * Update parcial: el modelo Rust solo expone `titulo_proyecto` y la lista de
 * participantes (delete+insert transaccional). `codigo` no es editable desde
 * el flujo manual (pertenece a la entidad asignadora); se omite del DTO a
 * proposito.
 */
export class UpdateProyectoConParticipantesDto {
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_TITULO_LENGTH)
  titulo_proyecto!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  investigadores_ids!: string[];

  @IsOptional()
  @IsString()
  investigador_responsable_id?: string;
}
