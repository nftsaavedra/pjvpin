import { plainToInstance } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

export class EnvValidationSchema {
  @IsString()
  @IsNotEmpty()
  PJVPIN_MONGODB_URI!: string;

  @IsString()
  @IsNotEmpty()
  PJVPIN_MONGODB_DB!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL?: string;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  PJVPIN_AUDIT_LOG_PATH?: string;

  @IsBoolean()
  @IsOptional()
  PJVPIN_RUN_ENSURE_INDEXES?: boolean;

  @IsString()
  @IsOptional()
  PJVPIN_RENIEC_TOKEN?: string;

  @IsString()
  @IsOptional()
  PJVPIN_RENIEC_API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  NODE_ENV?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvValidationSchema {
  const validated = plainToInstance(EnvValidationSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(", ")}`)
      .join("; ");
    throw new Error(`Configuracion invalida — ${messages}`);
  }
  return validated;
}
