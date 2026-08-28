import { IsIn, IsNotEmpty, IsString } from "class-validator";

export const OCDE_ENTITY_TYPES = [
  "proyecto",
  "publicacion",
  "investigador",
  "patente",
  "recurso",
  "grupo",
  "evento",
] as const;

export class AsignarOcdeRequest {
  @IsString()
  @IsIn(OCDE_ENTITY_TYPES as unknown as string[])
  entity_type!: (typeof OCDE_ENTITY_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  entity_id!: string;

  @IsString()
  @IsNotEmpty()
  ocde_codigo!: string;
}

export interface EntityOcdeFieldDto {
  entity_type: string;
  entity_id: string;
  ocde_codigo: string;
  created_at: string;
}
