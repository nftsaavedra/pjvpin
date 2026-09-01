import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { MAX_ROL_LENGTH, ORG_ROLES_VALIDOS } from "../vocab";

export class VincularOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  idOrgUnit!: string;

  @IsString()
  @IsIn(ORG_ROLES_VALIDOS as unknown as string[])
  @MaxLength(MAX_ROL_LENGTH)
  rol!: (typeof ORG_ROLES_VALIDOS)[number];
}

export interface ProyectoOrganizacionDto {
  id: string;
  id_proyecto: string;
  id_org_unit: string;
  rol: string;
}
