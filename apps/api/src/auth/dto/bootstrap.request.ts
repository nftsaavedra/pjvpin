import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class BootstrapUsuarioRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  dni!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidoMaterno?: string;
}

export class BootstrapReniecDniRequest {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  numero!: string;
}

export class BootstrapStatusDto {
  bootstrapRequired!: boolean;
}
