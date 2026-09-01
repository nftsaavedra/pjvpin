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
  tituloProyecto!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  investigadoresIds!: string[];

  @IsOptional()
  @IsString()
  investigadorResponsableId?: string;
}
