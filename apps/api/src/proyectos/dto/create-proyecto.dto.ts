import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { MAX_TITULO_LENGTH } from "../vocab";

export class CreateProyectoConParticipantesDto {
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_TITULO_LENGTH)
  titulo_proyecto!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  investigadores_ids!: string[];

  @IsOptional()
  @IsString()
  investigador_responsable_id?: string;
}
