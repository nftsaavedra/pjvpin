/**
 * DTOs del dominio `publicaciones` (12 REST, doc 07 §3).
 *
 * Convenciones:
 * - Requests: camelCase (class-validator + global whitelist + forbidNonWhitelisted).
 * - Responses: snake_case 1:1 con doc 07 §3.2 (preserva contrato con frontend
 *   durante fase 1).
 * - D7: validacion estricta de tipo/DOI/cuartiles/idioma/acceso en create Y update.
 * - `id_proyecto` opcional con FK check via `entityExists` en service (404 si
 *   no existe).
 *
 * DRY: `BasePublicacionDto` declara TODOS los campos como opcionales. Las
 * variantes Create y Update extienden la base; Create obliga `titulo`/`tipo`
 * via overrides. Asi no se duplican ~25 campos.
 */

import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  ACCESO_ABIERTO_VALIDOS,
  CUARTILES_VALIDOS,
  DOMINIOS_ORIGEN_VALIDOS,
  MAX_DOI_LENGTH,
  MAX_EDITORIAL_LENGTH,
  MAX_HANDLE_URL_LENGTH,
  MAX_IDIOMA_LENGTH,
  MAX_ISBN_LENGTH,
  MAX_ISSN_LENGTH,
  MAX_NUMERO_ISSUE_LENGTH,
  MAX_PAGINAS_LENGTH,
  MAX_PALABRA_CLAVE_LENGTH,
  MAX_PALABRAS_CLAVE,
  MAX_RESUMEN_LENGTH,
  MAX_REVISTA_TITULO_LENGTH,
  MAX_TITULO_LENGTH,
  MAX_VOLUMEN_LENGTH,
  TIPOS_PUBLICACION_VALIDOS,
} from "../vocab";

/** Base con TODOS los campos opcionales. Create obliga titulo/tipo. */
export class BasePublicacionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TITULO_LENGTH)
  titulo?: string;

  @IsOptional()
  @IsString()
  @IsIn(TIPOS_PUBLICACION_VALIDOS as unknown as string[])
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOI_LENGTH)
  doi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ISSN_LENGTH)
  issn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ISBN_LENGTH)
  isbn?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  anio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  cuartil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_RESUMEN_LENGTH)
  resumen?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PALABRAS_CLAVE)
  @IsString({ each: true })
  @MaxLength(MAX_PALABRA_CLAVE_LENGTH, { each: true })
  palabrasClave?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(MAX_REVISTA_TITULO_LENGTH)
  revistaTitulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_HANDLE_URL_LENGTH)
  @IsUrl({ require_protocol: true }, { message: "handleUrl debe ser una URL absoluta con protocolo." })
  handleUrl?: string;

  @IsOptional()
  @IsISO8601()
  fechaPublicacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_EDITORIAL_LENGTH)
  editorial?: string;

  @IsOptional()
  @IsString()
  idOrgUnitEditora?: string;

  @IsOptional()
  @IsString()
  @IsIn(CUARTILES_VALIDOS as unknown as string[])
  scimagoCuartil?: string;

  @IsOptional()
  @IsString()
  @IsIn(CUARTILES_VALIDOS as unknown as string[])
  wosCuartil?: string;

  @IsOptional()
  @IsBoolean()
  esRevisadoPorPares?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(ACCESO_ABIERTO_VALIDOS as unknown as string[])
  accesoAbierto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_IDIOMA_LENGTH)
  idioma?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_VOLUMEN_LENGTH)
  volumen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMERO_ISSUE_LENGTH)
  numeroIssue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_PAGINAS_LENGTH)
  paginas?: string;

  @IsOptional()
  @IsString()
  @IsIn(DOMINIOS_ORIGEN_VALIDOS as unknown as string[])
  dominioOrigen?: string;

  @IsOptional()
  @IsString()
  pureUuid?: string;

  @IsOptional()
  @IsString()
  estadoPublicacion?: string;

  @IsOptional()
  @IsString()
  idProyecto?: string;

  @IsOptional()
  @IsString()
  perucrisUuid?: string;
}

export class CreatePublicacionDto extends BasePublicacionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TITULO_LENGTH)
  override titulo!: string;

  @IsString()
  @IsIn(TIPOS_PUBLICACION_VALIDOS as unknown as string[])
  override tipo!: string;
}

export class UpdatePublicacionDto extends BasePublicacionDto {}

/** Respuesta 1:1 con doc 07 §3.2 (snake_case). */
export class PublicacionDto {
  id!: string;
  id_publicacion!: string;
  titulo!: string;
  doi!: string | null;
  issn!: string | null;
  anio!: number | null;
  cuartil!: string | null;
  tipo!: string;
  resumen!: string | null;
  palabras_clave!: string[];
  created_at!: number | null;
  updated_at!: number | null;
  activo!: number;
  handle_url!: string | null;
  fecha_publicacion!: string | null;
  editorial!: string | null;
  id_org_unit_editora!: string | null;
  revista_titulo!: string | null;
  isbn!: string | null;
  scimago_cuartil!: string | null;
  wos_cuartil!: string | null;
  es_revisado_por_pares!: boolean;
  acceso_abierto!: string | null;
  idioma!: string | null;
  volumen!: string | null;
  numero_issue!: string | null;
  paginas!: string | null;
  dominio_origen!: string;
  pure_uuid!: string | null;
  estado_publicacion!: string | null;
  id_proyecto!: string | null;
  perucris_uuid!: string | null;
}