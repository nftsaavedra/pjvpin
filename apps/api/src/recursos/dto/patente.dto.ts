import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  MAX_CLASIFICACION_LENGTH,
  MAX_DESCRIPCION_LENGTH,
  MAX_ENTIDAD_LENGTH,
  MAX_ESTADO_LENGTH,
  MAX_NUMERO_PATENTE_LENGTH,
  MAX_PAIS_LENGTH,
  MAX_TITULO_LENGTH,
  PATENTES_TIPOS_VALIDOS,
} from "../vocab";

/**
 * DTO de creacion de patente. Reglas 1:1 con `apps/desktop/src-tauri/src/recursos/`
 * (doc 07 §2.2):
 *  - `titulo` obligatorio, <= MAX_TITULO_LENGTH.
 *  - `tipo` ∈ PATENTES_TIPOS_VALIDOS.
 *  - Resto de campos opcionales (trim en logica si vienen con whitespace).
 *  - `numero_patente` tiene UNIQUE index parcial en BD (doc 07 §2.4).
 */
export class CreatePatenteDto {
  @IsString()
  @MaxLength(MAX_TITULO_LENGTH)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMERO_PATENTE_LENGTH)
  numeroPatente?: string;

  @IsOptional()
  @IsString()
  @IsIn(PATENTES_TIPOS_VALIDOS as unknown as string[])
  tipo?: (typeof PATENTES_TIPOS_VALIDOS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ESTADO_LENGTH)
  estado?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaSolicitud?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaConcesion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_PAIS_LENGTH)
  pais?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ENTIDAD_LENGTH)
  entidadConcedente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CLASIFICACION_LENGTH)
  clasificacionIpc?: string;

  @IsOptional()
  @IsString()
  idOrgUnitConcedente?: string;

  @IsOptional()
  @IsString()
  proyectoId?: string;
}

/**
 * DTO de actualizacion de patente. `titulo` y `proyectoId` NO se exponen aqui
 * (doc 07 §2.2: "Update: NO permite cambiar titulo ni proyecto_id").
 * Si se envian, class-validator con `whitelist: true` los rechaza.
 */
export class UpdatePatenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMERO_PATENTE_LENGTH)
  numeroPatente?: string;

  @IsOptional()
  @IsString()
  @IsIn(PATENTES_TIPOS_VALIDOS as unknown as string[])
  tipo?: (typeof PATENTES_TIPOS_VALIDOS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ESTADO_LENGTH)
  estado?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaSolicitud?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fechaConcesion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_PAIS_LENGTH)
  pais?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ENTIDAD_LENGTH)
  entidadConcedente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPCION_LENGTH)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CLASIFICACION_LENGTH)
  clasificacionIpc?: string;

  @IsOptional()
  @IsString()
  idOrgUnitConcedente?: string;
}

export interface PatenteDto {
  id_patente: string;
  proyecto_id: string | null;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  descripcion: string | null;
  clasificacion_ipc: string | null;
  id_org_unit_concedente: string | null;
  created_at: number | null;
  updated_at: number | null;
  activo: boolean;
}

// exporto el tipo del enum para uso externo si necesario
export type PatenteTipoDto = (typeof PATENTES_TIPOS_VALIDOS)[number];
