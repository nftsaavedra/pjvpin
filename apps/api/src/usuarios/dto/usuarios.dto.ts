import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import type { UsuarioDto } from "../../auth/dto/auth.response";

export const APP_ROLES = [
  "superuser",
  "admin",
  "operador",
  "consulta",
  "responsable_proyecto",
] as const;

export class CreateUsuarioRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsIn(APP_ROLES as unknown as string[])
  rol!: (typeof APP_ROLES)[number];

  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  dni!: string;
}

export class UpdateUsuarioRequest {
  @IsOptional()
  @IsString()
  @IsIn(APP_ROLES as unknown as string[])
  rol?: (typeof APP_ROLES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;
}

export interface PaginatedUsuarios {
  items: UsuarioDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
