import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export const CATALOGO_TIPOS_VALIDOS = [
  "tipo_proyecto",
  "estado_proyecto",
  "tipo_organizacion",
  "tipo_dependencia",
  "tipo_equipo",
  "tipo_financiamiento",
  "moneda",
  "idioma",
  "tipo_documento",
  "tipo_participacion",
  "cuartil",
  "acceso_abierto",
  "tipo_software",
  "tipo_patente",
  "clasificacion_patente",
] as const;

export type CatalogoTipo = (typeof CATALOGO_TIPOS_VALIDOS)[number];

export class CatalogoItemDto {
  id!: string;
  tipo!: string;
  codigo!: string;
  nombre!: string;
  descripcion?: string;
  editable!: number;
  esquema?: string;
  padreCodigo?: string;
}

export class CreateCatalogoRequest {
  @IsString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @IsIn(CATALOGO_TIPOS_VALIDOS as any)
  tipo!: CatalogoTipo;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  esquema?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  padreCodigo?: string;
}

export class UpdateCatalogoRequest {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export interface EliminarCatalogoResultadoDto {
  ok: boolean;
  id: string;
}

export class ListarVocabItemsQuery {
  @IsString()
  @IsNotEmpty()
  esquema!: string;

  @IsOptional()
  @IsString()
  padreCodigo?: string;
}

export class ReimportarVocabResult {
  ok!: boolean;
  esquema!: string;
  recargados!: number;
}
