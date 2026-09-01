import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import {
  TITULAR_HOLDER_TYPES_VALIDOS,
  type TitularHolderType,
} from "../vocab";

/**
 * DTOs de pivots de patente. Reglas 1:1 con `apps/desktop/src-tauri/src/recursos/`
 * (doc 07 §2.2):
 *  - PatenteInventor: `idPersona` + `orden` (>= 1).
 *  - PatenteTitular: `holderType` (ORG_UNIT|PERSON) + `idOrgUnit` XOR
 *    `idPersona` (exactly-one, validado en `recursos.logic.validarTitularHolderExactlyOne`)
 *    + `orden` (>= 1).
 *
 * Ambos pivots son RecursosManage-only (no se permite a responsable_proyecto
 * manipularlos — doc 07 §2.1 fila "POST/DELETE/GET /patentes/:id/inventores"
 * y "POST/DELETE/GET /patentes/:id/titulares": RecursosManage en las 6
 * filas). El controller aplica el guard correspondiente.
 */
export class VincularInventorDto {
  @IsString()
  idPersona!: string;

  @IsInt()
  @Min(1)
  orden!: number;
}

export class VincularTitularDto {
  @IsString()
  @IsIn(TITULAR_HOLDER_TYPES_VALIDOS as unknown as string[])
  holderType!: TitularHolderType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idOrgUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idPersona?: string;

  @IsInt()
  @Min(1)
  orden!: number;
}

export interface PatenteInventorDto {
  id: string;
  id_patente: string;
  id_persona: string;
  orden: number;
}

export interface PatenteTitularDto {
  id: string;
  id_patente: string;
  holder_type: TitularHolderType;
  id_org_unit: string | null;
  id_persona: string | null;
  orden: number;
}
